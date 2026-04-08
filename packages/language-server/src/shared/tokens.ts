export type TokenType =
  | "identifier" | "number" | "string" | "color"
  | "lbrace" | "rbrace" | "lparen" | "rparen"
  | "semicolon" | "comma" | "equals" | "colon"
  | "plus" | "minus" | "star" | "slash" | "percent"
  | "ampersand" | "pipe" | "caret" | "tilde" | "bang"
  | "ampersandAmpersand" | "pipePipe"
  | "lessLess" | "greaterGreater"
  | "less" | "greater" | "lessEquals" | "greaterEquals"
  | "equalsEquals" | "bangEquals"
  | "lineComment" | "blockComment"
  | "eof" | "unknown";

export interface Token {
  type: TokenType;
  value: string;
  line: number;       // 0-based
  character: number;  // 0-based offset within line
  offset: number;     // absolute offset from start
  length: number;
}

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}
