# DefineSwitch 補完 & バリデーション設計

## 概要

RailSim2 プラグインファイル内の `DefineSwitch` 定義と、`If` / `ApplySwitch` でのスイッチ参照をクロスリファレンスし、補完（Completion）とバリデーション（Diagnostics）を提供する。

## 要件

- **スコープ**: 同一ファイル内のみ
- **補完**:
  - `If` / `ApplySwitch` の条件式でスイッチ名をサジェスト（ユーザー定義 + システム予約）
  - `ApplySwitch` 内の `Case` で Entry インデックス値をサジェスト（`label: "0"`, `detail: "点灯"`）
  - `Case` 値の横に Entry ラベルをインラインヒントで表示
- **バリデーション**: 未定義スイッチの使用を **Warning** で報告。重複 DefineSwitch も Warning。

## アプローチ

シンボルテーブル方式。AST に専用ノード型は追加せず、既存の `ObjectNode` として扱われる `DefineSwitch` から独立モジュールでシンボル情報を収集する。

## 変更ファイル一覧

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `src/shared/ast.ts` | 修正 | `ApplySwitchNode` に `switchNameRange`、`CaseNode` に `valuesRange` 追加 |
| `src/server/parser.ts` | 修正 | 上記 range の生成 |
| `src/server/switchSymbols.ts` | 新規 | SwitchIndex, buildSwitchIndex, getReferencedSwitch, SYSTEM_SWITCHES |
| `src/server/completionProvider.ts` | 修正 | switchRef/caseValue コンテキスト追加、文字列suppress例外、switchIndex 引数追加 |
| `src/server/validator/switchValidator.ts` | 新規 | 未定義スイッチ警告、重複定義警告 |
| `src/server/server.ts` | 修正 | ParseCache に switchIndex 追加、validateTextDocument に switchValidator 統合 |

## 詳細設計

### 1. AST 最小変更

```ts
export type ApplySwitchNode = {
  type: "applySwitch";
  switchName: ExprNode;
  switchNameRange: Range;  // NEW: スイッチ名式の range
  cases: CaseNode[];
  default_?: BodyNode[];
  defaultRange?: Range;
  range: Range;
};

export type CaseNode = {
  type: "case";
  values: ExprNode[];
  valuesRange: Range;  // NEW: 値リスト部分の range
  body: BodyNode[];
  bodyRange: Range;
  range: Range;
};
```

### 2. switchSymbols.ts

```ts
export interface SwitchEntry {
  label: string;   // Entry = "点灯" の "点灯"
  index: number;   // 0, 1, 2...
}

export interface SwitchDefinition {
  name: string;
  entries: SwitchEntry[];
  switchNameRange: Range;
  range: Range;
}

export interface SwitchIndex {
  definitions: Map<string, SwitchDefinition>;   // 最初の定義
  duplicates: Map<string, SwitchDefinition[]>;  // 重複定義（診断用）
}

export const SYSTEM_SWITCHES: ReadonlySet<string> = new Set([
  // Static switches (13)
  "_FRONT", "_CONNECT1", "_CONNECT2", "_DOOR1", "_DOOR2",
  "_SERIAL", "_CAMDIST", "_VELOCITY", "_ACCEL", "_CABINVIEW",
  "_APPROACH1", "_APPROACH2", "_STOPPING",
  // Instance switches (12)
  "_NIGHT", "_WEATHER", "_SEASON", "_SHADOW", "_ENVMAP",
  "_YEAR", "_MONTH", "_DAY", "_DAYOFWEEK",
  "_HOUR", "_MINUTE", "_SECOND",
]);

export function buildSwitchIndex(file: FileNode): SwitchIndex;
export function getReferencedSwitch(expr: ExprNode): string | null;
// 既知パターン: 文字列リテラル単体, "X" == N, ("X" == N)
```

### 3. CompletionContext 拡張

```ts
export type CompletionContext =
  | { type: "root"; fileName?: string }
  | { type: "objectBody"; objectName: string; schemaKey: string; parentChain: string[]; body: BodyNode[] }
  | { type: "switchRef" }                           // NEW
  | { type: "caseValue"; switchName: string }        // NEW
  | { type: "none" };
```

**findContext 優先順**: switchRef/caseValue → string suppress → objectBody/root

**文字列 suppress の例外**: `ApplySwitch` / `If` のスイッチ名位置では文字列トークン内でも補完を許可する。

**API 変更**: `getCompletions(file, tokens, position, fileName, switchIndex)` — switchIndex 引数を追加。

### 4. switchValidator.ts

```ts
export function validateSwitches(file: FileNode, switchIndex: SwitchIndex): Diagnostic[];
```

- AST をウォークして `If` / `ApplySwitch` 内の式から `getReferencedSwitch()` でスイッチ名を抽出
- `definitions` にも `SYSTEM_SWITCHES` にもない → Warning: "未定義のスイッチ「X」が参照されています"
- 重複 DefineSwitch → Warning（`duplicates` の全エントリの `switchNameRange` を指す）

### 5. server.ts 統合

```ts
interface ParseCache {
  // existing fields...
  switchIndex: SwitchIndex;
}
```

- `getOrParse` 内で `buildSwitchIndex(file)` を呼び出して switchIndex をキャッシュ
- `validateTextDocument` 内で `validateSwitches(file, switchIndex)` を追加
- `getCompletions` 呼び出しに `switchIndex` を渡す

## テスト方針

| テストファイル | カバー対象 |
|--------------|-----------|
| `switchSymbols.test.ts` | buildSwitchIndex, duplicates, getReferencedSwitch の既知/非対応パターン |
| `parser.test.ts` | switchNameRange, valuesRange の境界 |
| `completionProvider.test.ts` | switchRef/caseValue コンテキスト判定、文字列内の補完許可/抑制 |
| `switchValidator.test.ts` | 未定義参照、SYSTEM_SWITCHES 除外、重複定義 |
| `integration.test.ts` | validateTextDocument 経由の warning、end-to-end 補完 |
