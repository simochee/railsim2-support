# DefineSwitch 補完 & バリデーション実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** DefineSwitch の定義と If/ApplySwitch での参照をクロスリファレンスし、スイッチ名補完・Case 値補完・未定義スイッチ警告を提供する。

**Architecture:** AST に最小限の range フィールドを追加し、独立した switchSymbols モジュールでシンボルテーブルを構築。補完プロバイダーとバリデーターの両方がこのテーブルを参照する。ParseCache に統合してパフォーマンスを担保。

**Tech Stack:** TypeScript, vscode-languageserver, vitest

---

### Task 1: AST 型に switchNameRange / valuesRange を追加

**Files:**
- Modify: `packages/language-server/src/shared/ast.ts:38-53`

**Step 1: ast.ts に range フィールドを追加**

`ApplySwitchNode` に `switchNameRange` を、`CaseNode` に `valuesRange` を追加する:

```ts
export type ApplySwitchNode = {
  type: "applySwitch";
  switchName: ExprNode;
  switchNameRange: Range;  // NEW
  cases: CaseNode[];
  default_?: BodyNode[];
  defaultRange?: Range;
  range: Range;
};

export type CaseNode = {
  type: "case";
  values: ExprNode[];
  valuesRange: Range;  // NEW
  body: BodyNode[];
  bodyRange: Range;
  range: Range;
};
```

**Step 2: parser.ts で range を生成**

Modify: `packages/language-server/src/server/parser.ts`

`parseApplySwitch()` (line 719) で `switchName` をパースした直後に `switchNameRange` を設定:

```ts
function parseApplySwitch(): ApplySwitchNode {
    const asToken = advance();
    const startPos = posOf(asToken);
    const switchName = parseExpr();
    const switchNameRange = switchName.range;  // NEW
    // ... rest unchanged ...
    return {
      type: "applySwitch",
      switchName,
      switchNameRange,  // NEW
      cases,
      default_,
      defaultRange,
      range: rangeSpan(startPos, endPos),
    };
}
```

`parseCase()` (line 763) で values パース後に `valuesRange` を設定:

```ts
function parseCase(): CaseNode {
    const caseToken = advance();
    const startPos = posOf(caseToken);
    const values: ExprNode[] = [];
    values.push(parseExpr());
    while (check("comma")) {
      advance();
      values.push(parseExpr());
    }
    // NEW: valuesRange spans from first value start to last value end
    const valuesRange = rangeSpan(
      values[0].range.start,
      values[values.length - 1].range.end,
    );
    const colonToken = expect("colon", "Expected ':'");
    // ... rest unchanged ...
    return {
      type: "case",
      values,
      valuesRange,  // NEW
      body,
      bodyRange: rangeSpan(bodyStart, bodyEnd),
      range: rangeSpan(startPos, endPos),
    };
}
```

**Step 3: パーサーテストを追加**

Modify: `packages/language-server/test/parser.test.ts`

```ts
it("should set switchNameRange on ApplySwitchNode", () => {
  const { file } = parse('ApplySwitch "_FRONT" {\n  Case 0:\n  Default:\n}');
  const as = file.body[0] as ApplySwitchNode;
  expect(as.switchNameRange).toEqual(as.switchName.range);
});

it("should set valuesRange on CaseNode", () => {
  const { file } = parse('ApplySwitch "_FRONT" {\n  Case 0, 1:\n  Default:\n}');
  const as = file.body[0] as ApplySwitchNode;
  const c = as.cases[0];
  expect(c.valuesRange.start).toEqual(c.values[0].range.start);
  expect(c.valuesRange.end).toEqual(c.values[c.values.length - 1].range.end);
});
```

**Step 4: テストを実行して pass を確認**

Run: `cd packages/language-server && npx vitest run test/parser.test.ts`
Expected: ALL PASS

**Step 5: フォーマッターの型エラーを修正（必要な場合）**

`formatter.ts` が `ApplySwitchNode` / `CaseNode` を構築している場合、新しいフィールドを追加する。grep で確認:

Run: `grep -n "type.*applySwitch\|type.*case" packages/language-server/src/server/formatter.ts`

もし構築箇所があれば、適切な range を追加する。

**Step 6: コミット**

```
git add packages/language-server/src/shared/ast.ts packages/language-server/src/server/parser.ts packages/language-server/test/parser.test.ts
git commit -m "feat(language-server): add switchNameRange/valuesRange to AST"
```

