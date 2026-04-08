import type { Token, TokenType, Range, Position } from "../shared/tokens.js";
import type {
  FileNode, TopLevelNode, BodyNode, ObjectNode, PropertyNode,
  IfNode, ApplySwitchNode, CaseNode, CommentNode, ExprNode,
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
  "==": 7, "!=": 7,
  "<": 6, ">": 6, "<=": 6, ">=": 6,
  "<<": 5, ">>": 5,
  "+": 4, "-": 4,
  "*": 3, "/": 3, "%": 3,
};

const BINARY_TOKEN_TO_OP: Partial<Record<TokenType, string>> = {
  pipePipe: "||",
  ampersandAmpersand: "&&",
  pipe: "|",
  caret: "^",
  ampersand: "&",
  equalsEquals: "==", bangEquals: "!=",
  less: "<", greater: ">", lessEquals: "<=", greaterEquals: ">=",
  lessLess: "<<", greaterGreater: ">>",
  plus: "+", minus: "-",
  star: "*", slash: "/", percent: "%",
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
  // Token length may span multiple lines for block comments, but for
  // simplicity we compute the end assuming single-line tokens.
  return { line: token.line, character: token.character + token.length };
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
      if (t.type === "semicolon") { advance(); return; }
      if (t.type === "rbrace") { return; }
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
      const inner = raw.startsWith('"') && raw.endsWith('"')
        ? raw.slice(1, -1)
        : raw;
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
  // Top-level / body parsing
  // -----------------------------------------------------------------------

  function parseFile(): FileNode {
    const body: TopLevelNode[] = [];
    const startPos: Position = tokens.length > 0 ? posOf(tokens[0]) : { line: 0, character: 0 };

    while (!check("eof")) {
      const node = parseTopLevel();
      if (node) {
        body.push(node);
      }
    }

    // Add comment nodes — place them in the body in order
    for (const ct of commentTokens) {
      body.push({ type: "comment", range: rangeOf(ct) } as CommentNode);
    }
    // Sort body by start position
    body.sort((a, b) => {
      if (a.range.start.line !== b.range.start.line) return a.range.start.line - b.range.start.line;
      return a.range.start.character - b.range.start.character;
    });

    const endPos = tokens.length > 0 ? endOf(tokens[tokens.length - 1]) : { line: 0, character: 0 };

    return {
      type: "file",
      body,
      range: rangeSpan(startPos, endPos),
    };
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
      if (t.type === "string" || t.type === "number" || t.type === "identifier" || t.type === "color") {
        args.push(parsePrimary());
      } else {
        break;
      }
    }

    expect("lbrace", "Expected '{'");
    const body = parseBody();
    const closeBrace = expect("rbrace", "Expected '}'");
    const endPos = endOf(closeBrace.length > 0 ? closeBrace : (tokens[pos - 1] ?? nameToken));

    return {
      type: "object",
      name,
      args,
      body,
      range: rangeSpan(startPos, endPos),
      nameRange,
    };
  }

  function parseBody(): BodyNode[] {
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
          // These should be handled by the ApplySwitch parser
          break;
        }
        if (t.value === "Else") {
          // This should be handled by the If parser
          break;
        }

        // Decide: object or property?
        // identifier followed by '=' → property
        // identifier followed by '{' or identifier followed by string/number/etc then '{' → object
        if (pos + 1 < tokens.length && tokens[pos + 1].type === "equals") {
          body.push(parseProperty());
        } else if (isObjectStart()) {
          body.push(parseObject());
        } else {
          // Unknown — try to parse as property without '='? Error and sync.
          addError(`Unexpected identifier '${t.value}'`, rangeOf(t));
          const before = pos;
          synchronize();
          if (pos === before) advance();
        }
        continue;
      }

      // Unexpected token in body
      addError(`Unexpected token '${t.value || t.type}'`, rangeOf(t));
      const before = pos;
      synchronize();
      if (pos === before) advance();
    }

    // Interleave comment nodes that fall within this body's range
    // (This is handled at the file level; body-level comments are not needed here
    //  since we strip them during tokenization. But we can add them.)

    return body;
  }

  function parseProperty(): PropertyNode {
    const nameToken = advance(); // identifier
    const startPos = posOf(nameToken);
    const nameRange = rangeOf(nameToken);
    const name = nameToken.value;

    expect("equals", "Expected '='");

    const values: ExprNode[] = [];

    // Parse comma-separated expressions until ';'
    if (check("semicolon") || check("rbrace") || check("eof")) {
      addError(`Expected expression after '='`, rangeOf(peek()));
    } else {
      try {
        values.push(parseExpr());
      } catch {
        synchronize();
        return {
          type: "property", name, values, range: rangeSpan(startPos, endOf(tokens[pos - 1] ?? nameToken)), nameRange,
        };
      }

      while (check("comma")) {
        advance(); // ','
        if (check("semicolon") || check("rbrace") || check("eof")) break;
        try {
          values.push(parseExpr());
        } catch {
          synchronize();
          break;
        }
      }
    }

    const semi = expect("semicolon", "Expected ';'");
    const endPos = semi.length > 0 ? endOf(semi) : (values.length > 0 ? values[values.length - 1].range.end : endOf(tokens[pos - 1] ?? nameToken));

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

    expect("lbrace", "Expected '{'");
    const thenBody = parseBody();
    expect("rbrace", "Expected '}'");

    let elseBody: BodyNode[] | undefined;

    if (checkValue("identifier", "Else")) {
      advance(); // "Else"
      expect("lbrace", "Expected '{'");
      elseBody = parseBody();
      expect("rbrace", "Expected '}'");
    }

    const endPos = endOf(tokens[pos - 1] ?? ifToken);

    return {
      type: "if",
      condition,
      then: thenBody,
      else_: elseBody,
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

    while (!check("rbrace") && !check("eof")) {
      if (checkValue("identifier", "Case")) {
        cases.push(parseCase());
      } else if (checkValue("identifier", "Default")) {
        advance(); // "Default"
        expect("colon", "Expected ':'");
        default_ = parseCaseBody();
      } else {
        addError(`Expected 'Case' or 'Default' in ApplySwitch`, rangeOf(peek()));
        const before = pos;
        synchronize();
        // Guard: if synchronize() didn't advance, force progress to prevent infinite loop
        if (pos === before) advance();
      }
    }

    expect("rbrace", "Expected '}'");
    const endPos = endOf(tokens[pos - 1] ?? asToken);

    return {
      type: "applySwitch",
      switchName,
      cases,
      default_,
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

    expect("colon", "Expected ':'");

    const body = parseCaseBody();
    const endPos = body.length > 0 ? body[body.length - 1].range.end : endOf(tokens[pos - 1] ?? caseToken);

    return {
      type: "case",
      values,
      body,
      range: rangeSpan(startPos, endPos),
    };
  }

  function parseCaseBody(): BodyNode[] {
    // Parse body nodes until we hit Case, Default, or }
    const body: BodyNode[] = [];

    while (!check("rbrace") && !check("eof")) {
      const t = peek();
      if (t.type === "identifier" && (t.value === "Case" || t.value === "Default")) {
        break;
      }

      if (t.type === "identifier") {
        if (t.value === "If") {
          body.push(parseIf());
          continue;
        }
        if (t.value === "ApplySwitch") {
          body.push(parseApplySwitch());
          continue;
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

  // -----------------------------------------------------------------------
  // Run
  // -----------------------------------------------------------------------

  const file = parseFile();
  return { file, diagnostics };
}
