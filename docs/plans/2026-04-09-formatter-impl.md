# Formatter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** RailSim2 プラグイン定義ファイル用フォーマッターを Language Server に追加する

**Architecture:** 既存パーサーの AST を拡張（CommentNode に value/kind、各ノードに bodyRange）し、distributeComments() でコメントを正しい body に配置。formatter.ts は AST + 元ソース行列から整形済みテキストを生成する純粋関数。LSP の documentFormattingProvider として統合。

**Tech Stack:** TypeScript, vscode-languageserver, vitest

**Design doc:** `docs/plans/2026-04-09-formatter-design.md`

---

### Task 1: endOf() の multi-line 対応

**Files:**
- Modify: `packages/language-server/src/server/parser.ts:78-82`
- Test: `packages/language-server/test/parser.test.ts`

**Step 1: Write the failing test**

`packages/language-server/test/parser.test.ts` の末尾に追加:

```typescript
it("should compute correct range.end for multi-line block comment", () => {
  const { file } = parse("/* line1\nline2\nline3 */ Body { }");
  const comment = file.body.find((n) => n.type === "comment");
  expect(comment).toBeDefined();
  // "/* line1\nline2\nline3 */" ends at line 2, character 8 ("line3 */".length)
  expect(comment!.range.end.line).toBe(2);
  expect(comment!.range.end.character).toBe(8);
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/language-server && pnpm test -- --reporter verbose -t "multi-line block comment"`
Expected: FAIL — range.end.line will be 0 (single-line assumption)

**Step 3: Write minimal implementation**

In `packages/language-server/src/server/parser.ts`, replace lines 78-82:

```typescript
function endOf(token: Token): Position {
  const nl = token.value.indexOf("\n");
  if (nl === -1) {
    return { line: token.line, character: token.character + token.length };
  }
  let lastNl = token.value.lastIndexOf("\n");
  return {
    line: token.line + token.value.split("\n").length - 1,
    character: token.value.length - lastNl - 1,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/language-server && pnpm test -- --reporter verbose`
Expected: ALL PASS (existing + new)

**Step 5: Commit**

```
feat: endOf() を multi-line トークン対応にする
```

---

### Task 2: AST 型の拡張

**Files:**
- Modify: `packages/language-server/src/shared/ast.ts`

**Step 1: Update CommentNode**

Replace the CommentNode type:

```typescript
export type CommentNode = {
  type: "comment";
  value: string;
  kind: "line" | "block";
  range: Range;
};
```

**Step 2: Add bodyRange to ObjectNode**

```typescript
export type ObjectNode = {
  type: "object";
  name: string;
  args: ExprNode[];
  body: BodyNode[];
  range: Range;
  nameRange: Range;
  bodyRange: Range;
};
```

**Step 3: Add thenRange/elseRange to IfNode**

```typescript
export type IfNode = {
  type: "if";
  condition: ExprNode;
  then: BodyNode[];
  thenRange: Range;
  else_?: BodyNode[];
  elseRange?: Range;
  range: Range;
};
```

**Step 4: Add bodyRange to CaseNode**

```typescript
export type CaseNode = {
  type: "case";
  values: ExprNode[];
  body: BodyNode[];
  bodyRange: Range;
  range: Range;
};
```

**Step 5: Add defaultRange to ApplySwitchNode**

```typescript
export type ApplySwitchNode = {
  type: "applySwitch";
  switchName: ExprNode;
  cases: CaseNode[];
  default_?: BodyNode[];
  defaultRange?: Range;
  range: Range;
};
```