---

### Task 2: switchSymbols モジュールを実装

**Files:**
- Create: `packages/language-server/src/server/switchSymbols.ts`
- Create: `packages/language-server/test/switchSymbols.test.ts`

**Step 1: テストを先に書く**

```ts
// test/switchSymbols.test.ts
import { describe, it, expect } from "vitest";
import { parse } from "../src/server/parser.js";
import { buildSwitchIndex, getReferencedSwitch, SYSTEM_SWITCHES } from "../src/server/switchSymbols.js";

describe("buildSwitchIndex", () => {
  it("should collect DefineSwitch definitions", () => {
    const { file } = parse(`
DefineSwitch "ライト" {
  GroupCommon = "ライト";
  Entry = "点灯";
  Entry = "消灯";
}
Body { }
    `);
    const index = buildSwitchIndex(file);
    expect(index.definitions.size).toBe(1);
    const sw = index.definitions.get("ライト")!;
    expect(sw.name).toBe("ライト");
    expect(sw.entries).toEqual([
      { label: "点灯", index: 0 },
      { label: "消灯", index: 1 },
    ]);
  });

  it("should collect multiple DefineSwitch definitions", () => {
    const { file } = parse(`
DefineSwitch "ライト" {
  Entry = "点灯";
  Entry = "消灯";
}
DefineSwitch "サウンド" {
  Entry = "ON";
  Entry = "OFF";
}
Body { }
    `);
    const index = buildSwitchIndex(file);
    expect(index.definitions.size).toBe(2);
    expect(index.definitions.has("ライト")).toBe(true);
    expect(index.definitions.has("サウンド")).toBe(true);
  });

  it("should detect duplicate DefineSwitch names", () => {
    const { file } = parse(`
DefineSwitch "ライト" {
  Entry = "点灯";
}
DefineSwitch "ライト" {
  Entry = "ON";
}
Body { }
    `);
    const index = buildSwitchIndex(file);
    expect(index.definitions.size).toBe(1);
    expect(index.duplicates.get("ライト")).toHaveLength(2);
  });

  it("should handle DefineSwitch with no entries", () => {
    const { file } = parse(`
DefineSwitch "空スイッチ" {
  GroupCommon = "テスト";
}
Body { }
    `);
    const index = buildSwitchIndex(file);
    const sw = index.definitions.get("空スイッチ")!;
    expect(sw.entries).toEqual([]);
  });

  it("should handle empty file", () => {
    const { file } = parse("");
    const index = buildSwitchIndex(file);
    expect(index.definitions.size).toBe(0);
    expect(index.duplicates.size).toBe(0);
  });
});

describe("getReferencedSwitch", () => {
  it("should extract switch name from string literal", () => {
    const { file } = parse('If "ライト" == 0 { }');
    const ifNode = file.body[0] as any;
    expect(getReferencedSwitch(ifNode.condition)).toBe("ライト");
  });

  it("should extract switch name from binary == expression", () => {
    const { file } = parse('If "ライト" == 1 { }');
    const ifNode = file.body[0] as any;
    expect(getReferencedSwitch(ifNode.condition)).toBe("ライト");
  });

  it("should extract switch name from != expression", () => {
    const { file } = parse('If "ライト" != 0 { }');
    const ifNode = file.body[0] as any;
    expect(getReferencedSwitch(ifNode.condition)).toBe("ライト");
  });

  it("should extract from comparison operators (>, <, >=, <=)", () => {
    const { file } = parse('If "_VELOCITY" > 0 { }');
    const ifNode = file.body[0] as any;
    expect(getReferencedSwitch(ifNode.condition)).toBe("_VELOCITY");
  });

  it("should return null for complex expressions", () => {
    const { file } = parse('If "A" == 0 && "B" == 1 { }');
    const ifNode = file.body[0] as any;
    expect(getReferencedSwitch(ifNode.condition)).toBeNull();
  });

  it("should return null for number literals", () => {
    const { file } = parse("If 1 { }");
    const ifNode = file.body[0] as any;
    expect(getReferencedSwitch(ifNode.condition)).toBeNull();
  });
});

describe("SYSTEM_SWITCHES", () => {
  it("should contain 25 system switches", () => {
    expect(SYSTEM_SWITCHES.size).toBe(25);
  });

  it("should contain known switches", () => {
    expect(SYSTEM_SWITCHES.has("_FRONT")).toBe(true);
    expect(SYSTEM_SWITCHES.has("_NIGHT")).toBe(true);
    expect(SYSTEM_SWITCHES.has("_VELOCITY")).toBe(true);
  });
});
```

