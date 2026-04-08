# LSP Phase 3.1: Autocomplete Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** RailSim2 プラグインファイル編集時に、カーソル位置に応じたオートコンプリート候補（ルートオブジェクト名、プロパティ名、子オブジェクト名）を提示する。

**Architecture:** 補完リクエスト時に毎回 `parse()` で AST を生成し、カーソル位置から最内 ObjectNode を特定。`semanticSchema` / `fileSchemas` から候補を返す。3段分離: `findContext` (位置判定) → `resolveSchema` (スキーマ解決+フィルタ) → `buildCompletionItems` (LSP item 生成)。

**Tech Stack:** TypeScript 6.0, vscode-languageserver 9.0, vitest 4.1

---

### Task 1: パーサー修正 — 未閉じ構造の range.end を EOF に伸ばす

**Files:**
- Modify: `src/server/parser.ts:321-341` (parseObject), `src/server/parser.ts:455-476` (parseIf), `src/server/parser.ts:485-522` (parseApplySwitch)
- Test: `test/parser.test.ts`

**Step 1: Write the failing test**

`test/parser.test.ts` の末尾に追加:

```typescript
describe("未閉じ構造の range.end", () => {
  it("未閉じオブジェクトの range.end が EOF まで伸びる", () => {
    const src = "RailInfo {\n  Gauge = 1.0;\n";
    const { file } = parse(src);
    const obj = file.body[0];
    expect(obj.type).toBe("object");
    if (obj.type === "object") {
      // range.end は EOF 位置（line 2, char 0）以上
      expect(obj.range.end.line).toBeGreaterThanOrEqual(2);
    }
  });

  it("未閉じ If の range.end が EOF まで伸びる", () => {
    const src = "RailInfo {\n  If 1 {\n    Gauge = 1.0;\n";
    const { file } = parse(src);
    const obj = file.body[0];
    expect(obj.type).toBe("object");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run test/parser.test.ts --reporter verbose`
Expected: Tests may pass or fail depending on current behavior — observe the actual range.end values.

**Step 3: Write minimal implementation**

In `src/server/parser.ts`, modify `parseObject()` around line 338-341:

```typescript
// Before:
const closeBrace = expect("rbrace", "Expected '}'");
const endPos = endOf(closeBrace.length > 0 ? closeBrace : (tokens[pos - 1] ?? nameToken));

// After:
const closeBrace = expect("rbrace", "Expected '}'");
const endPos = closeBrace.length > 0
  ? endOf(closeBrace)
  : endOf(tokens[tokens.length - 1]); // EOF position
```

Apply same pattern to `parseIf()` (line ~473) and `parseApplySwitch()` (line ~517):

```typescript
// parseIf — after else block or after then block
const endPos = endOf(tokens[pos - 1]?.length > 0 ? tokens[pos - 1] : tokens[tokens.length - 1]);
```

Note: The key insight is `closeBrace.length === 0` means synthetic token (missing `}`), so we extend to EOF.

**Step 4: Run test to verify it passes**

Run: `npx vitest run test/parser.test.ts --reporter verbose`
Expected: All tests PASS including new ones.

**Step 5: Run full test suite for regression**

Run: `npx vitest run`
Expected: All 261+ tests PASS.

**Step 6: Commit**

```bash
git add src/server/parser.ts test/parser.test.ts
git commit -m "🐛 未閉じ構造の range.end を EOF 位置まで伸ばす"
```

---

### Task 2: schemaKey 解決ロジックを共通 helper に切り出す

**Files:**
- Create: `src/schema/schemaUtils.ts`
- Modify: `src/server/validator/schemaValidator.ts:139-153`
- Test: `test/schemaUtils.test.ts`

**Step 1: Write the failing test**

