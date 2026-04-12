# Codebase Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** DRY / YAGNI / ベストプラクティスに沿ったリファクタリングで、保守性・拡張性・テスタビリティを向上させる

**Architecture:** language-server パッケージの共有ユーティリティ抽出を中心に、AST走査の一元化・デッドコード除去・診断メッセージの一貫性確保を行う。website パッケージではビルド時共通ヘルパーと LSP 座標変換ヘルパーの抽出を行う。vscode-extension パッケージではビルド最適化と重複除去を行う。

**Tech Stack:** TypeScript 6, Vitest, pnpm workspaces, Turbo, Astro, React, Monaco Editor

---

## Phase 1: バグ修正 (最優先)

### Task 1: onHover のパースキャッシュ未使用バグ修正

`server.ts:153-154` で hover ハンドラが `parse(text)` を直接呼んでおり、`getOrParse` キャッシュを使っていない。hover は高頻度呼び出しのため性能影響が大きい。

**Files:**
- Modify: `packages/language-server/src/server/server.ts:149-157`

**Step 1: getOrParse を使うように修正**

```typescript
connection.onHover((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;
  const cached = getOrParse(doc);
  return getHover(cached.file, params.position);
});
```

**Step 2: テスト通過確認**

Run: `pnpm test`
Expected: 全テスト PASS

**Step 3: コミット**

```bash
git add packages/language-server/src/server/server.ts
git commit -m "fix(language-server): use parse cache for hover requests"
```

---

### Task 2: vscode-extension のクライアントID不一致修正

Node版 (`extension.ts:21`) は `"railsim2"`, Browser版 (`extension.browser.ts:11`) は `"railsim2-support"` と不一致。Web Extension 側の挙動差につながりうる。

**Files:**
- Modify: `packages/vscode-extension/src/extension.browser.ts:11`

**Step 1: ブラウザ版を `"railsim2"` に統一**

`extension.browser.ts` の `new LanguageClient(...)` 第1引数を `"railsim2"` に変更。

**Step 2: ビルド成功確認**

Run: `pnpm --filter railsim2-support build`

**Step 3: コミット**

```bash
git add packages/vscode-extension/src/extension.browser.ts
git commit -m "fix(vscode-extension): unify language client ID to 'railsim2'"
```

---

## Phase 2: language-server — 小さな DRY 改善

### Task 3: server.ts の診断公開ロジック重複解消

`onDidOpen` と `onDidChangeContent` で同一の diagnostics 変換・送信ロジックが重複している。

**Files:**
- Modify: `packages/language-server/src/server/server.ts:81-101`

**Step 1: 内部ヘルパー関数を抽出**

```typescript
function publishDiagnostics(uri: string, diagnostics: Diagnostic[]): void {
  const lspDiags: LspDiagnostic[] = diagnostics.map((d) => ({
    range: toLspRange(d.range),
    severity: toLspSeverity(d.severity),
    source: "railsim2",
    message: d.message,
  }));
  connection.sendDiagnostics({ uri, diagnostics: lspDiags });
}
```

`onDidOpen` と `onDidChangeContent` を:
```typescript
documents.onDidOpen((event) => {
  const cached = getOrParse(event.document);
  publishDiagnostics(event.document.uri, cached.diagnostics);
});

documents.onDidChangeContent((change) => {
  const cached = getOrParse(change.document);
  publishDiagnostics(change.document.uri, cached.diagnostics);
});
```

**Step 2: テスト通過 → コミット**

Run: `pnpm test`

```bash
git add packages/language-server/src/server/server.ts
git commit -m "refactor(language-server): extract publishDiagnostics helper in server.ts"
```

---

### Task 4: server.ts の検証パイプライン重複解消

`getOrParse` と `validateTextDocument` が parse → validators の同一パイプラインを重複して持っている。内部ヘルパーを抽出して一元化する。

**Files:**
- Modify: `packages/language-server/src/server/server.ts`

**Step 1: analyzeText ヘルパーを抽出**

```typescript
interface AnalysisResult {
  file: FileNode;
  tokens: Token[];
  diagnostics: Diagnostic[];
  switchIndex: SwitchIndex;
}

function analyzeText(text: string): AnalysisResult {
  const { file, diagnostics: parseDiags } = parse(text);
  const tokens = tokenize(text);
  const keywordDiags = validateUnknownKeywords(file);
  const schemaDiags = validateSchema(file);
  const switchIndex = buildSwitchIndex(file);
  const switchDiags = validateSwitches(file, switchIndex);
  return {
    file,
    tokens,
    diagnostics: [...parseDiags, ...keywordDiags, ...schemaDiags, ...switchDiags],
    switchIndex,
  };
}
```