**Step 2: テストが fail することを確認**

Run: `cd packages/language-server && npx vitest run test/switchSymbols.test.ts`
Expected: FAIL (module not found)

**Step 3: switchSymbols.ts を実装**

```ts
// src/server/switchSymbols.ts
import type { Range } from "../shared/tokens.js";
import type { FileNode, ExprNode, TopLevelNode, BodyNode } from "../shared/ast.js";

export interface SwitchEntry {
  label: string;
  index: number;
}

export interface SwitchDefinition {
  name: string;
  entries: SwitchEntry[];
  switchNameRange: Range;
  range: Range;
}

export interface SwitchIndex {
  definitions: Map<string, SwitchDefinition>;
  duplicates: Map<string, SwitchDefinition[]>;
}

export const SYSTEM_SWITCHES: ReadonlySet<string> = new Set([
  "_FRONT", "_CONNECT1", "_CONNECT2", "_DOOR1", "_DOOR2",
  "_SERIAL", "_CAMDIST", "_VELOCITY", "_ACCEL", "_CABINVIEW",
  "_APPROACH1", "_APPROACH2", "_STOPPING",
  "_NIGHT", "_WEATHER", "_SEASON", "_SHADOW", "_ENVMAP",
  "_YEAR", "_MONTH", "_DAY", "_DAYOFWEEK",
  "_HOUR", "_MINUTE", "_SECOND",
]);

export function buildSwitchIndex(file: FileNode): SwitchIndex {
  const definitions = new Map<string, SwitchDefinition>();
  const duplicates = new Map<string, SwitchDefinition[]>();

  function visit(nodes: (TopLevelNode | BodyNode)[]): void {
    for (const node of nodes) {
      if (node.type === "object" && node.name === "DefineSwitch") {
        const nameArg = node.args[0];
        if (!nameArg || nameArg.type !== "string") continue;

        const entries: SwitchEntry[] = [];
        for (const child of node.body) {
          if (child.type === "property" && child.name === "Entry") {
            const val = child.values[0];
            if (val && val.type === "string") {
              entries.push({ label: val.value, index: entries.length });
            }
          }
        }

        const def: SwitchDefinition = {
          name: nameArg.value,
          entries,
          switchNameRange: nameArg.range,
          range: node.range,
        };

        if (definitions.has(nameArg.value)) {
          const existing = duplicates.get(nameArg.value);
          if (existing) {
            existing.push(def);
          } else {
            duplicates.set(nameArg.value, [definitions.get(nameArg.value)!, def]);
          }
        } else {
          definitions.set(nameArg.value, def);
        }
      } else if (node.type === "object") {
        visit(node.body);
      } else if (node.type === "if") {
        visit(node.then);
        if (node.else_) visit(node.else_);
      } else if (node.type === "applySwitch") {
        for (const c of node.cases) visit(c.body);
        if (node.default_) visit(node.default_);
      }
    }
  }

  visit(file.body);
  return { definitions, duplicates };
}

/** comparison operators where left side is typically a switch name */
const COMPARISON_OPS = new Set(["==", "!=", "<", ">", "<=", ">="]);

export function getReferencedSwitch(expr: ExprNode): string | null {
  // Pattern 1: string literal alone — "SwitchName"
  if (expr.type === "string") return expr.value;

  // Pattern 2: "SwitchName" op N — binary with string on left
  if (expr.type === "binary" && COMPARISON_OPS.has(expr.op)) {
    if (expr.left.type === "string") return expr.left.value;
  }

  return null;
}
```

**Step 4: テストを実行して pass を確認**

Run: `cd packages/language-server && npx vitest run test/switchSymbols.test.ts`
Expected: ALL PASS

**Step 5: コミット**

```
git add packages/language-server/src/server/switchSymbols.ts packages/language-server/test/switchSymbols.test.ts
git commit -m "feat(language-server): add switchSymbols module for DefineSwitch indexing"
```

---

### Task 3: switchValidator を実装

**Files:**
- Create: `packages/language-server/src/server/validator/switchValidator.ts`
- Create: `packages/language-server/test/switchValidator.test.ts`

**Step 1: テストを先に書く**

