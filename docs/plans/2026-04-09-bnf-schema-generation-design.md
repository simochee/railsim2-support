# BNF 文法パースによるスキーマ自動生成

## 背景

RailSim II Language Server の `semantic.ts`（プロパティ型定義・children 関係・fileSchemas）は手動メンテナンスされていた。ヘルプドキュメント（`pi_*.html`）には BNF 文法として全構造が定義されているが、既存の `extract-hover-data.ts` はプロパティ説明文のみを抽出しており、BNF 文法（`<pre class="nonterm">` ブロック）は未解析だった。

結果、vendor の公式プラグイン 40 ファイルに対して 877 エラーが発生していた。

## 方針

- `semantic.ts` を完全自動生成に置き換える（手動メンテ廃止）
- `extract-hover-data.ts` を拡張し、hover データとスキーマを 1 回の HTML パースで同時生成
- vendor 由来の補正情報は明示的な override 定義として生成スクリプトに入力し、最終出力にマージ

## アーキテクチャ

```
pi_*.html (113 ファイル, Shift-JIS)
     │
     ▼ cheerio で DOM パース
┌────────────────────────────────────┐
│  中間 IR (シンボルテーブル)            │
│  nonterm → GrammarNode              │
│  - properties: { name, type, ... }  │
│  - children: { name, ref, ... }     │
│  - minOccurs / maxOccurs            │
│  - union groups                     │
│  - inline blocks                    │
└──────────┬─────────────────────────┘
           │
     ┌─────┴──────┐
     ▼            ▼
hover emitter  schema emitter
     │         (再帰展開 + memoize + cycle 検出)
     │            │
     ▼            │  + schema-overrides.ts (明示的補正)
hoverData         │
.generated.ts     ▼
              semantic.generated.ts
```

### 内部モジュール構成

```
scripts/
  extract-hover-data.ts        ← エントリポイント (拡張)
  lib/
    html-reader.ts             ← Shift-JIS HTML 読込 + cheerio パース
    bnf-parser.ts              ← BNF 文法ブロック抽出 + IR 構築
    symbol-table.ts            ← シンボルテーブル管理・参照解決
    schema-emitter.ts          ← IR → semantic.generated.ts 生成
    hover-emitter.ts           ← IR → hoverData.generated.ts 生成
  schema-overrides.ts          ← vendor 由来の明示的補正定義
```

## BNF パース詳細

### HTML からの抽出対象

```html
<div class="contbox cb_src">
  <h2>生成規則</h2>
  <pre class="nonterm">piston-zy ::=</pre>
  <pre class="ind">PistonZY{
      <a class="nonterm" href="...">triangle-link-zy</a>
      <a class="nonterm" href="...">triangle-link-zy</a>
  }</pre>
</div>
```

- `<pre class="nonterm">`: 非終端シンボル名 + `::=`
- `<pre class="ind">` / `<pre class="ind_j">`: 文法本体
- `<a class="nonterm">`: 他シンボルへの参照
- `<span class="sub">opt</span>`: optional マーカー
- `<span class="sup">*</span>` / `<span class="sup">1+</span>`: 繰り返しマーカー
- `<span class="ctrl">( | )</span>`: union / グループ化

### 中間 IR 型定義

```typescript
interface GrammarSymbol {
  name: string;              // nonterm 名 (例: "named-object-info")
  htmlFile: string;          // ソース HTML ファイルパス
  objectName?: string;       // RailSim2 上のオブジェクト名 (例: "Object3D")
  nameParam?: string;        // オブジェクト名引数の型 (例: "string")
  rules: GrammarRule[];      // 文法ルール
}

type GrammarRule =
  | { kind: "property"; name: string; type: string; optional: boolean; arity: number }
  | { kind: "child"; objectName: string; ref: string; min: number; max: number }
  | { kind: "ref"; symbol: string; min: number; max: number }
  | { kind: "union"; alternatives: GrammarRule[][] }
  | { kind: "inline-block"; objectName: string; nameParam?: string; body: GrammarRule[] }
```

