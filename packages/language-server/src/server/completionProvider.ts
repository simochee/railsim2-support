import {
  CompletionItem,
  CompletionItemKind,
  InsertTextFormat,
  TextEdit,
} from "vscode-languageserver";
import type { Token, Position } from "../shared/tokens.js";
import type { FileNode, ObjectNode, BodyNode, TopLevelNode } from "../shared/ast.js";
import type { PropertySchema, RootObjectEntry } from "../schema/schemaTypes.js";
import {
  semanticSchema,
  getPluginTypeSchema,
  getFileSchema,
  fileNamePluginTypeMap,
} from "../schema/semantic.generated.js";
import { resolveSchemaKey } from "../schema/schemaUtils.js";
import { extractPluginType } from "../schema/pluginType.js";
import type { SwitchIndex } from "./switchSymbols.js";
import { SYSTEM_SWITCHES, getSwitchEntries } from "./switchSymbols.js";

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

export type CompletionContext =
  | { type: "root"; fileName?: string; pluginType?: string }
  | {
      type: "objectBody";
      objectName: string;
      schemaKey: string;
      parentChain: string[];
      body: BodyNode[];
    }
  | {
      type: "propertyValue";
      propertyName: string;
      schemaKey: string;
      parentChain: string[];
      /** Range of the value token(s) being typed (for textEdit replacement) */
      replaceRange: { start: Position; end: Position };
      /** Whether to append ";" after the value */
      appendSemicolon: boolean;
    }
  | { type: "switchRef"; switchIndex: SwitchIndex }
  | { type: "caseValue"; switchName: string; switchIndex: SwitchIndex }
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
  switchIndex?: SwitchIndex,
): CompletionContext {
  // 0. Switch context detection (must run BEFORE generic string suppress)
  if (switchIndex) {
    const switchCtx = detectSwitchContext(tokens, position, file, switchIndex);
    if (switchCtx) return switchCtx;
  }

  // 1. Suppression: inside comment or string token
  for (const tok of tokens) {
    if (tok.type === "lineComment" || tok.type === "blockComment" || tok.type === "string") {
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
  const codeTokens = tokens.filter((t) => t.type !== "lineComment" && t.type !== "blockComment");

  let lastEqualsIdx = -1;
  let lastDelimIdx = -1;

  for (let i = 0; i < codeTokens.length; i++) {
    const start = tokenStartPos(codeTokens[i]);
    if (!posLE(start, position)) break; // past cursor
    if (codeTokens[i].type === "equals") {
      lastEqualsIdx = i;
    }
    // Only count delimiters strictly before cursor (a `;` at cursor position
    // means the cursor is between `=` and `;`, still in value territory)
    if (
      posLT(start, position) &&
      (codeTokens[i].type === "semicolon" ||
        codeTokens[i].type === "lbrace" ||
        codeTokens[i].type === "rbrace")
    ) {
      lastDelimIdx = i;
    }
  }

  if (lastEqualsIdx >= 0) {
    if (lastDelimIdx < 0 || lastDelimIdx < lastEqualsIdx) {
      // Cursor is in property value position (after = and before ;/{/})
      // Try to build a propertyValue context
      const pvCtx = buildPropertyValueContext(codeTokens, lastEqualsIdx, position, file, fileName);
      if (pvCtx) return pvCtx;
      return { type: "none" };
    }
  }

  // 3. Build root schemaKey map for PluginType-context-dependent resolution
  const rootSchemaKeyMap = new Map<string, string>();
  const rootEntries = resolveRootEntries(file, fileName);
  if (rootEntries) {
    for (const entry of rootEntries) {
      if (entry.schemaKey) {
        rootSchemaKeyMap.set(entry.name, entry.schemaKey);
      }
    }
  }

  // 4. AST walk: find innermost ObjectNode containing cursor
  const result = findInnermostObject(
    file.body,
    position,
    [],
    undefined,
    codeTokens,
    rootSchemaKeyMap,
  );
  if (result) {
    return {
      type: "objectBody",
      objectName: result.node.name,
      schemaKey: result.schemaKey,
      parentChain: result.parentChain,
      body: result.node.body,
    };
  }

  const rawPluginType = extractPluginType(file);
  const pluginType =
    rawPluginType && getPluginTypeSchema(rawPluginType)
      ? rawPluginType
      : fileName
        ? fileNamePluginTypeMap[fileName]
        : undefined;
  return { type: "root", fileName, pluginType };
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
  codeTokens?: Token[],
  rootSchemaKeyMap?: Map<string, string>,
): ObjectSearchResult | null {
  for (const node of nodes) {
    if (!rangeContains(node.range, position)) continue;

    if (node.type === "object") {
      // Skip if cursor is in the object header (name, args, or on '{')
      if (isInObjectHeader(node, position, codeTokens)) continue;

      // ルートレベルでファイルコンテキスト依存の schemaKey がある場合はそれを優先
      const schemaKey =
        parentSchemaKey == null && rootSchemaKeyMap?.has(node.name)
          ? rootSchemaKeyMap.get(node.name)!
          : resolveSchemaKey(node.name, parentSchemaKey);
      const newChain = [...parentChain, schemaKey];

      // Search deeper into this object's body
      const deeper = findInnermostObject(node.body, position, newChain, schemaKey, codeTokens);
      if (deeper) return deeper;

      // This object is the innermost
      return { node, schemaKey, parentChain };
    }

    if (node.type === "if") {
      const inThen = findInnermostObject(
        node.then,
        position,
        parentChain,
        parentSchemaKey,
        codeTokens,
      );
      if (inThen) return inThen;
      if (node.else_) {
        const inElse = findInnermostObject(
          node.else_,
          position,
          parentChain,
          parentSchemaKey,
          codeTokens,
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
            codeTokens,
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
          codeTokens,
        );
        if (inDefault) return inDefault;
      }
    }
  }
  return null;
}

/** Check if position is in the object header area (name, args, or on '{') */
function isInObjectHeader(node: ObjectNode, position: Position, codeTokens?: Token[]): boolean {
  // Fast check: cursor on or before name/args end
  const argsEnd =
    node.args.length > 0 ? node.args[node.args.length - 1].range.end : node.nameRange.end;
  if (posLE(position, argsEnd)) return true;

  // Check if cursor is on or before the opening '{' using token list
  if (codeTokens) {
    const lbrace = codeTokens.find(
      (t) =>
        t.type === "lbrace" &&
        posLE(argsEnd, tokenStartPos(t)) &&
        rangeContains(node.range, tokenStartPos(t)),
    );
    if (lbrace && posLE(position, tokenStartPos(lbrace))) return true;
  }

  return false;
}

function rangeContains(range: { start: Position; end: Position }, pos: Position): boolean {
  return posLE(range.start, pos) && posLE(pos, range.end);
}

/**
 * PluginType (AST 優先) またはファイル名ヒントからルートエントリを解決する。
 * PluginType が不正値の場合はファイル名ヒントにフォールバックする。
 */
function resolveRootEntries(file: FileNode, fileName?: string): RootObjectEntry[] | undefined {
  const pluginType = extractPluginType(file);
  if (pluginType) {
    const schema = getPluginTypeSchema(pluginType);
    if (schema) return schema;
  }
  if (fileName) {
    return getFileSchema(fileName);
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Property value context builder
// ---------------------------------------------------------------------------

/**
 * Build a propertyValue context by walking tokens backward from the `=` to find
 * the property name, then resolving the containing object's schemaKey via AST.
 */
function buildPropertyValueContext(
  codeTokens: Token[],
  equalsIdx: number,
  cursorPos: Position,
  file: FileNode,
  fileName?: string,
): Extract<CompletionContext, { type: "propertyValue" }> | null {
  // Find the identifier token immediately before the `=`
  let propertyName: string | null = null;
  for (let i = equalsIdx - 1; i >= 0; i--) {
    if (codeTokens[i].type === "identifier") {
      propertyName = codeTokens[i].value;
      break;
    }
    // Skip comma for multi-value but stop at any structural token
    if (
      codeTokens[i].type === "semicolon" ||
      codeTokens[i].type === "lbrace" ||
      codeTokens[i].type === "rbrace"
    ) {
      break;
    }
  }
  if (!propertyName) return null;

  // Determine replaceRange: from the token after `=` to the cursor
  const equalsEnd = tokenEndPos(codeTokens[equalsIdx]);
  let valueStart: Position = cursorPos;
  // Find the first non-whitespace token after `=` that is before cursor
  for (let i = equalsIdx + 1; i < codeTokens.length; i++) {
    const start = tokenStartPos(codeTokens[i]);
    if (!posLE(start, cursorPos)) break;
    // Use the start of the first value token as replacement start
    valueStart = start;
    break;
  }
  // If no value token found, replace starts at cursor (empty)
  if (posLE(cursorPos, equalsEnd)) {
    valueStart = cursorPos;
  }

  // Determine appendSemicolon: check if there's a `;` at or after cursor
  // within the current statement boundary
  let appendSemicolon = true;
  for (let i = equalsIdx + 1; i < codeTokens.length; i++) {
    const start = tokenStartPos(codeTokens[i]);
    if (posLT(start, cursorPos)) continue; // strictly before cursor
    if (codeTokens[i].type === "semicolon") {
      appendSemicolon = false;
    }
    // Stop at first token at/after cursor
    break;
  }

  // Resolve containing object's schemaKey via AST walk
  const rootSchemaKeyMap = new Map<string, string>();
  const rootEntries = resolveRootEntries(file, fileName);
  if (rootEntries) {
    for (const entry of rootEntries) {
      if (entry.schemaKey) {
        rootSchemaKeyMap.set(entry.name, entry.schemaKey);
      }
    }
  }

  // Suppress if cursor is on a different line than the `=` — this happens when
  // the previous statement is missing a `;` and the cursor moved to the next line
  const equalsPos = tokenStartPos(codeTokens[equalsIdx]);
  if (equalsPos.line !== cursorPos.line) return null;

  const result = findInnermostObject(
    file.body,
    equalsPos,
    [],
    undefined,
    codeTokens,
    rootSchemaKeyMap,
  );
  if (!result) return null;

  return {
    type: "propertyValue",
    propertyName,
    schemaKey: result.schemaKey,
    parentChain: result.parentChain,
    replaceRange: { start: valueStart, end: cursorPos },
    appendSemicolon,
  };
}

// ---------------------------------------------------------------------------
// getCompletions
// ---------------------------------------------------------------------------

export function getCompletions(
  file: FileNode,
  tokens: Token[],
  position: Position,
  fileName?: string,
  switchIndex?: SwitchIndex,
): CompletionItem[] {
  const ctx = findContext(file, tokens, position, fileName, switchIndex);

  if (ctx.type === "none") return [];

  if (ctx.type === "root") {
    return buildRootCompletions(file, ctx.fileName, ctx.pluginType);
  }

  if (ctx.type === "propertyValue") {
    return buildPropertyValueCompletions(ctx);
  }

  if (ctx.type === "switchRef") {
    return buildSwitchRefCompletions(ctx.switchIndex);
  }

  if (ctx.type === "caseValue") {
    return buildCaseValueCompletions(ctx.switchName, ctx.switchIndex);
  }

  return buildObjectBodyCompletions(ctx);
}

// ---------------------------------------------------------------------------
// Root completions
// ---------------------------------------------------------------------------

function buildRootCompletions(
  file: FileNode,
  fileName?: string,
  pluginType?: string,
): CompletionItem[] {
  const rootEntries = pluginType
    ? getPluginTypeSchema(pluginType)
    : fileName
      ? getFileSchema(fileName)
      : undefined;
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
      existingChildren.set(node.name, (existingChildren.get(node.name) ?? 0) + 1);
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
    if (!childSchema.multiple && (existingChildren.get(name) ?? 0) > 0) continue;

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
// Property value completions
// ---------------------------------------------------------------------------

function buildPropertyValueCompletions(
  ctx: Extract<CompletionContext, { type: "propertyValue" }>,
): CompletionItem[] {
  const schema = semanticSchema[ctx.schemaKey];
  if (!schema) return [];

  const propSchema = schema.properties[ctx.propertyName];
  if (!propSchema) return [];

  let values: string[];
  if (propSchema.type === "enum" && propSchema.enumValues && propSchema.enumValues.length > 0) {
    values = propSchema.enumValues;
  } else if (propSchema.type === "yes-no") {
    values = ["yes", "no"];
  } else {
    return [];
  }

  const suffix = ctx.appendSemicolon ? ";" : "";
  return values.map((value) => ({
    label: value,
    kind: CompletionItemKind.EnumMember,
    textEdit: TextEdit.replace(
      { start: ctx.replaceRange.start, end: ctx.replaceRange.end },
      value + suffix,
    ),
  }));
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
  if (arity > 1) {
    const placeholders = Array.from({ length: arity }, (_, i) => `\${${i + 1}:0}`).join(", ");
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

// ---------------------------------------------------------------------------
// Switch context detection
// ---------------------------------------------------------------------------

function detectSwitchContext(
  tokens: Token[],
  position: Position,
  file: FileNode,
  switchIndex: SwitchIndex,
): CompletionContext | null {
  // Check if cursor is inside a string token
  let insideString = false;
  for (const tok of tokens) {
    if (tok.type === "string") {
      const start = tokenStartPos(tok);
      const end = tokenEndPos(tok);
      if (posLE(start, position) && posLT(position, end)) {
        insideString = true;
        break;
      }
    }
  }

  // Filter code tokens (no comments) up to cursor
  const codeTokens = tokens.filter((t) => t.type !== "lineComment" && t.type !== "blockComment");
  const tokensBefore = codeTokens.filter((t) => posLE(tokenStartPos(t), position));

  if (insideString) {
    // Walk backwards to find the keyword before this string
    for (let i = tokensBefore.length - 1; i >= 0; i--) {
      const t = tokensBefore[i];
      if (t.type === "string") continue; // skip the string we're in
      if (t.type === "lparen") continue; // skip parentheses: If ("...") == 0
      if (t.type === "identifier" && (t.value === "ApplySwitch" || t.value === "If")) {
        return { type: "switchRef", switchIndex };
      }
      // Any other token means this is not a switch ref position
      break;
    }
  }

  // caseValue: cursor after "Case" keyword with no ":" between
  // Use strict less-than to exclude tokens starting exactly at cursor (e.g. the colon)
  const tokensStrictlyBefore = codeTokens.filter((t) => posLT(tokenStartPos(t), position));
  let foundCase = false;
  for (let i = tokensStrictlyBefore.length - 1; i >= 0; i--) {
    const t = tokensStrictlyBefore[i];
    if (
      t.type === "colon" ||
      t.type === "semicolon" ||
      t.type === "lbrace" ||
      t.type === "rbrace"
    ) {
      break;
    }
    if (t.type === "identifier" && t.value === "Case") {
      foundCase = true;
      break;
    }
  }

  if (foundCase) {
    // Find the enclosing ApplySwitch to get switchName
    const switchName = findEnclosingApplySwitchName(file.body, position);
    if (switchName) {
      return { type: "caseValue", switchName, switchIndex };
    }
  }

  return null;
}

function findEnclosingApplySwitchName(
  nodes: (TopLevelNode | BodyNode)[],
  position: Position,
): string | null {
  for (const node of nodes) {
    if (!rangeContains(node.range, position)) continue;

    if (node.type === "object") {
      const result = findEnclosingApplySwitchName(node.body, position);
      if (result) return result;
    }

    if (node.type === "if") {
      const result = findEnclosingApplySwitchName(node.then, position);
      if (result) return result;
      if (node.else_) {
        const result2 = findEnclosingApplySwitchName(node.else_, position);
        if (result2) return result2;
      }
    }

    if (node.type === "applySwitch") {
      // First, recurse into cases/default to find a deeper nested ApplySwitch
      for (const c of node.cases) {
        if (rangeContains(c.range, position)) {
          const deeper = findEnclosingApplySwitchName(c.body, position);
          if (deeper) return deeper;
        }
      }
      if (node.default_) {
        const deeper = findEnclosingApplySwitchName(node.default_, position);
        if (deeper) return deeper;
      }
      // No deeper ApplySwitch found — this is the innermost one
      if (node.switchName.type === "string") {
        return node.switchName.value;
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Switch completions
// ---------------------------------------------------------------------------

function buildSwitchRefCompletions(switchIndex: SwitchIndex): CompletionItem[] {
  const items: CompletionItem[] = [];
  for (const [name, def] of switchIndex.definitions) {
    items.push({
      label: name,
      kind: CompletionItemKind.Variable,
      detail: `DefineSwitch (${def.entries.length} entries)`,
    });
  }
  for (const name of SYSTEM_SWITCHES) {
    items.push({
      label: name,
      kind: CompletionItemKind.Constant,
      detail: "System switch",
    });
  }
  return items;
}

function buildCaseValueCompletions(switchName: string, switchIndex: SwitchIndex): CompletionItem[] {
  const entries = getSwitchEntries(switchName, switchIndex);
  if (!entries) return [];
  return entries.map((entry) => ({
    label: String(entry.index),
    kind: CompletionItemKind.EnumMember,
    detail: entry.label,
  }));
}
