import type { Token, TokenType, Range, Position } from "../shared/tokens.js";
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
import type { Diagnostic, ParseResult } from "../shared/diagnostics.js";
import { tokenize } from "./tokenizer.js";

// ---------------------------------------------------------------------------
// Pratt parser precedence table
// ---------------------------------------------------------------------------

const BINARY_PRECEDENCE: Record<string, number> = {
  "||": 12,
  "&&": 11,
  "|": 10,
  "^": 9,
  "&": 8,
  "==": 7,
  "!=": 7,
  "<": 6,
  ">": 6,
  "<=": 6,
  ">=": 6,
  "<<": 5,
  ">>": 5,
  "+": 4,
  "-": 4,
  "*": 3,
  "/": 3,
  "%": 3,
};

const BINARY_TOKEN_TO_OP: Partial<Record<TokenType, string>> = {
  pipePipe: "||",
  ampersandAmpersand: "&&",
  pipe: "|",
  caret: "^",
  ampersand: "&",
  equalsEquals: "==",
  bangEquals: "!=",
  less: "<",
  greater: ">",
  lessEquals: "<=",
  greaterEquals: ">=",
  lessLess: "<<",
  greaterGreater: ">>",
  plus: "+",
  minus: "-",
  star: "*",
  slash: "/",
  percent: "%",
};

