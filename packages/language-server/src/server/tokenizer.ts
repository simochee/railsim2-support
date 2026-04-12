import type { Token, TokenType } from "../shared/tokens.js";

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let line = 0;
  let character = 0;

  function peek(): string {
    return pos < source.length ? source[pos] : "\0";
  }

  function peekNext(): string {
    return pos + 1 < source.length ? source[pos + 1] : "\0";
  }

  function advance(): string {
    const ch = source[pos];
    pos++;
    if (ch === "\n") {
      line++;
      character = 0;
    } else {
      character++;
    }
    return ch;
  }

  function makeToken(
    type: TokenType,
    value: string,
    startLine: number,
    startChar: number,
    startOffset: number,
  ): Token {
    return {
      type,
      value,
      line: startLine,
      character: startChar,
      offset: startOffset,
      length: value.length,
    };
  }

  function isWhitespace(ch: string): boolean {
    return ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\u3000";
  }

  function isAlpha(ch: string): boolean {
    return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_";
  }

  function isDigit(ch: string): boolean {
    return ch >= "0" && ch <= "9";
  }

  function isHexDigit(ch: string): boolean {
    return isDigit(ch) || (ch >= "a" && ch <= "f") || (ch >= "A" && ch <= "F");
  }

  function isAlphaNumeric(ch: string): boolean {
    return isAlpha(ch) || isDigit(ch);
  }

  while (pos < source.length) {
    // Skip whitespace
    if (isWhitespace(peek())) {
      advance();
      continue;
    }

    const startLine = line;
    const startChar = character;
    const startOffset = pos;

    const ch = peek();

    // Line comment
    if (ch === "/" && peekNext() === "/") {
      advance(); // /
      advance(); // /
      while (pos < source.length && peek() !== "\n") {
        advance();
      }
      const value = source.slice(startOffset, pos);
      tokens.push(makeToken("lineComment", value, startLine, startChar, startOffset));
      continue;
    }

    // Block comment
    if (ch === "/" && peekNext() === "*") {
      advance(); // /
      advance(); // *
      while (pos < source.length) {
        if (peek() === "*" && peekNext() === "/") {
          advance(); // *
          advance(); // /
          break;
        }
        advance();
      }
      const value = source.slice(startOffset, pos);
      tokens.push(makeToken("blockComment", value, startLine, startChar, startOffset));
      continue;
    }

    // Identifier
    if (isAlpha(ch)) {
      while (pos < source.length && isAlphaNumeric(peek())) {
        advance();
      }
      const value = source.slice(startOffset, pos);
      tokens.push(makeToken("identifier", value, startLine, startChar, startOffset));
      continue;
    }

    // .N 形式の数値 (例: .5, .123)
    if (ch === "." && pos + 1 < source.length && isDigit(source[pos + 1])) {
      advance(); // .
      while (pos < source.length && isDigit(peek())) {
        advance();
      }
      const value = source.slice(startOffset, pos);
      tokens.push(makeToken("number", value, startLine, startChar, startOffset));
      continue;
    }

    // Number
    if (isDigit(ch)) {
      while (pos < source.length && isDigit(peek())) {
        advance();
      }
      if (peek() === "." && isDigit(peekNext())) {
        advance(); // .
        while (pos < source.length && isDigit(peek())) {
          advance();
        }
      }
      const value = source.slice(startOffset, pos);
      tokens.push(makeToken("number", value, startLine, startChar, startOffset));
      continue;
    }

    // String
    if (ch === '"') {
      advance(); // opening "
      while (pos < source.length && peek() !== '"' && peek() !== "\n") {
        if (peek() === "\\" && pos + 1 < source.length && source[pos + 1] === '"') {
          advance(); // backslash
          advance(); // escaped quote
        } else {
          advance();
        }
      }
      if (pos < source.length) {
        advance(); // closing "
      }
      const value = source.slice(startOffset, pos);
      tokens.push(makeToken("string", value, startLine, startChar, startOffset));
      continue;
    }

    // Color: #RRGGBBAA (exactly 8 hex digits)
    if (ch === "#") {
      let hexCount = 0;
      let tempPos = pos + 1;
      while (tempPos < source.length && hexCount < 8 && isHexDigit(source[tempPos])) {
        hexCount++;
        tempPos++;
      }
      // Word boundary check: next char after 8 hex digits must not be a hex digit or word char
      const nextAfterHex = tempPos < source.length ? source[tempPos] : "";
      const isWordBoundary = !nextAfterHex || !/[0-9A-Fa-f_A-Za-z]/.test(nextAfterHex);
      if (hexCount === 8 && isWordBoundary) {
        // Consume # + 8 hex digits
        advance(); // #
        for (let i = 0; i < 8; i++) {
          advance();
        }
        const value = source.slice(startOffset, pos);
        tokens.push(makeToken("color", value, startLine, startChar, startOffset));
        continue;
      }
      // Not a valid color, fall through to unknown
    }

    // Two-char operators
    const next = peekNext();
    const twoChar = ch + next;
    const twoCharMap: Record<string, TokenType> = {
      "<<": "lessLess",
      ">>": "greaterGreater",
      "<=": "lessEquals",
      ">=": "greaterEquals",
      "==": "equalsEquals",
      "!=": "bangEquals",
      "&&": "ampersandAmpersand",
      "||": "pipePipe",
    };
    if (twoCharMap[twoChar]) {
      advance();
      advance();
      tokens.push(makeToken(twoCharMap[twoChar], twoChar, startLine, startChar, startOffset));
      continue;
    }

    // Single-char operators/punctuation
    const singleCharMap: Record<string, TokenType> = {
      "{": "lbrace",
      "}": "rbrace",
      "(": "lparen",
      ")": "rparen",
      ";": "semicolon",
      ",": "comma",
      "=": "equals",
      ":": "colon",
      "+": "plus",
      "-": "minus",
      "*": "star",
      "/": "slash",
      "%": "percent",
      "<": "less",
      ">": "greater",
      "&": "ampersand",
      "^": "caret",
      "|": "pipe",
      "!": "bang",
      "~": "tilde",
    };
    if (singleCharMap[ch]) {
      advance();
      tokens.push(makeToken(singleCharMap[ch], ch, startLine, startChar, startOffset));
      continue;
    }

    // Unknown
    advance();
    tokens.push(makeToken("unknown", ch, startLine, startChar, startOffset));
  }

  // EOF token
  tokens.push(makeToken("eof", "", line, character, pos));

  return tokens;
}