`getOrParse` と `validateTextDocument` の両方から `analyzeText` を呼ぶ。
`getOrParse` 内の未使用 `fileName` 変数 (line 49) もこの時点で削除する。

**Step 2: テスト通過 → コミット**

Run: `pnpm test`

```bash
git add packages/language-server/src/server/server.ts
git commit -m "refactor(language-server): extract analyzeText to deduplicate validation pipeline"
```

---

### Task 5: COMPARISON_OPS 定数の重複解消

`switchSymbols.ts:114` と `inlayHintProvider.ts:8` で同一の `COMPARISON_OPS` 定数が重複定義されている。

**Files:**
- Modify: `packages/language-server/src/server/switchSymbols.ts:114` — `export const` に変更
- Modify: `packages/language-server/src/server/inlayHintProvider.ts:8` — import に置換

**Step 1: switchSymbols.ts で export する**

```typescript
// switchSymbols.ts:114 — const → export const
export const COMPARISON_OPS = new Set(["==", "!=", "<", ">", "<=", ">="]);
```

**Step 2: inlayHintProvider.ts で import に置換**

```typescript
// inlayHintProvider.ts:5 — COMPARISON_OPS を import に追加
import { getSwitchEntries, COMPARISON_OPS } from "./switchSymbols.js";
// line 8 の const COMPARISON_OPS を削除
```

**Step 3: テスト通過 → コミット**

Run: `pnpm --filter @railsim2-support/language-server test`

```bash
git add packages/language-server/src/server/switchSymbols.ts packages/language-server/src/server/inlayHintProvider.ts
git commit -m "refactor(language-server): deduplicate COMPARISON_OPS constant"
```

---

### Task 6: containsPosition 関数の共有ユーティリティ抽出

`parser.ts` と `hoverProvider.ts` で `containsPosition` が重複定義されている。`src/shared/rangeUtils.ts` に統合する。

**Files:**
- Create: `packages/language-server/src/shared/rangeUtils.ts`
- Create: `packages/language-server/test/rangeUtils.test.ts`
- Modify: `packages/language-server/src/server/parser.ts`
- Modify: `packages/language-server/src/server/hoverProvider.ts`

**Step 1: テストを書く**

```typescript
// test/rangeUtils.test.ts
import { describe, it, expect } from "vitest";
import { containsPosition } from "../src/shared/rangeUtils.js";

describe("containsPosition", () => {
  const range = { start: { line: 1, character: 5 }, end: { line: 3, character: 10 } };

  it("returns true for position inside range", () => {
    expect(containsPosition(range, { line: 2, character: 0 })).toBe(true);
  });

  it("returns true for position at start", () => {
    expect(containsPosition(range, { line: 1, character: 5 })).toBe(true);
  });

  it("returns false for position at end (exclusive)", () => {
    expect(containsPosition(range, { line: 3, character: 10 })).toBe(false);
  });

  it("returns false for position before range", () => {
    expect(containsPosition(range, { line: 0, character: 0 })).toBe(false);
  });
});
```

**Step 2: テストが失敗することを確認**

Run: `pnpm --filter @railsim2-support/language-server test -- --run test/rangeUtils.test.ts`
Expected: FAIL — module not found

**Step 3: 実装する**

```typescript
// src/shared/rangeUtils.ts
import type { Position, Range } from "./tokens.js";

/** Returns true when pos is inside range (start inclusive, end exclusive). */
export function containsPosition(range: Range, pos: Position): boolean {
  if (pos.line < range.start.line || pos.line > range.end.line) return false;
  if (pos.line === range.start.line && pos.character < range.start.character) return false;
  if (pos.line === range.end.line && pos.character >= range.end.character) return false;
  return true;
}
```

**Step 4: テスト通過を確認**

Run: `pnpm --filter @railsim2-support/language-server test -- --run test/rangeUtils.test.ts`
Expected: PASS

**Step 5: parser.ts, hoverProvider.ts の containsPosition を import に置換**

**Step 6: 全テスト通過 → コミット**

Run: `pnpm --filter @railsim2-support/language-server test`