const UNARY_TOKEN_TO_OP: Partial<Record<TokenType, string>> = {
  plus: "+",
  minus: "-",
  bang: "!",
  tilde: "~",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function posOf(token: Token): Position {
  return { line: token.line, character: token.character };
}

function endOf(token: Token): Position {
  const lastNl = token.value.lastIndexOf("\n");
  if (lastNl === -1) {
    return { line: token.line, character: token.character + token.length };
  }
  const lineCount = token.value.split("\n").length - 1;
  return {
    line: token.line + lineCount,
    character: token.value.length - lastNl - 1,
  };
}

function rangeOf(token: Token): Range {
  return { start: posOf(token), end: endOf(token) };
}

function rangeSpan(start: Position, end: Position): Range {
  return { start, end };
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

export function parse(source: string): ParseResult {
  const allTokens = tokenize(source);
  const diagnostics: Diagnostic[] = [];

  // Separate comments and non-comments
  const tokens: Token[] = [];
  const commentTokens: Token[] = [];
  for (const t of allTokens) {
    if (t.type === "lineComment" || t.type === "blockComment") {
      commentTokens.push(t);
    } else {
      tokens.push(t);
    }
  }

  let pos = 0;

  function peek(): Token {
    return tokens[pos];
  }

  function advance(): Token {
    const t = tokens[pos];
    pos++;
    return t;
  }

  function check(type: TokenType): boolean {
    return peek().type === type;
  }

  function checkValue(type: TokenType, value: string): boolean {
    const t = peek();
    return t.type === type && t.value === value;
  }

  function expect(type: TokenType, message: string): Token {
    if (check(type)) {
      return advance();
    }
    const t = peek();
    addError(message, rangeOf(t));
    // Return a synthetic token so callers can proceed
    return { type, value: "", line: t.line, character: t.character, offset: t.offset, length: 0 };
  }

  function addError(message: string, range: Range): void {
    diagnostics.push({ message, range, severity: "error" });
  }

  // -----------------------------------------------------------------------
  // Synchronization
  // -----------------------------------------------------------------------

  function synchronize(): void {
    while (!check("eof")) {
      const t = peek();
      if (t.type === "semicolon") {
        advance();
        return;
      }
      if (t.type === "rbrace") {
        return;
      }
      if (t.type === "identifier") {
        const v = t.value;
        if (v === "Case" || v === "Default" || v === "Else") return;
        // identifier followed by '=' — property start
        if (pos + 1 < tokens.length && tokens[pos + 1].type === "equals") return;
        // identifier followed by args then '{' — object start
        // Look ahead past optional args (string, number, identifier, color) for '{'
        let lookahead = pos + 1;
        while (lookahead < tokens.length) {
          const lt = tokens[lookahead].type;
          if (lt === "lbrace") return; // found object start
          if (lt === "string" || lt === "number" || lt === "identifier" || lt === "color") {
            lookahead++;
            continue;
          }
          break; // not an object start pattern
        }
      }
      advance();
    }
  }

  // -----------------------------------------------------------------------
  // Expression parsing (Pratt)
  // -----------------------------------------------------------------------

  function parseExpr(minPrec: number = 100): ExprNode {
    let left = parseUnary();

    while (true) {
      const t = peek();
      const op = BINARY_TOKEN_TO_OP[t.type];
      if (op === undefined) break;
      const prec = BINARY_PRECEDENCE[op];
      // Lower number = higher precedence (tighter binding)
      if (prec > minPrec) break;

      advance(); // consume operator
      const right = parseExpr(prec - 1); // left-associative
      left = {
        type: "binary",
        op,
        left,
        right,
        range: rangeSpan(left.range.start, right.range.end),
      };
    }

    return left;
  }

  function parseUnary(): ExprNode {
    const t = peek();
    const op = UNARY_TOKEN_TO_OP[t.type];
    if (op !== undefined) {
      const opToken = advance();
      const operand = parseUnary();
      return {
        type: "unary",
        op,
        operand,
        range: rangeSpan(posOf(opToken), operand.range.end),
      };
    }
    return parsePrimary();
  }

  function parsePrimary(): ExprNode {
    const t = peek();

    if (t.type === "number") {
      advance();
      return { type: "number", value: parseFloat(t.value), range: rangeOf(t) };
    }

    if (t.type === "string") {
      advance();
      // Strip surrounding quotes for value
      const raw = t.value;
      const inner = raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw;
      return { type: "string", value: inner, range: rangeOf(t) };
    }

    if (t.type === "color") {
      advance();
      return { type: "color", value: t.value, range: rangeOf(t) };
    }

    if (t.type === "identifier") {
      if (t.value === "yes" || t.value === "no") {
        advance();
        return { type: "boolean", value: t.value === "yes", range: rangeOf(t) };
      }
      advance();
      return { type: "identifier", value: t.value, range: rangeOf(t) };
    }

    if (t.type === "lparen") {
      advance(); // (
      const inner = parseExpr();
      expect("rparen", "Expected ')'");
      return inner;
    }

    // Error: unexpected token in expression
    addError(`Unexpected token '${t.value || t.type}' in expression`, rangeOf(t));
    // Return a synthetic number node so we can keep parsing
    return { type: "number", value: 0, range: rangeOf(t) };
  }

  // -----------------------------------------------------------------------
  // Comment distribution
  // -----------------------------------------------------------------------

  interface BodySlot {
    body: (TopLevelNode | BodyNode)[];
    range: Range;
  }

  function containsPosition(range: Range, p: Position): boolean {
    if (p.line < range.start.line || p.line > range.end.line) return false;
    if (p.line === range.start.line && p.character < range.start.character) return false;
    if (p.line === range.end.line && p.character >= range.end.character) return false;
    return true;
  }

  function rangeSize(range: Range): number {
    const lines = range.end.line - range.start.line;
    return lines * 10000 + (range.end.character - range.start.character);
  }

  function collectSlots(
    nodes: (TopLevelNode | BodyNode)[],
    containerRange: Range,
    slots: BodySlot[],
  ): void {
    slots.push({ body: nodes, range: containerRange });
    for (const node of nodes) {
      switch (node.type) {
        case "object":
          collectSlots(node.body, node.bodyRange, slots);
          break;
        case "if":
          collectSlots(node.then, node.thenRange, slots);
          if (node.else_ && node.elseRange) {
            collectSlots(node.else_, node.elseRange, slots);
          }
          break;
        case "applySwitch":
          for (const c of node.cases) {
            collectSlots(c.body, c.bodyRange, slots);
          }
          if (node.default_ && node.defaultRange) {
            collectSlots(node.default_, node.defaultRange, slots);
          }
          break;
      }
    }
  }

  function distributeComments(file: FileNode, cmtTokens: Token[]): void {
    if (cmtTokens.length === 0) return;

    const slots: BodySlot[] = [];
    collectSlots(file.body, file.range, slots);

    for (const ct of cmtTokens) {
      const commentNode: CommentNode = {
        type: "comment",
        value: ct.value,
        kind: ct.type === "lineComment" ? "line" : "block",
        range: rangeOf(ct),
      };

      let bestSlot: BodySlot | null = null;
      let bestSize = Infinity;

      for (const slot of slots) {
        if (containsPosition(slot.range, commentNode.range.start)) {
          const size = rangeSize(slot.range);
          if (size < bestSize) {
            bestSize = size;
            bestSlot = slot;
          }
        }
      }

      if (bestSlot) {
        bestSlot.body.push(commentNode);
      } else {
        // Fallback: file body (for leading/trailing comments)
        file.body.push(commentNode);
      }
    }

    for (const slot of slots) {
      slot.body.sort((a, b) => {
        if (a.range.start.line !== b.range.start.line)
          return a.range.start.line - b.range.start.line;
        return a.range.start.character - b.range.start.character;
      });
    }
  }

  // -----------------------------------------------------------------------
  // Top-level / body parsing
  // -----------------------------------------------------------------------

  function parseFile(): FileNode {
    const body: TopLevelNode[] = [];

    while (!check("eof")) {
      const node = parseTopLevel();
      if (node) {
        body.push(node);
      }
    }

    const eofToken = tokens[pos]; // the EOF token
    const fileEnd: Position = { line: eofToken.line, character: eofToken.character };

    const file: FileNode = {
      type: "file",
      body,
      range: rangeSpan({ line: 0, character: 0 }, fileEnd),
    };

    distributeComments(file, commentTokens);

    return file;
  }

  function parseTopLevel(): TopLevelNode | null {
    const t = peek();

    if (t.type === "identifier") {
      if (t.value === "If") return parseIf();
      if (t.value === "ApplySwitch") return parseApplySwitch();

      // Check if it's identifier { or identifier string {
      if (isObjectStart()) return parseObject();

      // Otherwise treat as error and skip
      addError(`Unexpected identifier '${t.value}' at top level`, rangeOf(t));
      const before1 = pos;
      synchronize();
      if (pos === before1) advance();
      return null;
    }

    // Unexpected token
    addError(`Unexpected token '${t.value || t.type}' at top level`, rangeOf(t));
    const before2 = pos;
    synchronize();
    if (pos === before2) advance();
    return null;
  }

  function isObjectStart(): boolean {
    // identifier { or identifier string { or identifier expr... {
    if (peek().type !== "identifier") return false;
    // Look ahead for { possibly after some arguments
    let ahead = pos + 1;
    while (ahead < tokens.length) {
      const tt = tokens[ahead].type;
      if (tt === "lbrace") return true;
      // Arguments can be strings, numbers, identifiers, colors
      if (tt === "string" || tt === "number" || tt === "identifier" || tt === "color") {
        ahead++;
        continue;
      }
      break;
    }
    return false;
  }

  function parseObject(): ObjectNode {
    const nameToken = advance(); // identifier
    const startPos = posOf(nameToken);
    const nameRange = rangeOf(nameToken);
    const name = nameToken.value;

    // Parse arguments before '{'
    const args: ExprNode[] = [];
    while (!check("lbrace") && !check("eof")) {
      const t = peek();
      if (
        t.type === "string" ||
        t.type === "number" ||
        t.type === "identifier" ||
        t.type === "color"
      ) {
        args.push(parsePrimary());
      } else {
        break;
      }
    }

    const openBrace = expect("lbrace", "Expected '{'");
    const body = parseBody();
    const closeBrace = expect("rbrace", "Expected '}'");
    const endPos = closeBrace.length > 0 ? endOf(closeBrace) : endOf(tokens[tokens.length - 1]); // EOF position for unclosed structures

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

  function parseBody(stopAtCaseDefault = false): BodyNode[] {
    const body: BodyNode[] = [];

    while (!check("rbrace") && !check("eof")) {
      const t = peek();

      if (t.type === "identifier") {
        if (t.value === "If") {
          body.push(parseIf());
          continue;
        }
        if (t.value === "ApplySwitch") {
          body.push(parseApplySwitch());
          continue;
        }
        if (t.value === "Case" || t.value === "Default") {
          break;
        }
        if (!stopAtCaseDefault && t.value === "Else") {
          break;
        }

        if (pos + 1 < tokens.length && tokens[pos + 1].type === "equals") {
          body.push(parseProperty());
        } else if (isObjectStart()) {
          body.push(parseObject());
        } else {
          addError(`Unexpected identifier '${t.value}'`, rangeOf(t));
          const before = pos;
          synchronize();
          if (pos === before) advance();
        }
        continue;
      }

      addError(`Unexpected token '${t.value || t.type}'`, rangeOf(t));
      const before = pos;
      synchronize();
      if (pos === before) advance();
    }

    return body;
  }

  /**
   * '(' がタプル構文 (値リストの囲み) かどうかを先読みで判定する。
   * タプル: (0.9, 0.0) — '(' 値 ',' ... ')' ';'
   * 演算式: (1+2)*3  — '(' 式 ')' 演算子 ...
   * 判定: ')' の後が ';' または '}' ならタプル、演算子ならカッコ式。
   */
  function isTupleParenStart(): boolean {
    // pos は '(' を指している
    let depth = 1;
    let i = pos + 1;
    let hasComma = false;
    while (i < tokens.length && depth > 0) {
      const tt = tokens[i].type;
      if (tt === "lparen") depth++;
      else if (tt === "rparen") {
        depth--;
        if (depth === 0) break;
      } else if (tt === "comma" && depth === 1) {
        hasComma = true;
      }
      i++;
    }
    if (depth !== 0) return false;
    // ')' の後のトークンを確認
    const afterParen = i + 1 < tokens.length ? tokens[i + 1].type : "eof";
    // カンマがあればタプル確定。なくても ')' の後が ';' や '}' ならタプル（単一値のカッコ囲み）
    if (hasComma) return true;
    return afterParen === "semicolon" || afterParen === "rbrace" || afterParen === "eof";
  }

  function parseProperty(): PropertyNode {
    const nameToken = advance(); // identifier
    const startPos = posOf(nameToken);
    const nameRange = rangeOf(nameToken);
    const name = nameToken.value;

    expect("equals", "Expected '='");

    const values: ExprNode[] = [];

    // RailSim II では値リストをカッコで囲む記法がある: Coord = (0.9, 0.0);
    // カッコはオプショナルなグルーピングとして透過的に扱う。
    // ただし (1+2)*3 のような演算式のカッコとは区別する必要がある。
    // 先読み: '(' の後が 値, ',' のパターンならタプル構文と判断する。
    const parenWrapped = check("lparen") && isTupleParenStart();
    if (parenWrapped) advance(); // '(' を消費

    // Parse comma-separated expressions until ';' (or ')' if paren-wrapped)
    if (check("semicolon") || check("rbrace") || check("eof")) {
      addError(`Expected expression after '='`, rangeOf(peek()));
    } else {
      try {
        values.push(parseExpr());
      } catch {
        synchronize();
        return {
          type: "property",
          name,
          values,
          range: rangeSpan(startPos, endOf(tokens[pos - 1] ?? nameToken)),
          nameRange,
        };
      }

      while (check("comma")) {
        advance(); // ','
        if (check("semicolon") || check("rbrace") || check("eof")) break;
        if (parenWrapped && check("rparen")) break;
        try {
          values.push(parseExpr());
        } catch {
          synchronize();
          break;
        }
      }
    }

    if (parenWrapped) {
      expect("rparen", "Expected ')'");
    }

    const semi = expect("semicolon", "Expected ';'");
    const endPos =
      semi.length > 0
        ? endOf(semi)
        : values.length > 0
          ? values[values.length - 1].range.end
          : endOf(tokens[pos - 1] ?? nameToken);

    return {
      type: "property",
      name,
      values,
      range: rangeSpan(startPos, endPos),
      nameRange,
    };
  }

  function parseIf(): IfNode {
    const ifToken = advance(); // "If"
    const startPos = posOf(ifToken);

    const condition = parseExpr();

    const thenOpen = expect("lbrace", "Expected '{'");
    const thenBody = parseBody();
    let lastBrace = expect("rbrace", "Expected '}'");
    const thenRange = rangeSpan(endOf(thenOpen), posOf(lastBrace));

    let elseBody: BodyNode[] | undefined;
    let elseRange: Range | undefined;

    if (checkValue("identifier", "Else")) {
      advance(); // "Else"
      const elseOpen = expect("lbrace", "Expected '{'");
      elseBody = parseBody();
      lastBrace = expect("rbrace", "Expected '}'");
      elseRange = rangeSpan(endOf(elseOpen), posOf(lastBrace));
    }

    const endPos = lastBrace.length > 0 ? endOf(lastBrace) : endOf(tokens[tokens.length - 1]); // EOF position for unclosed structures

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

  function parseApplySwitch(): ApplySwitchNode {
    const asToken = advance(); // "ApplySwitch"
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
        advance(); // "Default"
        const colonToken = expect("colon", "Expected ':'");
        const bodyStart = endOf(colonToken);
        default_ = parseBody(true);
        // defaultRange ends at the next rbrace/eof (what peek() points to now)
        defaultRange = rangeSpan(bodyStart, posOf(peek()));
      } else {
        addError(`Expected 'Case' or 'Default' in ApplySwitch`, rangeOf(peek()));
        const before = pos;
        synchronize();
        // Guard: if synchronize() didn't advance, force progress to prevent infinite loop
        if (pos === before) advance();
      }
    }

    const closeBraceAS = expect("rbrace", "Expected '}'");
    const endPos = closeBraceAS.length > 0 ? endOf(closeBraceAS) : endOf(tokens[tokens.length - 1]); // EOF position for unclosed structures

    return {
      type: "applySwitch",
      switchName,
      cases,
      default_,
      defaultRange,
      range: rangeSpan(startPos, endPos),
    };
  }

  function parseCase(): CaseNode {
    const caseToken = advance(); // "Case"
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
    // bodyRange ends at the next Case/Default/rbrace (what peek() points to now)
    const bodyEnd = posOf(peek());
    const endPos =
      body.length > 0 ? body[body.length - 1].range.end : endOf(tokens[pos - 1] ?? caseToken);

    return {
      type: "case",
      values,
      body,
      bodyRange: rangeSpan(bodyStart, bodyEnd),
      range: rangeSpan(startPos, endPos),
    };
  }

  // -----------------------------------------------------------------------
  // Run
  // -----------------------------------------------------------------------

  const file = parseFile();
  return { file, diagnostics };
}