### 再帰展開アルゴリズム

```
resolveSchema(symbolName, context, visited):
  if (symbolName, context) in cache: return cached
  if symbolName in visited: return {} (cycle)
  visited.add(symbolName)

  symbol = symbolTable[symbolName]
  result = { properties: {}, children: {} }

  for rule in symbol.rules:
    switch rule.kind:
      "property"     → result.properties に追加
      "child"        → result.children に追加
      "ref"          → resolveSchema(rule.symbol, ...) して result にマージ
      "union"        → 各 alternative を展開して result にマージ
      "inline-block" → result.children にブロック追加 + 再帰展開

  cache[(symbolName, context)] = result
  return result
```

### コンテキスト依存スキーマ

同名オブジェクトが親により異なるプロパティを持つ場合の検出:

1. 全オブジェクトの children を走査
2. 同名の子オブジェクトが異なるシンボルを参照している場合を検出
3. `schemaKey` を `"ChildName:ParentName"` 形式で生成
4. ランタイムの解決ルール（`resolveSchemaKey` 関数の「親の children 定義」ルックアップ）と一致させる

例: `LensFlare` の `Circle` 子 → `"Circle:LensFlare"`, `Wireframe` の直下にある `Circle` → `"Circle"` (デフォルト)

### 型マッピング

| BNF ターミナル | PropertyType | 備考 |
|---------------|-------------|------|
| `float` | `"float"` | |
| `integer` | `"integer"` | |
| `string` | `"string"` | |
| `filename` | `"filename"` | |
| `yes-no` | `"yes-no"` | |
| `color` | `"color"` | |
| `identifier` | `"identifier"` | |
| `expression` | `"expression"` | |
| `float, float` (arity=2) | `"vector-2d"` | Coord 等 |
| `float, float, float` (arity=3) | `"vector-3d"` | Coord 等 |
| 複合型・可変長 | `"expression"` | override で調整 |

### schema-overrides.ts

ドキュメントだけでは判明しない情報を明示的に管理:

```typescript
export const schemaOverrides: Partial<Record<string, Partial<ObjectSchema>>> = {
  Particle: {
    properties: {
      // 範囲指定で 2 値を取る
      Color: { type: "expression", arity: 2 },
      Lifetime: { type: "expression", arity: 2 },
    },
  },
  // ...
};
```

override は生成スクリプト内で中間 IR にマージされ、最終出力の `semantic.generated.ts` に反映される。

## fileSchemas 生成

プラグイン定義ページ（`pi_rail.html` 等）のトップレベル BNF 文法からルートオブジェクトを列挙:

```
station-plugin ::=
  plugin-header
  StationInfo{}
  platform*
  model-option
  PrimaryAssembly{ ... }
```

→ `"Station2.txt": [PluginHeader, StationInfo, Platform, DefineSwitch, ...]`

ファイル名はドキュメントの `<h2>定義ファイル (Station2.txt) 文法</h2>` から抽出。

## テスト戦略

- **IR 単体テスト**: 各 HTML パターンに対する BNF パース結果の検証
- **展開テスト**: 既知のシンボル展開結果の snapshot テスト
- **統合テスト**: 生成された schema で vendor 40 ファイルのバリデーション 0 エラーを確認
- **hover/schema 独立テスト**: 片方の emitter が壊れてももう片方に影響しないことを確認

## リスクと対策

| リスク | 対策 |
|--------|------|
| HTML の崩れ | cheerio (DOM パーサー) で頑健に処理 |
| 再帰展開の無限ループ | visited set による cycle 検出 + memoize |
| union merge による排他制約消失 | 中間 IR に union group を保持（将来の厳密バリデーション用） |
| vendor 補正の暗黙知化 | schema-overrides.ts で明示管理 |
| ドキュメントに存在しない構文 | vendor ファイル検証で検出 → override に追加 |