```bash
git add packages/language-server/src/shared/rangeUtils.ts packages/language-server/test/rangeUtils.test.ts packages/language-server/src/server/parser.ts packages/language-server/src/server/hoverProvider.ts
git commit -m "refactor(language-server): extract containsPosition to shared rangeUtils"
```

---

## Phase 3: language-server — AST Walker 抽出 (段階的)

Codex レビューにより、AST Walker の抽出は段階的に行う。schemaValidator は `parentSchemaKey` のコンテキスト引き回しがあり、単純な visitor では対応できないため分離する。

### Task 7a: AST Walker — 基本実装と単純な走査の移行

`switchSymbols.ts` と `unknownKeywordValidator.ts` の単純な AST 走査を `walkNodes` に移行する。

**Files:**
- Create: `packages/language-server/src/shared/astWalker.ts`
- Create: `packages/language-server/test/astWalker.test.ts`
- Modify: `packages/language-server/src/server/switchSymbols.ts`
- Modify: `packages/language-server/src/server/validator/unknownKeywordValidator.ts`

**Step 1: テストを書く**

```typescript
// test/astWalker.test.ts
import { describe, it, expect } from "vitest";
import { walkNodes } from "../src/shared/astWalker.js";
import { parse } from "../src/server/parser.js";

describe("walkNodes", () => {
  it("visits all node types in correct order", () => {
    const src = [
      'PluginHeader',
      '  PluginType = Rail',
      'End',
      'If "sw" == 0',
      '  Body',
      '    Height = 1',
      '  End',
      'End',
      'ApplySwitch "test"',
      '  Case 0',
      '    Body',
      '      Width = 2',
      '    End',
      '  End',
      '  Default',
      '    Body',
      '      Width = 3',
      '    End',
      '  End',
      'End',
    ].join("\n");
    const { file } = parse(src);
    const visited: string[] = [];
    walkNodes(file.body, {
      object(node) { visited.push(`object:${node.name}`); },
      property(node) { visited.push(`property:${node.name}`); },
      if_(node) { visited.push("if"); },
      applySwitch(node) { visited.push("applySwitch"); },
      case_(node) { visited.push("case"); },
    });
    expect(visited).toContain("object:PluginHeader");
    expect(visited).toContain("property:PluginType");
    expect(visited).toContain("if");
    expect(visited).toContain("object:Body");
    expect(visited).toContain("property:Height");
    expect(visited).toContain("applySwitch");
    expect(visited).toContain("case");
    expect(visited).toContain("property:Width");
  });
});
```

**Step 2: テストが失敗することを確認**

Run: `pnpm --filter @railsim2-support/language-server test -- --run test/astWalker.test.ts`

**Step 3: 実装する**

visitor コールバックは子ノードの走査前に呼ばれる。`case_` で CaseNode の走査もサポートする。

```typescript
// src/shared/astWalker.ts
import type {
  TopLevelNode, BodyNode, ObjectNode, PropertyNode,
  IfNode, ApplySwitchNode, CaseNode, CommentNode,
} from "./ast.js";

export interface AstVisitor {
  object?: (node: ObjectNode) => void;
  property?: (node: PropertyNode) => void;
  if_?: (node: IfNode) => void;
  applySwitch?: (node: ApplySwitchNode) => void;
  case_?: (node: CaseNode) => void;
  comment?: (node: CommentNode) => void;
}

export function walkNodes(nodes: readonly (TopLevelNode | BodyNode)[], visitor: AstVisitor): void {
  for (const node of nodes) {
    switch (node.type) {
      case "object":
        visitor.object?.(node);
        walkNodes(node.body, visitor);
        break;
      case "property":
        visitor.property?.(node);
        break;
      case "if":
        visitor.if_?.(node);
        walkNodes(node.then, visitor);
        if (node.else_) walkNodes(node.else_, visitor);
        break;
      case "applySwitch":
        visitor.applySwitch?.(node);
        for (const c of node.cases) {
          visitor.case_?.(c);
          walkNodes(c.body, visitor);
        }
        if (node.default_) walkNodes(node.default_, visitor);
        break;
      case "comment":
        visitor.comment?.(node);
        break;
    }
  }
}
```

**Step 4: テスト通過確認**

Run: `pnpm --filter @railsim2-support/language-server test -- --run test/astWalker.test.ts`

**Step 5: switchSymbols.ts の visit を walkNodes に移行**

`buildSwitchIndex` 内の `function visit` を `walkNodes` に書き換え。DefineSwitch の検出は `object` コールバックで行う。

**Step 6: unknownKeywordValidator.ts を walkNodes に移行**