Create `test/schemaUtils.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { resolveSchemaKey } from "../src/schema/schemaUtils.js";

describe("resolveSchemaKey", () => {
  it("親なし → オブジェクト名そのまま", () => {
    expect(resolveSchemaKey("RailInfo", undefined)).toBe("RailInfo");
  });

  it("親あり + schemaKey なし → オブジェクト名そのまま", () => {
    expect(resolveSchemaKey("Face", "Profile")).toBe("Face");
  });

  it("親あり + schemaKey あり → schemaKey を返す", () => {
    expect(resolveSchemaKey("Vertex", "Face")).toBe("Vertex:Profile");
  });

  it("親あり + 子が存在しない → オブジェクト名そのまま", () => {
    expect(resolveSchemaKey("Unknown", "RailInfo")).toBe("Unknown");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run test/schemaUtils.test.ts --reporter verbose`
Expected: FAIL — module not found.

**Step 3: Write minimal implementation**

Create `src/schema/schemaUtils.ts`:

```typescript
import { semanticSchema } from "./semantic.js";

/**
 * 子オブジェクト名と親の schemaKey から、実際のスキーマ lookup key を解決する。
 * 親の children に schemaKey が定義されていればそれを使い、なければ nodeName をそのまま返す。
 */
export function resolveSchemaKey(
  nodeName: string,
  parentSchemaKey: string | undefined,
): string {
  if (parentSchemaKey) {
    const parentSchema = semanticSchema[parentSchemaKey];
    if (parentSchema) {
      const childDef = parentSchema.children[nodeName];
      if (childDef?.schemaKey) {
        return childDef.schemaKey;
      }
    }
  }
  return nodeName;
}
```

**Step 4: Modify schemaValidator.ts to use shared helper**

In `src/server/validator/schemaValidator.ts`:
- Add import: `import { resolveSchemaKey } from "../../schema/schemaUtils.js";`
- Delete the local `resolveSchemaKey` function (lines 139-153).

**Step 5: Run tests**

Run: `npx vitest run`
Expected: All tests PASS (schemaValidator tests unchanged, new schemaUtils tests pass).

**Step 6: Commit**

```bash
git add src/schema/schemaUtils.ts test/schemaUtils.test.ts src/server/validator/schemaValidator.ts
git commit -m "♻️ resolveSchemaKey を共通 helper に切り出し"
```

---

### Task 3: completionProvider — findContext 実装

**Files:**
- Create: `src/server/completionProvider.ts`
- Test: `test/completionProvider.test.ts`

**Step 1: Write the failing tests**

Create `test/completionProvider.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { findContext } from "../src/server/completionProvider.js";
import { parse } from "../src/server/parser.js";
import { tokenize } from "../src/server/tokenizer.js";
import type { Position } from "../src/shared/tokens.js";

function ctx(src: string, pos: Position, fileName?: string) {
  const { file } = parse(src);
  const tokens = tokenize(src);
  return findContext(file, tokens, pos, fileName);
}

describe("findContext", () => {
  it("ファイルトップレベル → root", () => {
    const result = ctx("", { line: 0, character: 0 }, "Rail2.txt");
    expect(result.type).toBe("root");
  });

  it("オブジェクトボディ内 → objectBody", () => {
    const src = "RailInfo {\n  \n}";
    const result = ctx(src, { line: 1, character: 2 });
    expect(result.type).toBe("objectBody");
    if (result.type === "objectBody") {
      expect(result.schemaKey).toBe("RailInfo");
    }
  });

  it("ネストした子オブジェクト内 → 正しい schemaKey", () => {
    const src = "Profile {\n  Face {\n    \n  }\n}";
    const result = ctx(src, { line: 2, character: 4 });
    expect(result.type).toBe("objectBody");
    if (result.type === "objectBody") {
      expect(result.schemaKey).toBe("Face");
    }
  });

  it("コメント中 → none", () => {
    const src = "RailInfo {\n  // comment\n}";
    const result = ctx(src, { line: 1, character: 5 });
    expect(result.type).toBe("none");
  });

  it("文字列リテラル中 → none", () => {
    const src = 'RailInfo {\n  PluginName = "test";\n}';
    const result = ctx(src, { line: 1, character: 17 });
    expect(result.type).toBe("none");
  });

  it("プロパティ値中（= の後 ; の前）→ none", () => {
    const src = "RailInfo {\n  Gauge = 1.0;\n}";
    const result = ctx(src, { line: 1, character: 12 });
    expect(result.type).toBe("none");
  });

  it("未閉じオブジェクト内 → objectBody", () => {
    const src = "RailInfo {\n  Gauge = 1.0;\n  ";
    const result = ctx(src, { line: 2, character: 2 });
    expect(result.type).toBe("objectBody");
  });

  it("If ブロック内 → 親オブジェクトの objectBody", () => {
    const src = "RailInfo {\n  If 1 {\n    \n  }\n}";
    const result = ctx(src, { line: 2, character: 4 });
    expect(result.type).toBe("objectBody");
    if (result.type === "objectBody") {
      expect(result.schemaKey).toBe("RailInfo");
    }
  });

  it("schemaKey 依存: Vertex in Face(Profile) → Vertex:Profile", () => {
    const src = "Profile {\n  Face {\n    Vertex {\n      \n    }\n  }\n}";
    const result = ctx(src, { line: 3, character: 6 });
    expect(result.type).toBe("objectBody");
    if (result.type === "objectBody") {
      expect(result.schemaKey).toBe("Vertex:Profile");
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run test/completionProvider.test.ts --reporter verbose`
Expected: FAIL — module not found.

