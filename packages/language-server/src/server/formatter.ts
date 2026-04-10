import { parse } from "./parser.js";
import type {
  FileNode,
  TopLevelNode,
  BodyNode,
  ObjectNode,
  PropertyNode,
  IfNode,
  ApplySwitchNode,
  CaseNode,
  CommentNode,
  ExprNode,
} from "../shared/ast.js";

export interface FormatOptions {
  indentChar: "\t" | " ";
  indentSize: number;
}

const DEFAULT_OPTIONS: FormatOptions = {
  indentChar: "\t",
  indentSize: 1,
};

export function format(source: string, options?: Partial<FormatOptions>): string {
  if (source.trim() === "") return "";

  const opts: FormatOptions = { ...DEFAULT_OPTIONS, ...options };
  const { file } = parse(source);
  const sourceLines = source.split("\n");

  const ctx: FormatContext = { source, sourceLines, opts };
  return formatFile(file, ctx);
}

interface FormatContext {
  source: string;
  sourceLines: string[];
  opts: FormatOptions;
}

function ind(depth: number, ctx: FormatContext): string {
  return ctx.opts.indentChar.repeat(ctx.opts.indentSize * depth);
}

// ---------------------------------------------------------------------------
// File
// ---------------------------------------------------------------------------

function formatFile(file: FileNode, ctx: FormatContext): string {
  const parts: string[] = [];
  formatNodeList(file.body, 0, ctx, parts);
  const result = parts.join("");
  if (result.length > 0 && !result.endsWith("\n")) {
    return result + "\n";
  }
  return result;
}

// ---------------------------------------------------------------------------
// Node list — blank line preservation
// ---------------------------------------------------------------------------

function formatNodeList(
  nodes: readonly (TopLevelNode | BodyNode)[],
  depth: number,
  ctx: FormatContext,
  parts: string[],
): void {
  let prevEndLine = -1;

  for (const node of nodes) {
    if (prevEndLine >= 0) {
      const blanks = countBlankLines(prevEndLine, node.range.start.line, ctx.sourceLines);
      for (let b = 0; b < blanks; b++) parts.push("\n");
    }

    parts.push(formatNode(node, depth, ctx));
    prevEndLine = node.range.end.line;
  }
}

