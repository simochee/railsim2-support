import {
  CompletionItem,
  CompletionItemKind,
  InsertTextFormat,
} from "vscode-languageserver/node";
import type { Token, Position } from "../shared/tokens.js";
import type {
  FileNode,
  ObjectNode,
  BodyNode,
  TopLevelNode,
} from "../shared/ast.js";
import type {
  PropertySchema,
  ChildSchema,
  ObjectSchema,
} from "../schema/schemaTypes.js";
import { semanticSchema, getFileSchema } from "../schema/semantic.js";
import { resolveSchemaKey } from "../schema/schemaUtils.js";

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

export type CompletionContext =
  | { type: "root"; fileName?: string }
  | {
      type: "objectBody";
      objectName: string;
      schemaKey: string;
      parentChain: string[];
      body: BodyNode[];
    }
  | { type: "none" };

// ---------------------------------------------------------------------------
// Position helpers
// ---------------------------------------------------------------------------

/** Is a <= b in (line, character) order? */
function posLE(a: Position, b: Position): boolean {
  return a.line < b.line || (a.line === b.line && a.character <= b.character);
}

/** Is a < b strictly? */
function posLT(a: Position, b: Position): boolean {
  return a.line < b.line || (a.line === b.line && a.character < b.character);
}

/** Compute the end position of a token from its start + value. */
function tokenEndPos(tok: Token): Position {
  let line = tok.line;
  let character = tok.character;
  for (let i = 0; i < tok.value.length; i++) {
    if (tok.value[i] === "\n") {
      line++;
      character = 0;
    } else {
      character++;
    }
  }
  return { line, character };
}

function tokenStartPos(tok: Token): Position {
  return { line: tok.line, character: tok.character };
}

// ---------------------------------------------------------------------------
// findContext
// ---------------------------------------------------------------------------

export function findContext(
  file: FileNode,
  tokens: Token[],
  position: Position,
  fileName?: string,
): CompletionContext {
  // 1. Suppression: inside comment or string token
  for (const tok of tokens) {
    if (
      tok.type === "lineComment" ||
      tok.type === "blockComment" ||
      tok.type === "string"
    ) {
      const start = tokenStartPos(tok);
      const end = tokenEndPos(tok);
      // cursor at or after start, before end
      if (posLE(start, position) && posLT(position, end)) {
        return { type: "none" };
      }
      // For block comments, also suppress at the start position itself
      // (typing at the very start of a comment is still "in" it for completion purposes)
    }
  }

  // 2. Property value check: after = and before ;/{/}
  // Filter to code tokens only (no comments)
  const codeTokens = tokens.filter(
    (t) => t.type !== "lineComment" && t.type !== "blockComment",
  );

  let lastEqualsPos: Position | null = null;
  let lastDelimPos: Position | null = null;

  for (const tok of codeTokens) {
    const start = tokenStartPos(tok);
    if (!posLE(start, position)) break; // past cursor
    if (tok.type === "equals") {
      lastEqualsPos = start;
    }
    if (
      tok.type === "semicolon" ||
      tok.type === "lbrace" ||
      tok.type === "rbrace"
    ) {
      lastDelimPos = start;
    }
  }

  if (lastEqualsPos !== null) {
    if (lastDelimPos === null || posLT(lastDelimPos, lastEqualsPos)) {
      return { type: "none" };
    }
  }

  // 3. AST walk: find innermost ObjectNode containing cursor
  const result = findInnermostObject(file.body, position, []);
  if (result) {
    return {
      type: "objectBody",
      objectName: result.node.name,
      schemaKey: result.schemaKey,
      parentChain: result.parentChain,
      body: result.node.body,
    };
  }

  return { type: "root", fileName };
}

interface ObjectSearchResult {
  node: ObjectNode;
  schemaKey: string;
  parentChain: string[];
}

function findInnermostObject(
  nodes: (TopLevelNode | BodyNode)[],
  position: Position,
  parentChain: string[],
  parentSchemaKey?: string,
): ObjectSearchResult | null {
  for (const node of nodes) {
    if (!rangeContains(node.range, position)) continue;

    if (node.type === "object") {
      const schemaKey = resolveSchemaKey(node.name, parentSchemaKey);
      const newChain = [...parentChain, schemaKey];

      // Search deeper into this object's body
      const deeper = findInnermostObject(
        node.body,
        position,
        newChain,
        schemaKey,
      );
      if (deeper) return deeper;

      // This object is the innermost
      return { node, schemaKey, parentChain };
    }

    if (node.type === "if") {
      // Search inside if branches but keep current parent context
      const inThen = findInnermostObject(
        node.then,
        position,
        parentChain,
        parentSchemaKey,
      );
      if (inThen) return inThen;
      if (node.else_) {
        const inElse = findInnermostObject(
          node.else_,
          position,
          parentChain,
          parentSchemaKey,
        );
        if (inElse) return inElse;
      }
    }

    if (node.type === "applySwitch") {
      for (const c of node.cases) {
        if (rangeContains(c.range, position)) {
          const inCase = findInnermostObject(
            c.body,
            position,
            parentChain,
            parentSchemaKey,
          );
          if (inCase) return inCase;
        }
      }
      if (node.default_) {
        const inDefault = findInnermostObject(
          node.default_,
          position,
          parentChain,
          parentSchemaKey,
        );
        if (inDefault) return inDefault;
      }
    }
  }
  return null;
}

