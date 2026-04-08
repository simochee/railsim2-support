# LSP Phase 3: Autocomplete Design

## Overview

Phase 3.1 では、RailSim2 プラグインファイル編集時のオートコンプリート機能を実装する。
既存の Semantic Schema をそのまま活用し、カーソル位置のコンテキストに応じた補完候補を提示する。

## Scope

### Phase 3.1（本設計）
- ルートオブジェクト名補完（ファイルトップレベル）
- プロパティ名補完（オブジェクトボディ内）
- 子オブジェクト名補完（オブジェクトボディ内）

### Phase 3.2（将来）
- プロパティ値補完（enum, yes-no 等）

## Architecture

```
[VSCode Client]
    │ onCompletion request (position, textDocument)
    ▼
[LSP Server: server.ts]
    │ connection.onCompletion handler
    ▼
[completionProvider.ts]
    ├── 1. parse(text) で AST 取得
    ├── 2. findContext(ast, position, fileName)
    │     → カーソル位置のコンテキスト特定
    ├── 3. resolveSchema(context)
    │     → schemaKey 解決 + 重複可否判定
    └── 4. buildCompletionItems(schema, existingNames)
          → CompletionItem[] 生成
```

## Approach: AST Walk

補完リクエスト時に毎回 `parse()` を実行し、AST を走査してカーソルの親コンテキストを特定する。

**選定理由:**
- RailSim2 ファイルは小さい（数百行）ので full parse コストは無視できる
- 既存パーサーのエラーリカバリ（synchronize）により不完全なドキュメントでも部分 AST が生成される
- schemaValidator の resolveSchemaKey ロジックを共通化して転用できる
- キャッシュ整合性問題がない

## Design Details

### 1. Parser Modification

未閉じ構造の `range.end` を EOF 位置まで伸ばす修正:
- `parseObject()`: `expect("rbrace")` が synthetic token を返したとき
- `parseIf()`: then 側・else 側両方の `}` 欠落
- `parseApplySwitch()`: 同様

これにより、`}` 未入力のオブジェクト内にカーソルがあっても、AST walk で親オブジェクトを正しく特定できる。

### 2. Context Detection (`findContext`)

カーソル位置から補完コンテキストを判定する。

**返却型:**
```typescript
type CompletionContext =
  | { type: "root"; fileName?: string }
  | { type: "objectBody"; objectName: string; schemaKey: string; parentChain: string[] }
  | { type: "none" }  // 補完抑止
```

**補完抑止条件:**
- コメント中
- 文字列リテラル中
- プロパティ値中（`=` の後 〜 `;` の前）
- オブジェクトヘッダ中（名前引数の位置）

**判定ロジック:**
1. トークン列からカーソル位置のトークン種別を確認 → 抑止条件に該当すれば `none`
2. AST を深さ優先走査し、カーソルを包含する最内 ObjectNode を特定
3. If/ApplySwitch 内 → 包含する最内 ObjectNode まで遡る
4. どの ObjectNode にも含まれない → `root`

### 3. Schema Resolution (`resolveSchema`)

- schemaKey の解決: `ChildSchema.schemaKey` があればそれ、なければオブジェクト名
- schemaValidator.ts から共通 helper に切り出して共有
- 既存のプロパティ/子オブジェクト/ルートオブジェクトを収集
- `multiple: false` かつ既出の項目を除外リストに追加

### 4. Completion Item Generation (`buildCompletionItems`)

| コンテキスト | 候補ソース | Kind |
|---|---|---|
| `root` | `fileSchemas[fileName]` | `Class` |
| `objectBody` | `schema.properties` | `Property` |
| `objectBody` | `schema.children` | `Class` |

**スニペット:**

プロパティ（型別テンプレート）:
| 型 | スニペット |
|---|---|
| `float`/`integer`/`expression` | `Name = ${1:0};` |
| `string`/`filename` | `Name = "${1}";` |
| `yes-no` | `Name = ${1\|yes,no\|};` |
| `color` | `Name = ${1:#000000};` |
| `enum` | `Name = ${1\|val1,val2\|};` |
| `vector-2d` | `Name = ${1:0}, ${2:0};` |
| `vector-3d` | `Name = ${1:0}, ${2:0}, ${3:0};` |
| `arity: N` | カンマ区切りで N 個のプレースホルダ |

子オブジェクト:
- 通常: `Name {\n\t$0\n}`
- `nameParameter` あり: `Name ${1:name} {\n\t$0\n}`

ルートオブジェクト:
- 子オブジェクトと同様

**`insertTextFormat: Snippet`** を必ず設定する。

### 5. Filtering

- `multiple: false` のプロパティ: 同一オブジェクトボディ内に既出なら除外
- `multiple: false` の子オブジェクト: 同一オブジェクトボディ内に既出なら除外
- `multiple: false` のルートオブジェクト: ファイル内に既出なら除外
- If/ApplySwitch 内の重複判定: 同一分岐内のみカウント（排他的分岐の他方は含めない）

## Files

### New
- `src/server/completionProvider.ts` — 補完ロジック本体
- `test/completionProvider.test.ts` — 補完テスト

### Modified
- `src/server/server.ts` — onCompletion ハンドラ、capabilities
- `src/server/parser.ts` — 未閉じ構造の range.end 修正
- `src/server/validator/schemaValidator.ts` — schemaKey 解決ロジックを共通 helper に切り出し

## Test Plan

- ルート補完: ファイル種別ごとの候補、既出ルートの除外
- ボディ内プロパティ補完: 各型のスニペット、required/optional 表示
- ボディ内子オブジェクト補完: nameParameter 対応
- ネスト補完: 親→子→孫の正しいスキーマ解決
- schemaKey 依存補完: Vertex:Profile vs Vertex:Wireframe
- If/ApplySwitch 内補完: 分岐内でも親オブジェクトの候補
- multiple: false 除外: プロパティ・子オブジェクト・ルート全レベル
- 補完抑止: コメント中、文字列中、プロパティ値中、ヘッダ中
- 未閉じオブジェクト: パーサー修正後の正しいコンテキスト判定
- 空ボディ: 全候補が表示される
- 未知ファイル名: ルート補完なし、ボディ内は通常動作
