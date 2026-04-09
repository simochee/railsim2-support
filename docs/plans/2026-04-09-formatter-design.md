# Formatter Design

## Overview

RailSim2 プラグイン定義ファイル用のフォーマッターを Language Server に追加する。
フォーマッターは `format(source: string, options?) => string` の純粋関数として独立動作し、LSP からも CLI からも利用可能とする。

## Motivation

- エディタ上で統一されたコードスタイルを提供したい
- 日本語コメントが多く含まれるため、タブインデントが適切
- プロパティの `=` アラインメントで可読性を向上させたい

## Design Decisions

### Approach: AST 拡張 + 後処理コメント配置

3つのアプローチを検討し、Codex レビューを経て A（AST 拡張）を選択。

- **A (選択):** CommentNode に value/kind を追加し、パーサーに distributeComments() を後処理として追加
- **B (却下):** トークン列ベース — 構造把握が困難で `=` アラインメントに不十分
- **C (却下):** ハイブリッド（AST + ソーステキスト参照） — フォーマッターの独立性が下がる

### Key Decisions

- **コメント配置ロジックは distributeComments() の1箇所に集約** — 重複を避ける
- **bodyRange は全ノードで「中身の占有領域（半開区間）」に統一** — `{`/`}`/`:` 自体は含めない
- **境界コメント（`Case 1: // comment`）は body の先頭コメントとして扱う**
- **one-line Case は常に改行する正規化ルール**
- **空行保持は元ソース行列を併用** — AST range 差分だけでは不十分

## AST Changes

### CommentNode — value と kind を追加

```typescript
export type CommentNode = {
  type: "comment";
  value: string;          // "// ..." or "/* ... */"
  kind: "line" | "block";
  range: Range;
};
```

### ObjectNode — bodyRange を追加

```typescript
export type ObjectNode = {
  type: "object";
  name: string;
  args: ExprNode[];
  body: BodyNode[];
  range: Range;
  nameRange: Range;
  bodyRange: Range;       // { 直後 〜 } 開始位置（半開区間）
};
```

### IfNode — thenRange / elseRange を追加

```typescript
export type IfNode = {
  type: "if";
  condition: ExprNode;
  then: BodyNode[];
  thenRange: Range;       // { 直後 〜 } 開始位置
  else_?: BodyNode[];
  elseRange?: Range;      // Else { 直後 〜 } 開始位置
  range: Range;
};
```

### CaseNode — bodyRange を追加

```typescript
export type CaseNode = {
  type: "case";
  values: ExprNode[];
  body: BodyNode[];
  bodyRange: Range;       // : 直後 〜 次の Case/Default/} 開始位置
  range: Range;
};
```

### ApplySwitchNode — defaultRange を追加

```typescript
export type ApplySwitchNode = {
  type: "applySwitch";
  switchName: ExprNode;
  cases: CaseNode[];
  default_?: BodyNode[];
  defaultRange?: Range;   // Default: 直後 〜 } 開始位置
  range: Range;
};
```

## Parser Changes

### endOf() の multi-line 対応

```typescript
function endOf(token: Token): Position {
  const lines = token.value.split("\n");
  if (lines.length === 1) {
    return { line: token.line, character: token.character + token.length };
  }
  return {
    line: token.line + lines.length - 1,
    character: lines[lines.length - 1].length,
  };
}
```

### bodyRange の記録

各パース関数で `{`/`}`/`:` トークンの位置を保存し、bodyRange を構築する。

- `parseObject()`: lbrace の endOf → rbrace の posOf
- `parseIf()`: then の lbrace/rbrace、else の lbrace/rbrace
- `parseCase()`: colon の endOf → body 末端（次の Case/Default/rbrace の posOf）
- `parseApplySwitch()`: Default の colon endOf → body 末端

### distributeComments()

parseFile() 末尾の手動コメント挿入（L285-293）を削除し、以下のアルゴリズムで置き換え:

