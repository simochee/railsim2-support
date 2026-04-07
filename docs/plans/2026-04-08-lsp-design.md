# RailSim2 Language Server Protocol 設計

## 概要

RailSim2 プラグイン定義ファイル用の VS Code 拡張機能に Language Server Protocol (LSP) を追加する。
現状の TextMate Grammar によるシンタックスハイライトに加え、バリデーション・補完・ホバー情報を提供する。

## 動機

RailSim2 のプラグイン定義ファイルのエラーは、現状ゲームを起動するまで検出できない。
エディタ上でリアルタイムにエラーを検出できるようにして、開発体験を大幅に改善する。

## 技術選定

- **TypeScript** + **vscode-languageserver** / **vscode-languageclient**
- 手書きの再帰下降パーサー（式解析は Pratt parser）
- `schema` を Single Source of Truth として TextMate Grammar も自動生成

## アーキテクチャ

```
src/
├── client/
│   └── extension.ts              # LanguageClient 起動
├── server/
│   ├── server.ts                 # LSP サーバー本体
│   ├── tokenizer.ts             # ソース → トークン列
│   ├── parser.ts                # トークン列 → AST（Pratt parser で式解析）
│   ├── validator/
│   │   ├── syntaxValidator.ts   # 構文検証（{} 不一致、; 欠落）
│   │   └── schemaValidator.ts   # 意味検証（親子関係、型、必須性）
│   ├── completer.ts             # 補完
│   └── hoverer.ts               # ホバー情報
├── shared/
│   ├── ast.ts                   # AST ノード型定義
│   ├── tokens.ts               # トークン型定義
│   ├── position.ts             # 位置・Range ユーティリティ
│   └── schemaTypes.ts          # schema の型定義
└── schema/
    ├── lexical.ts              # 語彙スキーマ（キーワード一覧 → Grammar 生成用）
    ├── semantic.ts             # 意味スキーマ（親子関係、型、arity、必須性）
    ├── descriptions.json       # ホバー用日本語説明（ビルド時にHTMLから抽出）
    ├── generateGrammar.ts      # lexical → tmLanguage.json 生成
    └── extractDescriptions.ts  # Shift_JIS HTML → descriptions.json 抽出
```

## Schema 二層構造

### lexical.ts (TextMate Grammar 生成用)

フラットなキーワード一覧。語彙レベルの情報のみ。

```ts
export const lexicalSchema = {
  objectNames: ["Axle", "Body", "TrainInfo", ...],
  controlKeywords: ["ApplySwitch", "If", "Else"],
  caseKeywords: ["Case", "Default"],
  propertyNames: ["Acceleration", "Ambient", "Coord", ...],
  constants: ["DayAlpha", "NightAlpha", "Hour", ...],
};
```

### semantic.ts (LSP 検証用)

文脈付き構造定義。親ノード種別ごとにプロパティの型、子オブジェクトの許可、必須性を持つ。

```ts
export const semanticSchema: Record<string, ObjectSchema> = {
  RailInfo: {
    rootFor: ["Rail2.txt"],
    properties: {
      Gauge:    { type: "float" },
      Height:   { type: "float" },
      TrackNum: { type: "integer" },
    },
    children: {
      Profile:         { required: false, multiple: false },
      DefineSwitch:    { required: false, multiple: true },
      DefineAnimation: { required: false, multiple: true },
    },
    description: "レールプラグインの情報定義",
  },
  // ...
};
```

同じ名前でも親によって型が異なるケース（例: `Vertex.Coord` は Profile 内では `vector-2d`、Wireframe 内では `vector-3d`）を正しく扱える。

## AST ノード型