**Step 6: Run type check (will fail — parser not updated yet, that's expected)**

Run: `cd packages/language-server && npx tsc --noEmit 2>&1 | head -30`
Expected: Type errors in parser.ts (missing bodyRange etc.) — confirms types are applied

Do NOT commit yet — Task 3 will fix the type errors.

---

### Task 3: Parser — bodyRange の記録と FileNode.range の修正

**Files:**
- Modify: `packages/language-server/src/server/parser.ts`
- Test: `packages/language-server/test/parser.test.ts`

**Step 1: Write failing tests for bodyRange**

`packages/language-server/test/parser.test.ts` に追加:

```typescript
it("should have bodyRange for ObjectNode (content area inside braces)", () => {
  const { file, diagnostics } = parse("Body { Coord = 1; }");
  expect(diagnostics).toHaveLength(0);
  const obj = file.body[0] as ObjectNode;
  // bodyRange: after '{' (char 5+1=6) to before '}' (char 18)
  expect(obj.bodyRange).toBeDefined();
  expect(obj.bodyRange.start.character).toBe(6);
  expect(obj.bodyRange.end.character).toBe(18);
});

it("should have thenRange and elseRange for IfNode", () => {
  const { file, diagnostics } = parse("Body { If 1 { Coord = 0; } Else { Coord = 1; } }");
  expect(diagnostics).toHaveLength(0);
  const body = file.body[0] as ObjectNode;
  const ifNode = body.body[0] as IfNode;
  expect(ifNode.thenRange).toBeDefined();
  expect(ifNode.elseRange).toBeDefined();
});

it("should have bodyRange for CaseNode", () => {
  const { file, diagnostics } = parse('ApplySwitch "_X" { Case 0: Coord = 10; Default: Coord = 20; }');
  expect(diagnostics).toHaveLength(0);
  const sw = file.body[0] as ApplySwitchNode;
  expect(sw.cases[0].bodyRange).toBeDefined();
  expect(sw.defaultRange).toBeDefined();
});
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/language-server && pnpm test -- --reporter verbose`
Expected: FAIL — type errors or missing properties

**Step 3: Update parseObject()**

In `parser.ts`, `parseObject()` function — capture lbrace/rbrace tokens:

```typescript
function parseObject(): ObjectNode {
  const nameToken = advance();
  const startPos = posOf(nameToken);
  const nameRange = rangeOf(nameToken);
  const name = nameToken.value;

  const args: ExprNode[] = [];
  while (!check("lbrace") && !check("eof")) {
    const t = peek();
    if (t.type === "string" || t.type === "number" || t.type === "identifier" || t.type === "color") {
      args.push(parsePrimary());
    } else {
      break;
    }
  }

  const openBrace = expect("lbrace", "Expected '{'");
  const body = parseBody();
  const closeBrace = expect("rbrace", "Expected '}'");
  const endPos = closeBrace.length > 0 ? endOf(closeBrace) : endOf(tokens[tokens.length - 1]);

  return {
    type: "object",
    name,
    args,
    body,
    range: rangeSpan(startPos, endPos),
    nameRange,
    bodyRange: rangeSpan(endOf(openBrace), posOf(closeBrace)),
  };
}
```

**Step 4: Update parseIf()**

```typescript
function parseIf(): IfNode {
  const ifToken = advance();
  const startPos = posOf(ifToken);
  const condition = parseExpr();

  const thenOpen = expect("lbrace", "Expected '{'");
  const thenBody = parseBody();
  let lastBrace = expect("rbrace", "Expected '}'");
  const thenRange = rangeSpan(endOf(thenOpen), posOf(lastBrace));

  let elseBody: BodyNode[] | undefined;
  let elseRange: Range | undefined;

  if (checkValue("identifier", "Else")) {
    advance();
    const elseOpen = expect("lbrace", "Expected '{'");
    elseBody = parseBody();
    lastBrace = expect("rbrace", "Expected '}'");
    elseRange = rangeSpan(endOf(elseOpen), posOf(lastBrace));
  }

  const endPos = lastBrace.length > 0 ? endOf(lastBrace) : endOf(tokens[tokens.length - 1]);

  return {
    type: "if",
    condition,
    then: thenBody,
    thenRange,
    else_: elseBody,
    elseRange,
    range: rangeSpan(startPos, endPos),
  };
}
```

**Step 5: Update parseApplySwitch() and parseCase()**

`parseCase()`:
```typescript
function parseCase(): CaseNode {
  const caseToken = advance();
  const startPos = posOf(caseToken);

  const values: ExprNode[] = [];
  values.push(parseExpr());
  while (check("comma")) {
    advance();
    values.push(parseExpr());
  }

  const colonToken = expect("colon", "Expected ':'");
  const bodyStart = endOf(colonToken);

  const body = parseBody(true);
  const bodyEnd = body.length > 0
    ? body[body.length - 1].range.end
    : bodyStart;
  const endPos = body.length > 0 ? body[body.length - 1].range.end : endOf(tokens[pos - 1] ?? caseToken);

  return {
    type: "case",
    values,
    body,
    bodyRange: rangeSpan(bodyStart, bodyEnd),
    range: rangeSpan(startPos, endPos),
  };
}
```

`parseApplySwitch()` — capture Default colon position:
```typescript
function parseApplySwitch(): ApplySwitchNode {
  const asToken = advance();
  const startPos = posOf(asToken);
  const switchName = parseExpr();

  expect("lbrace", "Expected '{'");

  const cases: CaseNode[] = [];
  let default_: BodyNode[] | undefined;
  let defaultRange: Range | undefined;

  while (!check("rbrace") && !check("eof")) {
    if (checkValue("identifier", "Case")) {
      cases.push(parseCase());
    } else if (checkValue("identifier", "Default")) {
      advance();
      const colonToken = expect("colon", "Expected ':'");
      const bodyStart = endOf(colonToken);
      default_ = parseBody(true);
      const bodyEnd = default_.length > 0
        ? default_[default_.length - 1].range.end
        : bodyStart;
      defaultRange = rangeSpan(bodyStart, bodyEnd);
    } else {
      addError(`Expected 'Case' or 'Default' in ApplySwitch`, rangeOf(peek()));
      const before = pos;
      synchronize();
      if (pos === before) advance();
    }
  }

  const closeBraceAS = expect("rbrace", "Expected '}'");
  const endPos = closeBraceAS.length > 0 ? endOf(closeBraceAS) : endOf(tokens[tokens.length - 1]);

  return {
    type: "applySwitch",
    switchName,
    cases,
    default_,
    defaultRange,
    range: rangeSpan(startPos, endPos),
  };
}
```

**Step 6: Fix FileNode.range to cover entire source**

In `parseFile()`, change the startPos/endPos to always use source-based positions:

```typescript
function parseFile(): FileNode {
  const body: TopLevelNode[] = [];

  while (!check("eof")) {
    const node = parseTopLevel();
    if (node) {
      body.push(node);
    }
  }

  // distributeComments will handle comment placement — remove old logic
  // (old L285-293 deleted)

  const eofToken = tokens[pos]; // the EOF token
  const fileEnd: Position = { line: eofToken.line, character: eofToken.character };

  return {
    type: "file",
    body,
    range: rangeSpan({ line: 0, character: 0 }, fileEnd),
  };
}
```

**Step 7: Run tests**

Run: `cd packages/language-server && pnpm test -- --reporter verbose`
Expected: Some existing comment tests may fail (comment placement removed). New bodyRange tests should PASS.

**Step 8: Commit**

```
feat: AST に bodyRange/thenRange/elseRange/defaultRange を追加
```

---

### Task 4: distributeComments() の実装

**Files:**
- Modify: `packages/language-server/src/server/parser.ts`
- Test: `packages/language-server/test/parser.test.ts`

**Step 1: Write failing tests for comment distribution**

```typescript
it("should place comments inside object bodies", () => {
  const { file, diagnostics } = parse("Body {\n  // inner comment\n  Coord = 1;\n}");
  expect(diagnostics).toHaveLength(0);
  const obj = file.body.filter((n) => n.type === "object")[0] as ObjectNode;
  const innerComments = obj.body.filter((n) => n.type === "comment");
  expect(innerComments).toHaveLength(1);
});

it("should place leading comment in file body", () => {
  const { file, diagnostics } = parse("// top comment\nBody { }");
  expect(diagnostics).toHaveLength(0);
  expect(file.body[0].type).toBe("comment");
  expect(file.body[1].type).toBe("object");
});

it("should handle comments-only file", () => {
  const { file } = parse("// only a comment");
  expect(file.body).toHaveLength(1);
  expect(file.body[0].type).toBe("comment");
});

it("should place comment in If then branch", () => {
  const { file } = parse("Body { If 1 {\n  // then comment\n  Coord = 0;\n} }");
  const obj = file.body.filter((n) => n.type === "object")[0] as ObjectNode;
  const ifNode = obj.body.find((n) => n.type === "if") as IfNode;
  const thenComments = ifNode.then.filter((n) => n.type === "comment");
  expect(thenComments).toHaveLength(1);
});

it("should preserve comment value and kind", () => {
  const { file } = parse("// line comment\n/* block comment */\nBody { }");
  const comments = file.body.filter((n) => n.type === "comment") as CommentNode[];
  expect(comments).toHaveLength(2);
  expect(comments[0].value).toBe("// line comment");
  expect(comments[0].kind).toBe("line");
  expect(comments[1].value).toBe("/* block comment */");
  expect(comments[1].kind).toBe("block");
});

it("should place Case boundary comment in case body", () => {
  const { file } = parse('ApplySwitch "_X" { Case 0: // case comment\n Coord = 10; }');
  const sw = file.body.filter((n) => n.type !== "comment")[0] as ApplySwitchNode;
  const caseComments = sw.cases[0].body.filter((n) => n.type === "comment");
  expect(caseComments).toHaveLength(1);
});
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/language-server && pnpm test -- --reporter verbose`
Expected: FAIL

**Step 3: Implement distributeComments()**

Add to `packages/language-server/src/server/parser.ts`, after the `parse()` function or inside it as a local function:

```typescript
interface BodySlot {
  body: (TopLevelNode | BodyNode)[];
  range: Range;
}

function distributeComments(
  file: FileNode,
  commentTokens: Token[],
): void {
  if (commentTokens.length === 0) return;

  // 1. Collect all body slots with their ranges
  const slots: BodySlot[] = [];

  function collectSlots(nodes: (TopLevelNode | BodyNode)[], containerRange: Range): void {
    slots.push({ body: nodes, range: containerRange });
    for (const node of nodes) {
      switch (node.type) {
        case "object":
          collectSlots(node.body, node.bodyRange);
          break;
        case "if":
          collectSlots(node.then, node.thenRange);
          if (node.else_ && node.elseRange) {
            collectSlots(node.else_, node.elseRange);
          }
          break;
        case "applySwitch":
          for (const c of node.cases) {
            collectSlots(c.body, c.bodyRange);
          }
          if (node.default_ && node.defaultRange) {
            collectSlots(node.default_, node.defaultRange);
          }
          break;
      }
    }
  }

  collectSlots(file.body, file.range);

  // 2. For each comment, find the narrowest containing slot
  for (const ct of commentTokens) {
    const commentNode: CommentNode = {
      type: "comment",
      value: ct.value,
      kind: ct.type === "lineComment" ? "line" : "block",
      range: rangeOf(ct),
    };

    let bestSlot: BodySlot | null = null;
    let bestArea = Infinity;

    for (const slot of slots) {
      if (containsPosition(slot.range, commentNode.range.start)) {
        const area = rangeArea(slot.range);
        if (area < bestArea) {
          bestArea = area;
          bestSlot = slot;
        }
      }
    }

    if (bestSlot) {
      bestSlot.body.push(commentNode);
    } else {
      // Fallback: file body (for leading comments before any code)
      file.body.push(commentNode);
    }
  }

  // 3. Sort each body by start position
  for (const slot of slots) {
    slot.body.sort((a, b) => {
      if (a.range.start.line !== b.range.start.line) return a.range.start.line - b.range.start.line;
      return a.range.start.character - b.range.start.character;
    });
  }
}

function containsPosition(range: Range, pos: Position): boolean {
  if (pos.line < range.start.line || pos.line > range.end.line) return false;
  if (pos.line === range.start.line && pos.character < range.start.character) return false;
  if (pos.line === range.end.line && pos.character >= range.end.character) return false;
  return true;
}

function rangeArea(range: Range): number {
  // Approximate area for narrowness comparison
  const lines = range.end.line - range.start.line;
  return lines * 1000 + (range.end.character - range.start.character);
}
```

Then in `parseFile()`, call it before returning:

```typescript
distributeComments(file, commentTokens);
return file;
```

**Step 4: Run all tests**

Run: `cd packages/language-server && pnpm test -- --reporter verbose`
Expected: ALL PASS

**Step 5: Commit**

```
feat: distributeComments() でコメントを正しい body に配置
```

---

### Task 5: Formatter — 基本インデントと構造出力

**Files:**
- Create: `packages/language-server/src/server/formatter.ts`
- Test: `packages/language-server/test/formatter.test.ts`

**Step 1: Write failing tests for basic formatting**

Create `packages/language-server/test/formatter.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { format } from "../src/server/formatter.js";

describe("formatter", () => {
  it("should format a simple object with tab indentation", () => {
    const input = "Body{Coord=1;}";
    const result = format(input);
    expect(result).toBe("Body {\n\tCoord = 1;\n}\n");
  });

  it("should format nested objects", () => {
    const input = 'Body{Object3D "main"{Coord=1;}}';
    const result = format(input);
    expect(result).toBe('Body {\n\tObject3D "main" {\n\t\tCoord = 1;\n\t}\n}\n');
  });

  it("should format If/Else", () => {
    const input = "Body{If 1{Coord=0;}Else{Coord=1;}}";
    const result = format(input);
    expect(result).toBe("Body {\n\tIf 1 {\n\t\tCoord = 0;\n\t} Else {\n\t\tCoord = 1;\n\t}\n}\n");
  });

  it("should format ApplySwitch with Case/Default", () => {
    const input = 'ApplySwitch "_X"{Case 0:Coord=0;Default:Coord=1;}';
    const result = format(input);
    expect(result).toBe(
      'ApplySwitch "_X" {\n\tCase 0:\n\t\tCoord = 0;\n\tDefault:\n\t\tCoord = 1;\n}\n',
    );
  });

  it("should format expressions with spaces around operators", () => {
    const input = "Body{X=1+2*3;}";
    const result = format(input);
    expect(result).toBe("Body {\n\tX = 1 + 2 * 3;\n}\n");
  });

  it("should format comma-separated values", () => {
    const input = "Body{Coord=1.0,2.0,3.0;}";
    const result = format(input);
    expect(result).toBe("Body {\n\tCoord = 1.0, 2.0, 3.0;\n}\n");
  });

  it("should format tuple syntax with parens", () => {
    const input = "Body{Coord=(0.9,0.0);}";
    const result = format(input);
    expect(result).toBe("Body {\n\tCoord = (0.9, 0.0);\n}\n");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/language-server && pnpm test -- --reporter verbose -t "formatter"`
Expected: FAIL — module not found

**Step 3: Implement formatter.ts**

Create `packages/language-server/src/server/formatter.ts`. Implementation walks the AST recursively, emitting formatted text. See design doc for full rules.

Key internal functions:
- `formatFile(file, sourceLines, options)` → string
- `formatBody(nodes, depth, sourceLines, options)` → string
- `formatObject(node, depth, sourceLines, options)` → string
- `formatProperty(node, depth)` → string
- `formatIf(node, depth, sourceLines, options)` → string
- `formatApplySwitch(node, depth, sourceLines, options)` → string
- `formatExpr(expr)` → string
- `alignPropertiesInBody(nodes, depth)` — groups consecutive properties and aligns `=`

**Step 4: Run tests**

Run: `cd packages/language-server && pnpm test -- --reporter verbose -t "formatter"`
Expected: ALL PASS

**Step 5: Commit**

```
feat: formatter 基本実装（インデント・構造出力・式整形）
```

---

### Task 6: Formatter — `=` アラインメントと空行保持

**Files:**
- Modify: `packages/language-server/src/server/formatter.ts`
- Modify: `packages/language-server/test/formatter.test.ts`

**Step 1: Write failing tests**

Add to `formatter.test.ts`:

```typescript
it("should align = in consecutive property groups", () => {
  const input = "Body {\n\tModelFileName = \"body.x\";\n\tModelScale = 1.0;\n\tCoord = 0.0, 0.0, 0.0;\n}\n";
  const result = format(input);
  expect(result).toBe(
    "Body {\n\tModelFileName = \"body.x\";\n\tModelScale    = 1.0;\n\tCoord         = 0.0, 0.0, 0.0;\n}\n",
  );
});

it("should break alignment groups at non-property nodes", () => {
  const input = "Body {\n\tA = 1;\n\tInner { }\n\tB = 2;\n}\n";
  const result = format(input);
  // A and B are in separate groups — no alignment between them
  expect(result).toContain("\tA = 1;");
  expect(result).toContain("\tB = 2;");
});

it("should preserve blank lines from original source", () => {
  const input = "Body {\n\tA = 1;\n\n\tB = 2;\n}\n";
  const result = format(input);
  expect(result).toBe("Body {\n\tA = 1;\n\n\tB = 2;\n}\n");
});

it("should preserve multiple blank lines", () => {
  const input = "Body {\n\tA = 1;\n\n\n\tB = 2;\n}\n";
  const result = format(input);
  expect(result).toBe("Body {\n\tA = 1;\n\n\n\tB = 2;\n}\n");
});
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/language-server && pnpm test -- --reporter verbose -t "formatter"`
Expected: FAIL on alignment and blank line tests

**Step 3: Implement alignment and blank line logic**

Alignment: Group consecutive PropertyNodes in a body, find max name length, pad with spaces.

Blank lines: Between each node output, compute `currentNode.range.start.line - prevNode.range.end.line - 1` blank lines from source. Emit that many `\n`.

**Step 4: Run tests**

Run: `cd packages/language-server && pnpm test -- --reporter verbose -t "formatter"`
Expected: ALL PASS

**Step 5: Commit**

```
feat: formatter に = アラインメントと空行保持を追加
```

---

### Task 7: Formatter — コメント出力

**Files:**
- Modify: `packages/language-server/src/server/formatter.ts`
- Modify: `packages/language-server/test/formatter.test.ts`

**Step 1: Write failing tests**

```typescript
it("should output line comments with correct indentation", () => {
  const input = "// top comment\nBody {\n// inner\nCoord = 1;\n}";
  const result = format(input);
  expect(result).toBe("// top comment\nBody {\n\t// inner\n\tCoord = 1;\n}\n");
});

it("should output block comments", () => {
  const input = "Body {\n/* multi\nline */\nCoord = 1;\n}";
  const result = format(input);
  expect(result).toBe("Body {\n\t/* multi\nline */\n\tCoord = 1;\n}\n");
});

it("should break alignment groups at comments", () => {
  const input = "Body {\nModelFileName = \"a\";\n// divider\nCoord = 1;\n}";
  const result = format(input);
  // Two separate alignment groups
  expect(result).toContain("\tModelFileName = \"a\";");
  expect(result).toContain("\t// divider");
  expect(result).toContain("\tCoord = 1;");
});
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/language-server && pnpm test -- --reporter verbose -t "formatter"`

**Step 3: Implement comment output**

In `formatBody()`, when encountering a CommentNode:
- Output `indent + comment.value + "\n"`
- For block comments, only indent the first line (value already contains internal newlines)
- Comments break property alignment groups

**Step 4: Run tests**

Run: `cd packages/language-server && pnpm test -- --reporter verbose -t "formatter"`
Expected: ALL PASS

**Step 5: Commit**

```
feat: formatter にコメント出力を追加
```

---

### Task 8: Formatter — エッジケースと realistic テスト

**Files:**
- Modify: `packages/language-server/test/formatter.test.ts`

**Step 1: Write comprehensive tests**

```typescript
it("should format a realistic RailSim2 file", () => {
  const input = `// RailSim2 plugin
PluginHeader{PluginType=Train;PluginName="Test Train";PluginAuthor="Author";RailSimVersion=2;}

Body{ModelFileName="body.x";ModelScale=1.0;Coord=0.0,0.0,0.0;

Object3D "headlight"{ModelFileName="light.x";Coord=0.0,1.5,5.0;}

If 1{Transparent=yes;}Else{Transparent=no;}

Material{Diffuse=1.0,1.0,1.0,1.0;Ambient=0.5,0.5,0.5;TexFileName="tex.bmp";}}

ApplySwitch "_FRONT"{Case 0:Coord=0.0,0.0,0.0;Case 1:Coord=1.0,0.0,0.0;Default:Coord=0.5,0.0,0.0;}`;

  const result = format(input);
  // Verify structure — exact output checked line-by-line
  expect(result).toContain("// RailSim2 plugin");
  expect(result).toContain("PluginHeader {\n");
  expect(result).toContain("\tPluginType      = Train;\n");
  expect(result).toContain("\tPluginName      = \"Test Train\";\n");
  expect(result).toContain("\tRailSimVersion  = 2;\n");
  expect(result).toContain("\tObject3D \"headlight\" {\n");
  expect(result).toContain("\t} Else {\n");
  expect(result).toContain("\tCase 0:\n\t\tCoord = 0.0, 0.0, 0.0;\n");
  expect(result).toContain("\tDefault:\n\t\tCoord = 0.5, 0.0, 0.0;\n");
});

it("should handle empty input", () => {
  expect(format("")).toBe("");
});

it("should handle comments-only input", () => {
  expect(format("// just a comment")).toBe("// just a comment\n");
});

it("should format unary expressions", () => {
  const result = format("Body { X = -1; }");
  expect(result).toBe("Body {\n\tX = -1;\n}\n");
});

it("should format boolean values", () => {
  const result = format("Body { Flag = yes; }");
  expect(result).toBe("Body {\n\tFlag = yes;\n}\n");
});

it("should format color values", () => {
  const result = format("Body { Color = #FF00FF80; }");
  expect(result).toBe("Body {\n\tColor = #FF00FF80;\n}\n");
});

it("should format multi-value Case", () => {
  const result = format('ApplySwitch "_X" { Case 0, 1: Coord = 0; }');
  expect(result).toBe('ApplySwitch "_X" {\n\tCase 0, 1:\n\t\tCoord = 0;\n}\n');
});

it("should format top-level If", () => {
  const result = format("If 1 { Body { } }");
  expect(result).toBe("If 1 {\n\tBody {\n\t}\n}\n");
});
```

**Step 2: Run tests and fix any failures**

Run: `cd packages/language-server && pnpm test -- --reporter verbose -t "formatter"`
Fix any edge case issues discovered.

**Step 3: Commit**

```
test: formatter のエッジケーステスト追加
```

---

### Task 9: LSP 統合

**Files:**
- Modify: `packages/language-server/src/server/server.ts`
- Modify: `packages/language-server/package.json`

**Step 1: Add formatting capability to server.ts**

In `server.ts`, add import:
```typescript
import { format } from "./formatter.js";
```

Update capabilities:
```typescript
connection.onInitialize(() => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Full,
    completionProvider: { resolveProvider: false },
    hoverProvider: true,
    documentFormattingProvider: true,
  },
}));
```

Add handler:
```typescript
connection.onDocumentFormatting((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];

  const text = doc.getText();
  const formatted = format(text, {
    indentChar: params.options.insertSpaces ? " " : "\t",
    indentSize: params.options.insertSpaces ? params.options.tabSize : 1,
  });

  if (formatted === text) return [];

  return [{
    range: {
      start: { line: 0, character: 0 },
      end: { line: doc.lineCount, character: 0 },
    },
    newText: formatted,
  }];
});
```

**Step 2: Add export to package.json**

In `packages/language-server/package.json`, add to exports:
```json
"./formatter": "./out/server/formatter.js"
```

**Step 3: Run all tests**

Run: `cd packages/language-server && pnpm test -- --reporter verbose`
Expected: ALL PASS

**Step 4: Build and verify**

Run: `cd packages/language-server && pnpm build`
Expected: No errors

**Step 5: Commit**

```
feat: LSP に documentFormattingProvider を統合
```

---