1. 全コメントトークンから CommentNode を生成（value, kind 付き）
2. AST を再帰走査し、(body, bodyRange) ペアを収集:
   - (FileNode.body, FileNode.range)
   - (ObjectNode.body, ObjectNode.bodyRange)
   - (IfNode.then, IfNode.thenRange)
   - (IfNode.else_, IfNode.elseRange)
   - (CaseNode.body, CaseNode.bodyRange)
   - (ApplySwitchNode.default_, ApplySwitchNode.defaultRange)
3. 各コメントを「range が包含され且つ最も狭い body」に挿入
4. 各 body を start position でソート

**Tie-break ルール:**
- comment.start が body.start と同じ行で body.start.character 以降 → その body に属する
- comment.start が close token と同じ行でも close token より前 → その body に属する
- 境界コメント（`Case 1: // comment`）→ body の先頭コメントとして扱う

## Formatter — formatter.ts

### Public API

```typescript
export interface FormatOptions {
  indentChar: "\t" | " ";
  indentSize: number;        // タブなら 1、スペースなら 2 or 4
  alignEquals: boolean;
}

export function format(source: string, options?: Partial<FormatOptions>): string;
```

Default: `{ indentChar: "\t", indentSize: 1, alignEquals: true }`

### Formatting Rules

| Element | Rule |
|---------|------|
| Indent | nest depth * tab |
| `=` alignment | 同一 body 内の連続プロパティ群で最長名に揃える |
| Semicolon | プロパティ末尾に必ず `;` |
| Blank lines | 元ソースの空行をそのまま保持 |
| Comments | value をそのまま出力、インデントのみ調整 |
| Expressions | 二項演算子前後にスペース (`1 + 2`) |
| Comma | `, ` (カンマ後スペース) |
| `{` | 名前/引数後スペース + `{` |
| `}` | 単独行、親と同じインデント |
| Case/Default | ApplySwitch 内で1段インデント、body はさらに1段 |
| one-line Case | 常に改行する（正規化） |

### `=` Alignment Example

```
Body {
	ModelFileName = "body.x";
	ModelScale    = 1.0;
	Coord         = 0.0, 0.0, 0.0;

	Object3D "headlight" {
		ModelFileName = "light.x";
		Coord         = 0.0, 1.5, 5.0;
	}
}
```

「連続プロパティ群」= コメント・空行・オブジェクト・If・ApplySwitch で区切られないプロパティの連続。

### Blank Line Preservation

- `source.split("\n")` で行配列を保持
- 各ノード出力時に、前ノードの range.end.line と現ノードの range.start.line の間にある空行数を元ソースから数える
- ブロックコメントが複数行を占有しても行配列ベースなので正確

## LSP Integration

- `server.ts` の capabilities に `documentFormattingProvider: true` を追加
- `onDocumentFormatting` ハンドラで `format()` を呼び、全文を TextEdit で置換

## File Structure

```
packages/language-server/src/
├── server/
│   ├── parser.ts              ← endOf 修正, bodyRange 追加, distributeComments 追加
│   ├── formatter.ts           ← 新規
│   └── server.ts              ← formatting capability 追加
└── shared/
    └── ast.ts                 ← CommentNode 拡張, bodyRange 追加

packages/language-server/test/
├── formatter.test.ts          ← 新規
└── parser.test.ts             ← bodyRange + コメント配置テスト追加
```

## Exports

`packages/language-server/package.json` の exports に追加:

```json
"./formatter": "./out/server/formatter.js"
```

## Implementation Order

1. `endOf()` 修正 + range テスト追加
2. AST に bodyRange 系追加 + parser で境界 token 保存
3. `distributeComments()` 実装 + テスト
4. formatter 本体
5. LSP 統合

## Review History

- Codex Review 1: branch 境界情報不足、endOf() の multi-line 未対応、空行保持の落とし穴を指摘
- Codex Review 2: bodyRange 定義の統一、tie-break ルール追加を提案 → 承認