```ts
type FileNode     = { type: "file"; body: TopLevelNode[]; range: Range };
type TopLevelNode = ObjectNode | IfNode | ApplySwitchNode | CommentNode;

type ObjectNode = {
  type: "object"; name: string; args: ExprNode[];
  body: (ObjectNode | PropertyNode | IfNode | ApplySwitchNode | CommentNode)[];
  range: Range; nameRange: Range;
};

type PropertyNode = {
  type: "property"; name: string; values: ExprNode[];
  range: Range; nameRange: Range;
};

type IfNode = {
  type: "if"; condition: ExprNode;
  then: ObjectNode["body"]; else_?: ObjectNode["body"];
  range: Range;
};

type ApplySwitchNode = {
  type: "applySwitch"; switchName: ExprNode;
  cases: CaseNode[]; default_?: ObjectNode["body"];
  range: Range;
};

type CaseNode = {
  type: "case"; values: ExprNode[];
  body: ObjectNode["body"];
  range: Range;
};

type CommentNode = { type: "comment"; range: Range };

type ExprNode =
  | { type: "number"; value: number; range: Range }
  | { type: "string"; value: string; range: Range }
  | { type: "identifier"; value: string; range: Range }
  | { type: "color"; value: string; range: Range }
  | { type: "boolean"; value: boolean; range: Range }
  | { type: "binary"; op: string; left: ExprNode; right: ExprNode; range: Range }
  | { type: "unary"; op: string; operand: ExprNode; range: Range }
  | { type: "ternary"; cond: ExprNode; then: ExprNode; else_: ExprNode; range: Range };
```

## エラーリカバリ

パースエラー時の同期点:
- `;` — プロパティ終端
- `}` — ブロック終端
- `Case`, `Default` — switch ケース境界
- `Else` — if 分岐境界
- オブジェクト開始キーワード — 次のブロック開始
- EOF

## バリデーション

| レベル | 検証内容 | Severity |
|---|---|---|
| 構文 | `{` `}` の不一致 | Error |
| 構文 | `;` の欠落 | Error |
| 構文 | 不明なキーワード | Warning |
| 意味 | オブジェクトに無効なプロパティ | Error |
| 意味 | オブジェクトに無効な子オブジェクト | Error |
| 意味 | 必須プロパティの欠落 | Warning |
| 型 | 数値が期待される箇所に文字列 | Error |
| 型 | カラー値のフォーマット不正 | Error |

## ファイル種別ルート dispatch

```ts
const rootDispatch: Record<string, string> = {
  "Rail2.txt":    "RailInfo",
  "Tie2.txt":     "TieInfo",
  "Girder2.txt":  "GirderInfo",
  "Pier2.txt":    "PierInfo",
  "Line2.txt":    "LineInfo",
  "Pole2.txt":    "PoleInfo",
  "Train2.txt":   "TrainInfo",
  "Station2.txt": "StationInfo",
  "Struct2.txt":  "StructInfo",
  "Surface2.txt": "SurfaceInfo",
  "Env2.txt":     "EnvInfo",
  "Skin2.txt":    "SkinInfo",
};
```

SkinInfo はヘルプに直接の `*Info` ブロックがないが、ファイル種別で区別する。

## 補完

- ブロック内でトリガー → そのオブジェクトに有効なプロパティ名 + 子オブジェクト名
- `=` の後でトリガー → 型に応じた候補（boolean なら `yes`/`no`、定数なら定数リスト）
- 文脈依存: 親オブジェクトに応じた候補のフィルタリング

## ホバー

- オブジェクト名・プロパティ名にカーソルを合わせると日本語説明を表示
- `descriptions.json` はビルド時に Shift_JIS HTML から UTF-8 JSON へ抽出して同梱

## ビルドフロー

```
npm run extract-docs    # Shift_JIS HTML → descriptions.json
npm run generate        # lexical.ts → railsim2.tmLanguage.json
npm run build           # TypeScript コンパイル（client + server + shared）
npm run test            # 全テスト実行
npm run package         # vsce package
```

## Phase 分割

| Phase | 内容 | 成果物 |
|---|---|---|
| 1 | tokenizer + Pratt parser + 構文 diagnostics | パースエラーがエディタに表示される |
| 2 | semantic schema + schema validator | 親子・型の検証エラーが出る |
| 3 | 補完（文脈依存プロパティ候補、値候補） | Ctrl+Space で候補が出る |
| 4 | ホバー（HTML → JSON 抽出 + 表示） | マウスオーバーで説明表示 |
| 5 | TextMate Grammar 自動生成 | schema 変更で grammar も自動更新 |