```ts
// test/switchValidator.test.ts
import { describe, it, expect } from "vitest";
import { parse } from "../src/server/parser.js";
import { buildSwitchIndex } from "../src/server/switchSymbols.js";
import { validateSwitches } from "../src/server/validator/switchValidator.js";

describe("validateSwitches", () => {
  it("should not warn for defined switches", () => {
    const { file } = parse(`
DefineSwitch "ライト" {
  Entry = "点灯";
  Entry = "消灯";
}
Body {
  If "ライト" == 0 { }
}
    `);
    const index = buildSwitchIndex(file);
    const diags = validateSwitches(file, index);
    expect(diags).toHaveLength(0);
  });

  it("should not warn for system switches", () => {
    const { file } = parse(`
Body {
  If "_FRONT" == 1 { }
  If "_NIGHT" == 0 { }
}
    `);
    const index = buildSwitchIndex(file);
    const diags = validateSwitches(file, index);
    expect(diags).toHaveLength(0);
  });

  it("should warn for undefined switches in If", () => {
    const { file } = parse(`
Body {
  If "未定義" == 0 { }
}
    `);
    const index = buildSwitchIndex(file);
    const diags = validateSwitches(file, index);
    expect(diags).toHaveLength(1);
    expect(diags[0].severity).toBe("warning");
    expect(diags[0].message).toContain("未定義");
  });

  it("should warn for undefined switches in ApplySwitch", () => {
    const { file } = parse(`
Body {
  ApplySwitch "未定義" {
    Case 0:
    Default:
  }
}
    `);
    const index = buildSwitchIndex(file);
    const diags = validateSwitches(file, index);
    expect(diags).toHaveLength(1);
    expect(diags[0].severity).toBe("warning");
    expect(diags[0].message).toContain("未定義");
  });

  it("should warn for duplicate DefineSwitch", () => {
    const { file } = parse(`
DefineSwitch "ライト" {
  Entry = "点灯";
}
DefineSwitch "ライト" {
  Entry = "ON";
}
Body { }
    `);
    const index = buildSwitchIndex(file);
    const diags = validateSwitches(file, index);
    expect(diags.length).toBeGreaterThanOrEqual(1);
    expect(diags.some(d => d.message.includes("ライト"))).toBe(true);
  });

  it("should not warn when string is used in non-switch context", () => {
    const { file } = parse(`
Body {
  If "ライト" == 0 && "サウンド" == 1 { }
}
    `);
    const index = buildSwitchIndex(file);
    const diags = validateSwitches(file, index);
    // Complex expression — getReferencedSwitch returns null, so no warning
    expect(diags).toHaveLength(0);
  });
});
```

**Step 2: テストが fail することを確認**

Run: `cd packages/language-server && npx vitest run test/switchValidator.test.ts`
Expected: FAIL

**Step 3: switchValidator.ts を実装**

```ts
// src/server/validator/switchValidator.ts
import type { FileNode, TopLevelNode, BodyNode, IfNode, ApplySwitchNode } from "../../shared/ast.js";
import type { Diagnostic } from "../../shared/diagnostics.js";
import { type SwitchIndex, getReferencedSwitch, SYSTEM_SWITCHES } from "../switchSymbols.js";

export function validateSwitches(file: FileNode, switchIndex: SwitchIndex): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Report duplicate definitions
  for (const [name, defs] of switchIndex.duplicates) {
    for (const def of defs) {
      diagnostics.push({
        message: `スイッチ「${name}」が重複して定義されています`,
        range: def.switchNameRange,
        severity: "warning",
      });
    }
  }

  // Walk AST to find switch references
  function visit(nodes: (TopLevelNode | BodyNode)[]): void {
    for (const node of nodes) {
      switch (node.type) {
        case "object":
          visit(node.body);
          break;
        case "if":
          checkIfSwitch(node);
          visit(node.then);
          if (node.else_) visit(node.else_);
          break;
        case "applySwitch":
          checkApplySwitchRef(node);
          for (const c of node.cases) visit(c.body);
          if (node.default_) visit(node.default_);
          break;
      }
    }
  }

  function checkIfSwitch(node: IfNode): void {
    const name = getReferencedSwitch(node.condition);
    if (name === null) return;
    warnIfUndefined(name, node.condition);
  }

  function checkApplySwitchRef(node: ApplySwitchNode): void {
    const name = getReferencedSwitch(node.switchName);
    if (name === null) return;
    warnIfUndefined(name, node.switchName);
  }

  function warnIfUndefined(name: string, expr: { range: { start: any; end: any } }): void {
    if (switchIndex.definitions.has(name)) return;
    if (SYSTEM_SWITCHES.has(name)) return;
    // For binary expressions, point to the string literal (left side)
    const range = "left" in expr && (expr as any).left?.type === "string"
      ? (expr as any).left.range
      : expr.range;
    diagnostics.push({
      message: `未定義のスイッチ「${name}」が参照されています`,
      range,
      severity: "warning",
    });
  }

  visit(file.body);
  return diagnostics;
}
```