function rangeContains(
  range: { start: Position; end: Position },
  pos: Position,
): boolean {
  return posLE(range.start, pos) && posLE(pos, range.end);
}

// ---------------------------------------------------------------------------
// getCompletions
// ---------------------------------------------------------------------------

export function getCompletions(
  file: FileNode,
  tokens: Token[],
  position: Position,
  fileName?: string,
): CompletionItem[] {
  const ctx = findContext(file, tokens, position, fileName);

  if (ctx.type === "none") return [];

  if (ctx.type === "root") {
    return buildRootCompletions(file, ctx.fileName);
  }

  return buildObjectBodyCompletions(ctx);
}

// ---------------------------------------------------------------------------
// Root completions
// ---------------------------------------------------------------------------

function buildRootCompletions(
  file: FileNode,
  fileName?: string,
): CompletionItem[] {
  if (!fileName) return [];
  const rootEntries = getFileSchema(fileName);
  if (!rootEntries) return [];

  // Count existing root objects
  const existingCounts = new Map<string, number>();
  for (const node of file.body) {
    if (node.type === "object") {
      existingCounts.set(node.name, (existingCounts.get(node.name) ?? 0) + 1);
    }
  }

  const items: CompletionItem[] = [];
  for (const entry of rootEntries) {
    if (!entry.multiple && (existingCounts.get(entry.name) ?? 0) > 0) continue;

    const schema = semanticSchema[entry.name];
    const snippet = schema?.nameParameter
      ? `${entry.name} \${1:name} {\n\t$0\n}`
      : `${entry.name} {\n\t$0\n}`;

    items.push({
      label: entry.name,
      kind: CompletionItemKind.Class,
      detail: entry.required ? "(required)" : undefined,
      insertText: snippet,
      insertTextFormat: InsertTextFormat.Snippet,
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Object body completions
// ---------------------------------------------------------------------------

function buildObjectBodyCompletions(
  ctx: Extract<CompletionContext, { type: "objectBody" }>,
): CompletionItem[] {
  const schema = semanticSchema[ctx.schemaKey];
  if (!schema) return [];

  // Collect existing direct children (NOT inside If/ApplySwitch)
  const existingProps = new Map<string, number>();
  const existingChildren = new Map<string, number>();
  for (const node of ctx.body) {
    if (node.type === "property") {
      existingProps.set(node.name, (existingProps.get(node.name) ?? 0) + 1);
    } else if (node.type === "object") {
      existingChildren.set(
        node.name,
        (existingChildren.get(node.name) ?? 0) + 1,
      );
    }
  }

  const items: CompletionItem[] = [];

  // Properties
  for (const [name, propSchema] of Object.entries(schema.properties)) {
    if (!propSchema.multiple && (existingProps.get(name) ?? 0) > 0) continue;
    items.push({
      label: name,
      kind: CompletionItemKind.Property,
      detail: `${propSchema.type}${propSchema.required ? " (required)" : ""}`,
      insertText: buildPropertySnippet(name, propSchema),
      insertTextFormat: InsertTextFormat.Snippet,
    });
  }

  // Children
  for (const [name, childSchema] of Object.entries(schema.children)) {
    if (!childSchema.multiple && (existingChildren.get(name) ?? 0) > 0)
      continue;

    const childObjSchema = semanticSchema[childSchema.schemaKey ?? name];
    const snippet = childObjSchema?.nameParameter
      ? `${name} \${1:name} {\n\t$0\n}`
      : `${name} {\n\t$0\n}`;

    items.push({
      label: name,
      kind: CompletionItemKind.Class,
      detail: childSchema.required ? "(required)" : undefined,
      insertText: snippet,
      insertTextFormat: InsertTextFormat.Snippet,
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Snippet builders
// ---------------------------------------------------------------------------

function buildPropertySnippet(name: string, schema: PropertySchema): string {
  const arity = schema.arity ?? 1;

  // Special multi-value types
  if (schema.type === "vector-2d") {
    return `${name} = \${1:0}, \${2:0};`;
  }
  if (schema.type === "vector-3d") {
    return `${name} = \${1:0}, \${2:0}, \${3:0};`;
  }

  // General arity > 1
  if (arity > 1 && schema.type !== "vector-2d" && schema.type !== "vector-3d") {
    const placeholders = Array.from(
      { length: arity },
      (_, i) => `\${${i + 1}:0}`,
    ).join(", ");
    return `${name} = ${placeholders};`;
  }

  switch (schema.type) {
    case "float":
    case "integer":
    case "expression":
      return `${name} = \${1:0};`;

    case "string":
    case "filename":
      return `${name} = "\${1}";`;

    case "yes-no":
      return `${name} = \${1|yes,no|};`;

    case "color":
      return `${name} = \${1:#000000};`;

    case "enum":
      if (schema.enumValues && schema.enumValues.length > 0) {
        return `${name} = \${1|${schema.enumValues.join(",")}|};`;
      }
      return `${name} = \${1};`;

    case "identifier":
      return `${name} = \${1:name};`;

    default:
      return `${name} = \${1};`;
  }
}