各 `visitTopLevel`/`visitObject`/`visitProperty`/`visitIf`/`visitApplySwitch`/`visitCase` をフラットな visitor に書き換え。

**Step 7: 全テスト通過 → コミット**

Run: `pnpm --filter @railsim2-support/language-server test`

```bash
git add packages/language-server/src/shared/astWalker.ts packages/language-server/test/astWalker.test.ts packages/language-server/src/server/switchSymbols.ts packages/language-server/src/server/validator/unknownKeywordValidator.ts
git commit -m "refactor(language-server): extract shared AST walker, migrate simple traversals"
```

---

### Task 7b: AST Walker — switchValidator の移行

`switchValidator.ts` の走査を `walkNodes` に移行する。式検査 (`checkSwitchRef`) は `if_` と `applySwitch` のコールバック内で行う。

**Files:**
- Modify: `packages/language-server/src/server/validator/switchValidator.ts`

**Step 1: walkNodes を使って書き換え**

```typescript
import { walkNodes } from "../../shared/astWalker.js";

export function validateSwitches(file: FileNode, switchIndex: SwitchIndex): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Report duplicate definitions (unchanged)
  for (const [name, defs] of switchIndex.duplicates) { ... }

  // Walk AST to find switch references
  walkNodes(file.body, {
    if_(node) { checkSwitchRef(node.condition); },
    applySwitch(node) { checkSwitchRef(node.switchName); },
  });

  function checkSwitchRef(expr: ExprNode): void { ... } // unchanged

  return diagnostics;
}
```

**Step 2: テスト通過 → コミット**

Run: `pnpm --filter @railsim2-support/language-server test`

```bash
git add packages/language-server/src/server/validator/switchValidator.ts
git commit -m "refactor(language-server): migrate switchValidator to shared AST walker"
```

---

### Task 7c: AST Walker — inlayHintProvider は現状維持

`inlayHintProvider.ts` は `rangesOverlap` による枝刈りと `visitExpr` によるネスト式走査があり、汎用 walker ではカバーしきれない。パフォーマンス上の理由もあるため、現状維持とする。

`schemaValidator.ts` も `parentSchemaKey` のコンテキスト引き回しがあり、visitor パターンに `enter`/`leave` やコンテキスト引数を追加する必要がある。複雑さに対して得られるメリットが小さいため、現状維持とする。

(タスクなし — スコープ外決定の記録)

---

## Phase 4: language-server — デッドコード除去 (YAGNI)

### Task 8: 限定的なデッドコード除去

Codex レビューにより、公開 API (export) の変更はスコープを限定する。keywords.ts の配列エクスポートは grammar 生成から参照されているため変更しない。

**Files:**
- Modify: `packages/language-server/src/shared/keywords.ts` — 空の `LEGACY_PROPERTIES` と無効なイテレーションを削除
- Modify: `packages/language-server/src/schema/schemaTypes.ts` — deprecated `FileSchema` 型エイリアスを削除

**Step 1: keywords.ts — 空の LEGACY_PROPERTIES を削除**

```typescript
// line 26-27 削除:
// /** スキーマ未定義だが RailSim2 で使われるレガシープロパティ */
// const LEGACY_PROPERTIES: string[] = [];

// line 36 削除:
// for (const p of LEGACY_PROPERTIES) names.add(p);
```

**Step 2: schemaTypes.ts — deprecated FileSchema 削除**

deprecated `FileSchema` 型エイリアスが存在する場合は削除。使用箇所がないことを grep で確認してから削除する。

**Step 3: テスト通過 → コミット**

Run: `pnpm test`

```bash
git add packages/language-server/src/shared/keywords.ts packages/language-server/src/schema/schemaTypes.ts
git commit -m "refactor(language-server): remove dead code (empty LEGACY_PROPERTIES, deprecated FileSchema)"
```

---

## Phase 5: language-server — 一貫性改善

### Task 9: 診断メッセージの言語を統一

`switchValidator.ts` は日本語、他のバリデータは英語。英語に統一する（LSP クライアント側で i18n する方が正しいため）。

**Files:**
- Modify: `packages/language-server/src/server/validator/switchValidator.ts`
- Modify: `packages/language-server/test/switchValidator.test.ts`

**Step 1: メッセージを英語に変更**

```typescript
// switchValidator.ts:12 — 日本語 → 英語
`Duplicate switch definition '${name}'`
// switchValidator.ts:51
`Reference to undefined switch '${name}'`
```