**Step 4: テストを実行して pass を確認**

Run: `cd packages/language-server && npx vitest run test/switchValidator.test.ts`
Expected: ALL PASS

**Step 5: コミット**

```
git add packages/language-server/src/server/validator/switchValidator.ts packages/language-server/test/switchValidator.test.ts
git commit -m "feat(language-server): add switchValidator for undefined/duplicate switch warnings"
```

---

### Task 4: completionProvider にスイッチ補完を追加

**Files:**
- Modify: `packages/language-server/src/server/completionProvider.ts`
- Modify: `packages/language-server/test/completionProvider.test.ts`

**Step 1: テストを先に書く**

`test/completionProvider.test.ts` に追加:

```ts
describe("switch completions", () => {
  it("should suggest defined switches in ApplySwitch position", () => {
    const src = 'DefineSwitch "ライト" {\n  Entry = "点灯";\n  Entry = "消灯";\n}\nBody {\n  ApplySwitch "" {\n    Default:\n  }\n}';
    const { file } = parse(src);
    const tokens = tokenize(src);
    const index = buildSwitchIndex(file);
    // Position inside the "" after ApplySwitch
    const pos = { line: 5, character: 15 };
    const items = getCompletions(file, tokens, pos, "test.txt", index);
    expect(items.some(i => i.label === "ライト")).toBe(true);
  });

  it("should suggest system switches in If position", () => {
    const src = 'Body {\n  If "" == 0 {\n  }\n}';
    const { file } = parse(src);
    const tokens = tokenize(src);
    const index = buildSwitchIndex(file);
    const pos = { line: 1, character: 6 };
    const items = getCompletions(file, tokens, pos, "test.txt", index);
    expect(items.some(i => i.label === "_FRONT")).toBe(true);
    expect(items.some(i => i.label === "_NIGHT")).toBe(true);
  });

  it("should suggest case values with entry labels", () => {
    const src = 'DefineSwitch "ライト" {\n  Entry = "点灯";\n  Entry = "消灯";\n}\nBody {\n  ApplySwitch "ライト" {\n    Case :\n    Default:\n  }\n}';
    const { file } = parse(src);
    const tokens = tokenize(src);
    const index = buildSwitchIndex(file);
    // Position after "Case " before ":"
    const pos = { line: 6, character: 9 };
    const items = getCompletions(file, tokens, pos, "test.txt", index);
    expect(items.some(i => i.label === "0" && i.detail === "点灯")).toBe(true);
    expect(items.some(i => i.label === "1" && i.detail === "消灯")).toBe(true);
  });
});
```

**Step 2: テストが fail することを確認**

Run: `cd packages/language-server && npx vitest run test/completionProvider.test.ts`
Expected: FAIL

**Step 3: completionProvider.ts を修正**

主な変更点:
1. `CompletionContext` に `switchRef` / `caseValue` を追加
2. `getCompletions` のシグネチャに `switchIndex` パラメータ追加
3. `findContext` で文字列 suppress の前にスイッチ文脈を判定
4. `buildSwitchRefCompletions` / `buildCaseValueCompletions` を追加

`getCompletions` のシグネチャ変更:

```ts
export function getCompletions(
  file: FileNode,
  tokens: Token[],
  position: Position,
  fileName?: string,
  switchIndex?: SwitchIndex,
): CompletionItem[]
```

新しいコンテキスト型:

```ts
export type CompletionContext =
  | { type: "root"; fileName?: string }
  | { type: "objectBody"; objectName: string; schemaKey: string; parentChain: string[]; body: BodyNode[] }
  | { type: "switchRef"; switchIndex: SwitchIndex }
  | { type: "caseValue"; switchName: string; switchIndex: SwitchIndex }
  | { type: "none" };
```