**Step 3: Write implementation**

Create `src/server/completionProvider.ts`:

```typescript
import type { Token } from "../shared/tokens.js";
import type { Position } from "../shared/tokens.js";
import type { FileNode, ObjectNode, BodyNode, TopLevelNode, IfNode, ApplySwitchNode } from "../shared/ast.js";
import { resolveSchemaKey } from "../schema/schemaUtils.js";

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

export type CompletionContext =
  | { type: "root"; fileName?: string }
  | { type: "objectBody"; objectName: string; schemaKey: string; parentChain: string[]; body: BodyNode[] }
  | { type: "none" };

// ---------------------------------------------------------------------------
// findContext — カーソル位置から補完コンテキストを判定
// ---------------------------------------------------------------------------

export function findContext(
  file: FileNode,
  tokens: Token[],
  position: Position,
  fileName?: string,
): CompletionContext {
  // 1. トークンベースの抑止判定
  if (isInSuppressedToken(tokens, position)) {
    return { type: "none" };
  }

  // 2. プロパティ値中の抑止判定
  if (isInPropertyValue(tokens, position)) {
    return { type: "none" };
  }

  // 3. AST walk で最内 ObjectNode を特定
  const result = findInnermostObject(file.body, position, []);
  if (!result) {
    return { type: "root", fileName };
  }

  return {
    type: "objectBody",
    objectName: result.object.name,
    schemaKey: result.schemaKey,
    parentChain: result.parentChain,
    body: result.body,
  };
}

// ---------------------------------------------------------------------------
// トークンベースの抑止判定
// ---------------------------------------------------------------------------

function isInSuppressedToken(tokens: Token[], position: Position): boolean {
  for (const token of tokens) {
    if (token.type === "lineComment" || token.type === "blockComment" || token.type === "string") {
      const tokenStart = { line: token.line, character: token.character };
      const tokenEnd = getTokenEnd(token);
      if (isPositionInRange(position, tokenStart, tokenEnd)) {
        return true;
      }
    }
  }
  return false;
}

function isInPropertyValue(tokens: Token[], position: Position): boolean {
  // 非コメントトークンだけをフィルタ
  const codeTokens = tokens.filter(
    (t) => t.type !== "lineComment" && t.type !== "blockComment",
  );

  // カーソルより前の最後のトークンを探す
  let lastEqualsIdx = -1;
  let lastSemiOrBraceIdx = -1;

  for (let i = 0; i < codeTokens.length; i++) {
    const t = codeTokens[i];
    const tEnd = getTokenEnd(t);
    if (isPositionAfter(position, tEnd)) continue;
    if (isPositionBefore(position, { line: t.line, character: t.character })) break;
    // カーソルはこのトークン上またはその後
  }

  // カーソルより前のトークンを逆走査
  for (let i = codeTokens.length - 1; i >= 0; i--) {
    const t = codeTokens[i];
    if (isPositionBefore({ line: t.line, character: t.character }, position) ||
        (t.line === position.line && t.character === position.character)) {
      // ignore
    } else if (isPositionAfter({ line: t.line, character: t.character }, position)) {
      continue;
    }

    if (isPositionAfter({ line: t.line, character: t.character }, position)) continue;

    if (t.type === "equals" && lastEqualsIdx === -1) {
      lastEqualsIdx = i;
    }
    if ((t.type === "semicolon" || t.type === "lbrace" || t.type === "rbrace") && lastSemiOrBraceIdx === -1) {
      lastSemiOrBraceIdx = i;
    }
    if (lastEqualsIdx !== -1 && lastSemiOrBraceIdx !== -1) break;
  }

  // = の後で ; や { } の前 → プロパティ値中
  return lastEqualsIdx !== -1 && lastEqualsIdx > lastSemiOrBraceIdx;
}

// ---------------------------------------------------------------------------
// AST walk — 最内オブジェクト検索
// ---------------------------------------------------------------------------

interface ObjectResult {
  object: ObjectNode;
  schemaKey: string;
  parentChain: string[];
  body: BodyNode[];
}

function findInnermostObject(
  nodes: (TopLevelNode | BodyNode)[],
  position: Position,
  parentChain: string[],
  parentSchemaKey?: string,
): ObjectResult | null {
  for (const node of nodes) {
    if (node.type === "object") {
      if (isPositionInNodeRange(position, node)) {
        const schemaKey = resolveSchemaKey(node.name, parentSchemaKey);
        // さらに深い子を探す
        const deeper = findInnermostInBody(node.body, position, [...parentChain, schemaKey], schemaKey);
        if (deeper) return deeper;
        // 子にマッチしない → このオブジェクト自体がコンテキスト
        return { object: node, schemaKey, parentChain, body: node.body };
      }
    } else if (node.type === "if") {
      const inThen = findInnermostObject(node.then, position, parentChain, parentSchemaKey);
      if (inThen) return inThen;
      if (node.else_) {
        const inElse = findInnermostObject(node.else_, position, parentChain, parentSchemaKey);
        if (inElse) return inElse;
      }
    } else if (node.type === "applySwitch") {
      for (const c of node.cases) {
        const inCase = findInnermostObject(c.body, position, parentChain, parentSchemaKey);
        if (inCase) return inCase;
      }
      if (node.default_) {
        const inDef = findInnermostObject(node.default_, position, parentChain, parentSchemaKey);
        if (inDef) return inDef;
      }
    }
  }
  return null;
}

function findInnermostInBody(
  body: BodyNode[],
  position: Position,
  parentChain: string[],
  parentSchemaKey: string,
): ObjectResult | null {
  return findInnermostObject(body, position, parentChain, parentSchemaKey);
}

// ---------------------------------------------------------------------------
// Position helpers
// ---------------------------------------------------------------------------

function getTokenEnd(token: Token): Position {
  // 簡易: 単一行トークンを仮定
  return { line: token.line, character: token.character + token.length };
}

function isPositionInRange(pos: Position, start: Position, end: Position): boolean {
  if (isPositionBefore(pos, start)) return false;
  if (isPositionAfter(pos, end)) return false;
  return true;
}

function isPositionInNodeRange(pos: Position, node: { range: { start: Position; end: Position } }): boolean {
  return isPositionInRange(pos, node.range.start, node.range.end);
}

function isPositionBefore(a: Position, b: Position): boolean {
  return a.line < b.line || (a.line === b.line && a.character < b.character);
}

function isPositionAfter(a: Position, b: Position): boolean {
  return a.line > b.line || (a.line === b.line && a.character > b.character);
}
```