**Step 2: テストのアサーション更新**

テスト内の日本語メッセージマッチングを英語に更新。

**Step 3: テスト通過 → コミット**

Run: `pnpm --filter @railsim2-support/language-server test`

```bash
git add packages/language-server/src/server/validator/switchValidator.ts packages/language-server/test/switchValidator.test.ts
git commit -m "refactor(language-server): unify diagnostic messages to English"
```

---

### Task 10: schemaValidator の型安全性改善

`schemaValidator.ts:307` の `checkValueType` が `type: string` を受け取っている。`PropertyType` に変更して網羅性チェックを追加。

**Files:**
- Modify: `packages/language-server/src/server/validator/schemaValidator.ts`

**Step 1: パラメータ型を PropertyType に変更**

```typescript
import type { PropertyType } from "../../schema/schemaTypes.js";

// checkValueType の第2引数を string → PropertyType に
function checkValueType(
  value: ExprNode,
  type: PropertyType,
  propName: string,
  objectName: string,
  schema: PropertySchema,
  diagnostics: Diagnostic[],
): void {
  // 既存の switch はそのまま
  // default ケースに exhaustive check を追加:
  default: {
    const _exhaustive: never = type;
    return _exhaustive;
  }
}
```

**Step 2: テスト通過 → コミット**

Run: `pnpm --filter @railsim2-support/language-server test`

```bash
git add packages/language-server/src/server/validator/schemaValidator.ts
git commit -m "refactor(language-server): improve type safety of checkValueType with PropertyType"
```

---

## Phase 6: website — DRY 改善

### Task 11: website の共通ビルドユーティリティ抽出

`samples.ts` と `vendor.ts` で `readShiftJIS`、`REPO_ROOT`、`RAILSIM2_ROOT` が重複。

**Files:**
- Create: `packages/website/src/lib/build-utils.ts`
- Modify: `packages/website/src/lib/samples.ts`
- Modify: `packages/website/src/lib/vendor.ts`

**Step 1: 共通ユーティリティを抽出**

```typescript
// src/lib/build-utils.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import iconv from "iconv-lite";

export const REPO_ROOT = resolve(process.cwd(), "../..");
export const RAILSIM2_ROOT = resolve(REPO_ROOT, "vendor/railsim2");

export function readShiftJIS(filePath: string): string {
  return iconv.decode(readFileSync(filePath), "shift_jis");
}
```

**Step 2: samples.ts, vendor.ts の重複定義を import に置換**

**Step 3: テスト通過 → コミット**

Run: `pnpm test`

```bash
git add packages/website/src/lib/build-utils.ts packages/website/src/lib/samples.ts packages/website/src/lib/vendor.ts
git commit -m "refactor(website): extract shared build utilities (readShiftJIS, paths)"
```

---

### Task 12: lsp.ts — LSP Range 変換ヘルパー抽出

LSP 0-based → Monaco 1-based の座標変換 (`line + 1`, `character + 1`) が lsp.ts 内の5箇所以上に散在。

**Files:**
- Modify: `packages/website/src/lib/lsp.ts`

**Step 1: ヘルパー関数を抽出**

```typescript
function lspPositionToMonaco(pos: { line: number; character: number }) {
  return { lineNumber: pos.line + 1, column: pos.character + 1 };
}

function lspRangeToMonaco(range: { start: { line: number; character: number }; end: { line: number; character: number } }) {
  const start = lspPositionToMonaco(range.start);
  const end = lspPositionToMonaco(range.end);
  return { startLineNumber: start.lineNumber, startColumn: start.column, endLineNumber: end.lineNumber, endColumn: end.column };
}
```

**Step 2: 散在する座標変換をすべてヘルパー呼び出しに置換**

**Step 3: テスト通過 → コミット**

Run: `pnpm --filter @railsim2-support/website test`

```bash
git add packages/website/src/lib/lsp.ts
git commit -m "refactor(website): extract LSP-to-Monaco coordinate helpers"
```

---

### Task 13: file-access.ts の書き込みロジック重複解消

`saveFile` と `saveFileAs` で同一のエンコード→書き込みシーケンスが重複。

**Files:**
- Modify: `packages/website/src/lib/file-access.ts`

**Step 1: 内部ヘルパーを抽出**

```typescript
async function writeToHandle(
  handle: FileSystemFileHandle,
  content: string,
  encoding: Encoding,
): Promise<void> {
  const data = await encode(content, encoding);
  const writable = await handle.createWritable();
  try {
    await writable.write(data);
  } finally {
    await writable.close();
  }
}
```