スイッチ文脈判定ロジック (findContext 内、文字列 suppress の前に):
- トークン列を見て、直前に `ApplySwitch` or `If` があり、カーソルが文字列トークン内にいる → `switchRef`
- `Case` キーワードの後で `:` の前にいる → `caseValue`（enclosing ApplySwitch から switchName を取得）

**Step 4: テストを実行して pass を確認**

Run: `cd packages/language-server && npx vitest run test/completionProvider.test.ts`
Expected: ALL PASS

**Step 5: コミット**

```
git add packages/language-server/src/server/completionProvider.ts packages/language-server/test/completionProvider.test.ts
git commit -m "feat(language-server): add switch name and case value completions"
```

---

### Task 5: server.ts に統合

**Files:**
- Modify: `packages/language-server/src/server/server.ts`
- Modify: `packages/language-server/test/integration.test.ts`

**Step 1: integration テストを追加**

`test/integration.test.ts` に追加:

```ts
it("should warn on undefined switch reference", () => {
  const diags = validateTextDocument(`
Body {
  If "存在しない" == 0 { }
}
  `);
  expect(diags.some(d => d.message.includes("存在しない") && d.severity === "warning")).toBe(true);
});

it("should not warn on defined switch reference", () => {
  const diags = validateTextDocument(`
DefineSwitch "ライト" {
  Entry = "点灯";
}
Body {
  If "ライト" == 0 { }
}
  `);
  expect(diags.some(d => d.message.includes("ライト") && d.severity === "warning")).toBe(false);
});

it("should not warn on system switch reference", () => {
  const diags = validateTextDocument(`
Body {
  If "_FRONT" == 1 { }
  ApplySwitch "_NIGHT" {
    Case 0:
    Default:
  }
}
  `);
  expect(diags.some(d => d.message.includes("_FRONT"))).toBe(false);
  expect(diags.some(d => d.message.includes("_NIGHT"))).toBe(false);
});
```

**Step 2: server.ts を修正**

import 追加:

```ts
import { buildSwitchIndex } from "./switchSymbols.js";
import { validateSwitches } from "./validator/switchValidator.js";
import type { SwitchIndex } from "./switchSymbols.js";
```

ParseCache に switchIndex を追加:

```ts
interface ParseCache {
  version: number;
  file: FileNode;
  tokens: Token[];
  diagnostics: Diagnostic[];
  switchIndex: SwitchIndex;
}
```

`getOrParse` 内で buildSwitchIndex を呼び出し、validateSwitches を diagnostics に追加:

```ts
function getOrParse(doc: TextDocument): ParseCache {
    // ...existing parse/validate code...
    const switchIndex = buildSwitchIndex(file);
    const switchDiags = validateSwitches(file, switchIndex);

    const entry: ParseCache = {
      version: doc.version,
      file,
      tokens,
      diagnostics: [...parseDiags, ...keywordDiags, ...schemaDiags, ...switchDiags],
      switchIndex,
    };
    // ...
}
```

`onCompletion` で switchIndex を渡す:

```ts
connection.onCompletion((params) => {
    // ...
    const cached = getOrParse(doc);
    return getCompletions(cached.file, cached.tokens, params.position, fileName, cached.switchIndex);
});
```

`validateTextDocument` ヘルパーも更新:

```ts
export function validateTextDocument(text: string, fileName?: string): Diagnostic[] {
  const { file, diagnostics: parseDiags } = parse(text);
  const keywordDiags = validateUnknownKeywords(file);
  const schemaDiags = validateSchema(file, fileName);
  const switchIndex = buildSwitchIndex(file);
  const switchDiags = validateSwitches(file, switchIndex);
  return [...parseDiags, ...keywordDiags, ...schemaDiags, ...switchDiags];
}
```

**Step 3: 全テストを実行**

Run: `cd packages/language-server && npx vitest run`
Expected: ALL PASS

**Step 4: コミット**

```
git add packages/language-server/src/server/server.ts packages/language-server/test/integration.test.ts
git commit -m "feat(language-server): integrate switch validation and completion into server"
```

---

### Task 6: 全体テスト & 動作確認

**Step 1: 全テストスイート実行**

Run: `cd packages/language-server && npx vitest run`
Expected: ALL PASS, no regressions

**Step 2: ビルド確認**

Run: `cd packages/language-server && npx tsc --noEmit`
Expected: No type errors

**Step 3: コミット（必要な場合のみ、修正があれば）**

```
git commit -m "fix(language-server): address test/type issues from switch feature"
```