function countBlankLines(
  prevEndLine: number,
  nextStartLine: number,
  sourceLines: string[],
): number {
  let count = 0;
  for (let line = prevEndLine + 1; line < nextStartLine; line++) {
    if (line < sourceLines.length && sourceLines[line].trim() === "") count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

function formatNode(node: TopLevelNode | BodyNode, depth: number, ctx: FormatContext): string {
  switch (node.type) {
    case "object":
      return formatObject(node, depth, ctx);
    case "property":
      return formatProperty(node, depth, ctx);
    case "if":
      return formatIf(node, depth, ctx);
    case "applySwitch":
      return formatApplySwitch(node, depth, ctx);
    case "comment":
      return formatComment(node, depth, ctx);
  }
}

function formatObject(node: ObjectNode, depth: number, ctx: FormatContext): string {
  const prefix = ind(depth, ctx);
  let header = `${prefix}${node.name}`;
  for (const arg of node.args) header += ` ${exprText(arg, ctx)}`;
  header += " {\n";

  const bodyParts: string[] = [];
  formatNodeList(node.body, depth + 1, ctx, bodyParts);

  return header + bodyParts.join("") + `${prefix}}\n`;
}

function formatProperty(node: PropertyNode, depth: number, ctx: FormatContext): string {
  const prefix = ind(depth, ctx);
  const inline = node.inlineComment ? ` ${node.inlineComment.value}` : "";
  const valueStr = propertyValueText(node, ctx);
  const trailing = node.trailingComment ? ` ${node.trailingComment.value}` : "";
  return `${prefix}${node.name}${inline} = ${valueStr};${trailing}\n`;
}

function propertyValueText(node: PropertyNode, ctx: FormatContext): string {
  if (node.values.length === 0) return "";

  // Extract the raw value region from source: after '= ' to before ';'
  // nameRange.end → search for '=' → skip whitespace → value start
  const nameEndOff = posToOffset(ctx.source, node.nameRange.end);
  const rangeEndOff = posToOffset(ctx.source, node.range.end);

  // Find '=' after name
  let eqOff = nameEndOff;
  while (eqOff < rangeEndOff && ctx.source[eqOff] !== "=") eqOff++;
  eqOff++; // skip '='

  // Find ';' at end
  let semiOff = rangeEndOff - 1;
  while (semiOff > eqOff && ctx.source[semiOff] !== ";") semiOff--;

  // Extract and trim
  const raw = ctx.source.slice(eqOff, semiOff).trim();

  if (node.values.length === 1) {
    // Single value: preserve source text as-is (keeps parens, original spacing)
    return raw;
  }

  // Multi-value: check for tuple parens and normalize comma spacing
  const hasTupleParen = raw.startsWith("(") && raw.endsWith(")");
  const vals = node.values.map((v) => exprText(v, ctx)).join(", ");
  return hasTupleParen ? `(${vals})` : vals;
}

function conditionText(
  node: IfNode | ApplySwitchNode,
  keyword: string,
  ctx: FormatContext,
): string {
  // Extract condition/switchName from source: after keyword to before '{'
  const nodeStartOff = posToOffset(ctx.source, node.range.start);
  const nodeEndOff = posToOffset(ctx.source, node.range.end);

  // Find the first '{' after the keyword in the node's range
  const afterKeyword = nodeStartOff + keyword.length;
  let braceOff = afterKeyword;
  let inString = false;
  while (braceOff < nodeEndOff) {
    if (ctx.source[braceOff] === '"') inString = !inString;
    if (!inString && ctx.source[braceOff] === "{") break;
    braceOff++;
  }

  const raw = ctx.source.slice(afterKeyword, braceOff).trim();
  return normalizeOperatorSpacing(raw);
}

function formatIf(node: IfNode, depth: number, ctx: FormatContext): string {
  const prefix = ind(depth, ctx);
  let result = `${prefix}If ${conditionText(node, "If", ctx)} {\n`;

  const thenParts: string[] = [];
  formatNodeList(node.then, depth + 1, ctx, thenParts);
  result += thenParts.join("");

  if (node.else_) {
    result += `${prefix}} Else {\n`;
    const elseParts: string[] = [];
    formatNodeList(node.else_, depth + 1, ctx, elseParts);
    result += elseParts.join("");
  }

  result += `${prefix}}\n`;
  return result;
}

function formatApplySwitch(node: ApplySwitchNode, depth: number, ctx: FormatContext): string {
  const prefix = ind(depth, ctx);
  let result = `${prefix}ApplySwitch ${conditionText(node, "ApplySwitch", ctx)} {\n`;

  let prevEndLine = node.range.start.line;

  for (const c of node.cases) {
    const blanks = countBlankLines(prevEndLine, c.range.start.line, ctx.sourceLines);
    for (let b = 0; b < blanks; b++) result += "\n";
    result += formatCase(c, depth + 1, ctx);
    prevEndLine = c.range.end.line;
  }

  if (node.default_) {
    if (node.defaultRange) {
      const blanks = countBlankLines(prevEndLine, node.defaultRange.start.line, ctx.sourceLines);
      for (let b = 0; b < blanks; b++) result += "\n";
    }
    result += `${ind(depth + 1, ctx)}Default:\n`;
    const parts: string[] = [];
    formatNodeList(node.default_, depth + 2, ctx, parts);
    result += parts.join("");
  }

  result += `${prefix}}\n`;
  return result;
}

function formatCase(node: CaseNode, depth: number, ctx: FormatContext): string {
  const prefix = ind(depth, ctx);
  const vals = node.values.map((v) => exprText(v, ctx)).join(", ");
  let result = `${prefix}Case ${vals}:\n`;

  const parts: string[] = [];
  formatNodeList(node.body, depth + 1, ctx, parts);
  result += parts.join("");
  return result;
}

function formatComment(node: CommentNode, depth: number, ctx: FormatContext): string {
  return `${ind(depth, ctx)}${node.value}\n`;
}

// ---------------------------------------------------------------------------
// Expression text — preserves original number formatting via source extraction
// ---------------------------------------------------------------------------

function exprText(expr: ExprNode, ctx: FormatContext): string {
  // Extract directly from source to preserve original formatting:
  // - number literals (1.0 stays 1.0)
  // - parenthesized expressions ((1+2)*3 keeps parens)
  const start = posToOffset(ctx.source, expr.range.start);
  const end = posToOffset(ctx.source, expr.range.end);
  const raw = ctx.source.slice(start, end).trim();
  return raw;
}

function normalizeOperatorSpacing(text: string): string {
  const parts: string[] = [];
  let i = 0;
  while (i < text.length) {
    // Skip strings
    if (text[i] === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') {
        if (text[j] === "\\") j++;
        j++;
      }
      parts.push(text.slice(i, j + 1));
      i = j + 1;
      continue;
    }
    // Two-char operators
    const two = text.slice(i, i + 2);
    if (
      two === "==" ||
      two === "!=" ||
      two === "<=" ||
      two === ">=" ||
      two === "<<" ||
      two === ">>" ||
      two === "&&" ||
      two === "||"
    ) {
      // Trim trailing space from parts, add space + op + space
      trimTrailingSpace(parts);
      parts.push(` ${two} `);
      i += 2;
      skipSpaces();
      continue;
    }
    // Single-char binary operators (but not unary - or + after operator/paren/start)
    const ch = text[i];
    if (
      (ch === "+" ||
        ch === "-" ||
        ch === "*" ||
        ch === "/" ||
        ch === "%" ||
        ch === "<" ||
        ch === ">" ||
        ch === "&" ||
        ch === "|" ||
        ch === "^") &&
      isBinaryContext(text, i)
    ) {
      trimTrailingSpace(parts);
      parts.push(` ${ch} `);
      i++;
      skipSpaces();
      continue;
    }
    parts.push(text[i]);
    i++;
  }
  // Clean up double spaces
  return parts.join("").replace(/  +/g, " ");

  function skipSpaces(): void {
    while (i < text.length && (text[i] === " " || text[i] === "\t")) i++;
  }

  function trimTrailingSpace(arr: string[]): void {
    while (arr.length > 0 && (arr[arr.length - 1] === " " || arr[arr.length - 1] === "\t"))
      arr.pop();
  }
}

function isBinaryContext(text: string, pos: number): boolean {
  // A +/- is binary if preceded by a value character (digit, letter, ), ")
  // It's unary if preceded by operator, (, =, start, or nothing
  let j = pos - 1;
  while (j >= 0 && (text[j] === " " || text[j] === "\t")) j--;
  if (j < 0) return false;
  const prev = text[j];
  return /[0-9a-zA-Z_)\]"]/.test(prev);
}

function posToOffset(source: string, pos: { line: number; character: number }): number {
  let offset = 0;
  let line = 0;
  while (line < pos.line && offset < source.length) {
    if (source[offset] === "\n") line++;
    offset++;
  }
  return offset + pos.character;
}