**Step 4: Run tests**

Run: `npx vitest run test/completionProvider.test.ts --reporter verbose`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add src/server/completionProvider.ts test/completionProvider.test.ts
git commit -m "✨ completionProvider: findContext 実装"
```

---

### Task 4: completionProvider — buildCompletionItems 実装

**Files:**
- Modify: `src/server/completionProvider.ts`
- Modify: `test/completionProvider.test.ts`

**Step 1: Write the failing tests**

Append to `test/completionProvider.test.ts`:

```typescript
import { getCompletions } from "../src/server/completionProvider.js";
import { CompletionItemKind, InsertTextFormat } from "vscode-languageserver/node";

function completions(src: string, pos: Position, fileName?: string) {
  const { file } = parse(src);
  const tokens = tokenize(src);
  return getCompletions(file, tokens, pos, fileName);
}

function labels(items: { label: string }[]): string[] {
  return items.map((i) => i.label);
}

describe("getCompletions", () => {
  // ── ルート補完 ──
  it("Rail2.txt トップレベル → ルートオブジェクト候補", () => {
    const items = completions("", { line: 0, character: 0 }, "Rail2.txt");
    expect(labels(items)).toContain("PluginHeader");
    expect(labels(items)).toContain("RailInfo");
    expect(labels(items)).toContain("Profile");
  });

  it("Rail2.txt 既存ルート除外 (multiple: false)", () => {
    const src = "PluginHeader {\n}\n";
    const items = completions(src, { line: 2, character: 0 }, "Rail2.txt");
    expect(labels(items)).not.toContain("PluginHeader");
    expect(labels(items)).toContain("RailInfo");
  });

  it("未知ファイル名 → ルート補完なし", () => {
    const items = completions("", { line: 0, character: 0 }, "Unknown.txt");
    expect(items).toHaveLength(0);
  });

  // ── プロパティ補完 ──
  it("RailInfo 内 → プロパティ候補", () => {
    const src = "RailInfo {\n  \n}";
    const items = completions(src, { line: 1, character: 2 });
    expect(labels(items)).toContain("Gauge");
    expect(labels(items)).toContain("TrackNum");
    const gauge = items.find((i) => i.label === "Gauge");
    expect(gauge?.kind).toBe(CompletionItemKind.Property);
  });

  it("既存プロパティ除外 (multiple: false)", () => {
    const src = "RailInfo {\n  Gauge = 1.0;\n  \n}";
    const items = completions(src, { line: 2, character: 2 });
    expect(labels(items)).not.toContain("Gauge");
  });

  // ── 子オブジェクト補完 ──
  it("TrainInfo 内 → 子オブジェクト候補", () => {
    const src = "TrainInfo {\n  Gauge = 1.0;\n  \n}";
    const items = completions(src, { line: 2, character: 2 });
    expect(labels(items)).toContain("Body");
    expect(labels(items)).toContain("Sound");
    expect(labels(items)).toContain("DefineSwitch");
    const body = items.find((i) => i.label === "Body");
    expect(body?.kind).toBe(CompletionItemKind.Class);
  });

  it("既存子オブジェクト除外 (multiple: false)", () => {
    const src = "Body {\n  ModelFileName = \"a.x\";\n  FrontCabin {\n    ModelFileName = \"b.x\";\n  }\n  \n}";
    const items = completions(src, { line: 5, character: 2 });
    expect(labels(items)).not.toContain("FrontCabin");
    expect(labels(items)).toContain("Headlight"); // multiple: true
  });

  // ── スニペット ──
  it("float プロパティ → = ${1:0}; スニペット", () => {
    const src = "RailInfo {\n  \n}";
    const items = completions(src, { line: 1, character: 2 });
    const gauge = items.find((i) => i.label === "Gauge");
    expect(gauge?.insertText).toBe("Gauge = ${1:0};");
    expect(gauge?.insertTextFormat).toBe(InsertTextFormat.Snippet);
  });

  it("filename プロパティ → = \"${1}\"; スニペット", () => {
    const src = "RailInfo {\n  \n}";
    const items = completions(src, { line: 1, character: 2 });
    const mfn = items.find((i) => i.label === "ModelFileName");
    expect(mfn?.insertText).toBe('ModelFileName = "${1}";');
  });

  it("yes-no プロパティ → = ${1|yes,no|}; スニペット", () => {
    const src = "RailInfo {\n  \n}";
    const items = completions(src, { line: 1, character: 2 });
    const ec = items.find((i) => i.label === "EnableCant");
    expect(ec?.insertText).toBe("EnableCant = ${1|yes,no|};");
  });

  it("vector-3d プロパティ → 3値スニペット", () => {
    const src = "Headlight {\n  \n}";
    const items = completions(src, { line: 1, character: 2 });
    const coord = items.find((i) => i.label === "Coord");
    expect(coord?.insertText).toBe("Coord = ${1:0}, ${2:0}, ${3:0};");
  });

  it("enum プロパティ → 選択肢スニペット", () => {
    const src = "TrainInfo {\n  \n}";
    const items = completions(src, { line: 1, character: 2 });
    const od = items.find((i) => i.label === "OpenDoor");
    expect(od?.insertText).toBe("OpenDoor = ${1|Up,Down|};");
  });

  it("nameParameter 付き子オブジェクト → name プレースホルダ", () => {
    const src = "TrainInfo {\n  \n}";
    const items = completions(src, { line: 1, character: 2 });
    const ds = items.find((i) => i.label === "DefineSwitch");
    expect(ds?.insertText).toBe("DefineSwitch ${1:name} {\n\t$0\n}");
  });

  // ── 補完抑止 ──
  it("プロパティ値中 → 補完なし", () => {
    const src = "RailInfo {\n  Gauge = 1.0;\n}";
    const items = completions(src, { line: 1, character: 12 });
    expect(items).toHaveLength(0);
  });

  it("コメント中 → 補完なし", () => {
    const src = "RailInfo {\n  // comment\n}";
    const items = completions(src, { line: 1, character: 5 });
    expect(items).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run test/completionProvider.test.ts --reporter verbose`
Expected: FAIL — `getCompletions` not exported.

**Step 3: Write implementation**

Add to `src/server/completionProvider.ts`:

```typescript
import type { CompletionItem } from "vscode-languageserver/node";
import { CompletionItemKind, InsertTextFormat } from "vscode-languageserver/node";
import type { PropertySchema, ChildSchema, ObjectSchema } from "../schema/schemaTypes.js";
import { semanticSchema, getFileSchema } from "../schema/semantic.js";

// ---------------------------------------------------------------------------
// getCompletions — メインエントリポイント
// ---------------------------------------------------------------------------

export function getCompletions(
  file: FileNode,
  tokens: Token[],
  position: Position,
  fileName?: string,
): CompletionItem[] {
  const context = findContext(file, tokens, position, fileName);

  switch (context.type) {
    case "none":
      return [];
    case "root":
      return buildRootCompletions(file, context.fileName);
    case "objectBody":
      return buildBodyCompletions(context);
  }
}

// ---------------------------------------------------------------------------
// Root completions
// ---------------------------------------------------------------------------

function buildRootCompletions(file: FileNode, fileName?: string): CompletionItem[] {
  if (!fileName) return [];
  const rootEntries = getFileSchema(fileName);
  if (!rootEntries) return [];

  // 既存ルートオブジェクトを収集
  const existingRoots = new Map<string, number>();
  for (const node of file.body) {
    if (node.type === "object") {
      existingRoots.set(node.name, (existingRoots.get(node.name) ?? 0) + 1);
    }
  }

  const items: CompletionItem[] = [];
  for (const entry of rootEntries) {
    if (!entry.multiple && (existingRoots.get(entry.name) ?? 0) >= 1) continue;
    items.push(buildObjectItem(entry.name, entry.required));
  }
  return items;
}

// ---------------------------------------------------------------------------
// Body completions (properties + children)
// ---------------------------------------------------------------------------

function buildBodyCompletions(
  context: Extract<CompletionContext, { type: "objectBody" }>,
): CompletionItem[] {
  const schema = semanticSchema[context.schemaKey];
  if (!schema) return [];

  const items: CompletionItem[] = [];

  // 既存プロパティ/子オブジェクトを収集
  const existingProps = new Map<string, number>();
  const existingChildren = new Map<string, number>();
  collectExisting(context.body, existingProps, existingChildren);

  // プロパティ候補
  for (const [name, propSchema] of Object.entries(schema.properties)) {
    if (!propSchema.multiple && (existingProps.get(name) ?? 0) >= 1) continue;
    items.push(buildPropertyItem(name, propSchema));
  }

  // 子オブジェクト候補
  for (const [name, childSchema] of Object.entries(schema.children)) {
    if (!childSchema.multiple && (existingChildren.get(name) ?? 0) >= 1) continue;
    const childSchemaKey = childSchema.schemaKey ?? name;
    const childObjSchema = semanticSchema[childSchemaKey];
    items.push(buildChildObjectItem(name, childSchema, childObjSchema));
  }

  return items;
}

function collectExisting(
  body: BodyNode[],
  props: Map<string, number>,
  children: Map<string, number>,
): void {
  for (const node of body) {
    switch (node.type) {
      case "property":
        props.set(node.name, (props.get(node.name) ?? 0) + 1);
        break;
      case "object":
        children.set(node.name, (children.get(node.name) ?? 0) + 1);
        break;
      case "if":
        // If 内のものもカウント（直接スコープのみ）
        break;
      case "applySwitch":
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// CompletionItem builders
// ---------------------------------------------------------------------------

function buildPropertyItem(name: string, schema: PropertySchema): CompletionItem {
  return {
    label: name,
    kind: CompletionItemKind.Property,
    detail: `${schema.type}${schema.required ? " (required)" : ""}`,
    insertText: buildPropertySnippet(name, schema),
    insertTextFormat: InsertTextFormat.Snippet,
  };
}

function buildPropertySnippet(name: string, schema: PropertySchema): string {
  const arity = schema.arity ?? (schema.type === "vector-2d" ? 2 : schema.type === "vector-3d" ? 3 : 1);

  switch (schema.type) {
    case "string":
    case "filename":
      if (arity === 1) return `${name} = "\${1}";`;
      return `${name} = ${Array.from({ length: arity }, (_, i) => `"\${${i + 1}}"`).join(", ")};`;

    case "yes-no":
      return `${name} = \${1|yes,no|};`;

    case "color":
      if (arity === 1) return `${name} = \${1:#000000};`;
      return `${name} = ${Array.from({ length: arity }, (_, i) => `\${${i + 1}:#000000}`).join(", ")};`;

    case "enum":
      if (schema.enumValues && schema.enumValues.length > 0) {
        return `${name} = \${1|${schema.enumValues.join(",")}|};`;
      }
      return `${name} = \${1};`;

    case "identifier":
      return `${name} = \${1:name};`;

    default:
      // float, integer, expression, vector-2d, vector-3d
      if (arity === 1) return `${name} = \${1:0};`;
      return `${name} = ${Array.from({ length: arity }, (_, i) => `\${${i + 1}:0}`).join(", ")};`;
  }
}

function buildObjectItem(name: string, required: boolean): CompletionItem {
  const objSchema = semanticSchema[name];
  const snippet = buildObjectSnippet(name, objSchema);

  return {
    label: name,
    kind: CompletionItemKind.Class,
    detail: required ? "(required)" : undefined,
    insertText: snippet,
    insertTextFormat: InsertTextFormat.Snippet,
  };
}

function buildChildObjectItem(
  name: string,
  childSchema: ChildSchema,
  objSchema: ObjectSchema | undefined,
): CompletionItem {
  const snippet = buildObjectSnippet(name, objSchema);

  return {
    label: name,
    kind: CompletionItemKind.Class,
    detail: childSchema.required ? "(required)" : undefined,
    insertText: snippet,
    insertTextFormat: InsertTextFormat.Snippet,
  };
}

function buildObjectSnippet(name: string, schema: ObjectSchema | undefined): string {
  if (schema?.nameParameter) {
    return `${name} \${1:name} {\n\t$0\n}`;
  }
  return `${name} {\n\t$0\n}`;
}
```

**Step 4: Run tests**

Run: `npx vitest run test/completionProvider.test.ts --reporter verbose`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add src/server/completionProvider.ts test/completionProvider.test.ts
git commit -m "✨ completionProvider: getCompletions + スニペット生成実装"
```

---

### Task 5: server.ts に onCompletion ハンドラを統合

**Files:**
- Modify: `src/server/server.ts`
- Test: `test/integration.test.ts`

**Step 1: Write the failing test**

Append to `test/integration.test.ts`:

```typescript
import { getCompletions } from "../src/server/completionProvider.js";
import { parse } from "../src/server/parser.js";
import { tokenize } from "../src/server/tokenizer.js";

describe("integration: completion", () => {
  it("Rail2.txt フルパイプライン: parse → findContext → getCompletions", () => {
    const src = `PluginHeader {
  RailSimVersion = "2.00";
  PluginType = Rail;
  PluginName = "test";
  PluginAuthor = "author";
}
RailInfo {
  Gauge = 1.067;
  
}`;
    const { file } = parse(src);
    const tokens = tokenize(src);
    const items = getCompletions(file, tokens, { line: 8, character: 2 }, "Rail2.txt");
    const itemLabels = items.map((i) => i.label);
    // Gauge は既出なので除外
    expect(itemLabels).not.toContain("Gauge");
    // 他のプロパティは表示
    expect(itemLabels).toContain("TrackNum");
    expect(itemLabels).toContain("ModelFileName");
    // 子オブジェクト
    expect(itemLabels).toContain("DefineSwitch");
  });
});
```

**Step 2: Run test to verify it fails or passes**

Run: `npx vitest run test/integration.test.ts --reporter verbose`
Expected: PASS (logic is already implemented in completionProvider).

**Step 3: Modify server.ts**

In `src/server/server.ts`:

```typescript
// Add imports
import {
  CompletionItem,
  InsertTextFormat,
} from "vscode-languageserver/node";
import { getCompletions } from "./completionProvider.js";
import { tokenize } from "./tokenizer.js";
import { parse } from "./parser.js"; // already imported

// Modify onInitialize to add completion capability
connection.onInitialize(() => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Full,
    completionProvider: {
      resolveProvider: false,
    },
  },
}));

// Add onCompletion handler
connection.onCompletion((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];

  const text = doc.getText();
  const fileName = path.basename(new URL(params.textDocument.uri).pathname);
  const { file } = parse(text);
  const tokens = tokenize(text);

  return getCompletions(file, tokens, params.position, fileName);
});
```

**Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS.

**Step 5: Build check**

Run: `npx tsc -p tsconfig.server.json && npx tsc -p tsconfig.client.json`
Expected: No errors.

**Step 6: Commit**

```bash
git add src/server/server.ts test/integration.test.ts
git commit -m "✨ LSP server に onCompletion ハンドラを統合"
```

---

### Task 6: ビルド確認 + 全テスト + 最終コミット

**Step 1: Full build**

Run: `npx tsc -p tsconfig.server.json && npx tsc -p tsconfig.client.json`
Expected: No errors.

**Step 2: Full test suite**

Run: `npx vitest run --reporter verbose`
Expected: All tests PASS.

**Step 3: Verify test count increased**

Expected: 261 (existing) + ~20 (new completion tests) + ~2 (parser tests) + ~4 (schemaUtils tests) = ~287+ tests.