**Step 2: saveFile を writeToHandle 呼び出しに書き換え**

```typescript
export async function saveFile(
  handle: FileSystemFileHandle,
  content: string,
  encoding: Encoding,
): Promise<void> {
  await writeToHandle(handle, content, encoding);
}
```

**Step 3: saveFileAs を writeToHandle 呼び出しに書き換え**

```typescript
export async function saveFileAs(
  content: string,
  encoding: Encoding,
  suggestedName?: string,
): Promise<SavedAsFile> {
  const handle = await window.showSaveFilePicker({
    suggestedName,
    types: [
      {
        description: "RailSim2 Plugin Files",
        accept: { "text/plain": [".txt"] },
      },
    ],
  });
  await writeToHandle(handle, content, encoding);
  return { handle, fileName: handle.name };
}
```

**Step 4: ビルド確認 → コミット**

Run: `pnpm --filter @railsim2-support/website build`

```bash
git add packages/website/src/lib/file-access.ts
git commit -m "refactor(website): extract writeToHandle helper in file-access"
```

---

## Phase 7: vscode-extension — ビルド改善

### Task 14: esbuild 並列化

`build.mjs` で4つの `await esbuild.build()` が逐次実行されている。`Promise.all` で並列化。

**Files:**
- Modify: `packages/vscode-extension/scripts/build.mjs`

**Step 1: Promise.all に書き換え**

```javascript
await Promise.all([
  esbuild.build({ /* extension */ }),
  esbuild.build({ /* server */ }),
  esbuild.build({ /* extension.browser */ }),
  esbuild.build({ /* server.browser */ }),
]);
```

**Step 2: ビルド成功確認 → コミット**

Run: `pnpm --filter railsim2-support build`

```bash
git add packages/vscode-extension/scripts/build.mjs
git commit -m "perf(vscode-extension): parallelize esbuild invocations"
```

---

## Phase 8: 最終検証

### Task 15: 全体テスト・ビルド・lint 通過確認

**Step 1: 全テスト実行**

Run: `pnpm test`
Expected: 全テスト PASS

**Step 2: 全ビルド実行**

Run: `pnpm build`
Expected: 全パッケージビルド成功

**Step 3: lint 実行**

Run: `pnpm lint`
Expected: エラーなし

---

## 優先度と依存関係

| Task | Phase | 優先度 | 依存 | リスク |
|------|-------|--------|------|--------|
| 1    | 1     | Critical | — | Low (バグ修正) |
| 2    | 1     | Critical | — | Low (バグ修正) |
| 3    | 2     | Medium | 1 | Low |
| 4    | 2     | Medium | 3 | Low |
| 5    | 2     | Medium | — | Low |
| 6    | 2     | Medium | — | Low |
| 7a   | 3     | High   | — | Medium (2ファイル移行) |
| 7b   | 3     | High   | 7a | Low |
| 8    | 4     | Medium | — | Low |
| 9    | 5     | Low    | — | Low |
| 10   | 5     | Medium | — | Low |
| 11   | 6     | Medium | — | Low |
| 12   | 6     | Medium | — | Low |
| 13   | 6     | Low    | — | Low |
| 14   | 7     | Low    | — | Low |
| 15   | 8     | High   | 1-14 | — |

## スコープ外（今回見送り）

以下は分析で検出されたが、リスクや工数に対して効果が薄いため今回は見送り:

- **Editor.tsx の大規模分割**: 669行あるが、React hooks への分割はリスクが高く、現状動作しているため後回し
- **inlayHintProvider.ts の walkNodes 移行**: rangesOverlap 枝刈りと visitExpr があり、汎用 walker ではカバーしきれない
- **schemaValidator.ts の walkNodes 移行**: parentSchemaKey のコンテキスト引き回しが必要で、walker API に enter/leave/context を追加する必要がある。複雑さに対してメリットが小さい
- **completionProvider.ts の rootSchemaKeyMap 重複**: 同一ファイル内の最適化で優先度低
- **parser.ts の distributeComments 分割**: 100行の関数だが既にテストでカバーされておりリスクが高い
- **grammar 共有パッケージ化**: パッケージ構造の大幅変更が必要で効果に対してコスト高
- **keywords.ts の配列エクスポート非公開化**: grammar 生成 (vscode-extension) から参照されているため破壊的変更になる
