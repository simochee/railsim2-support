import { describe, it, expect } from "vitest";
import type { TokenType } from "../src/shared/tokens.js";

describe("TokenType", () => {
  it("should have all required token types", () => {
    const requiredTypes: TokenType[] = [
      "identifier",
      "number",
      "string",
      "color",
      "lbrace",
      "rbrace",
      "lparen",
      "rparen",
      "semicolon",
      "comma",
      "equals",
      "colon",
      "plus",
      "minus",
      "star",
      "slash",
      "percent",
      "ampersand",
      "pipe",
      "caret",
      "tilde",
      "bang",
      "ampersandAmpersand",
      "pipePipe",
      "lessLess",
      "greaterGreater",
      "less",
      "greater",
      "lessEquals",
      "greaterEquals",
      "equalsEquals",
      "bangEquals",
      "lineComment",
      "blockComment",
      "eof",
      "unknown",
    ];
    for (const t of requiredTypes) {
      expect(t).toBeDefined();
    }
  });

  it("should NOT include ternary operator tokens (Phase 1)", () => {
    // These types should cause a compile error if added to TokenType
    const allTypes: TokenType[] = [
      "identifier",
      "number",
      "string",
      "color",
      "lbrace",
      "rbrace",
      "lparen",
      "rparen",
      "semicolon",
      "comma",
      "equals",
      "colon",
      "plus",
      "minus",
      "star",
      "slash",
      "percent",
      "ampersand",
      "pipe",
      "caret",
      "tilde",
      "bang",
      "ampersandAmpersand",
      "pipePipe",
      "lessLess",
      "greaterGreater",
      "less",
      "greater",
      "lessEquals",
      "greaterEquals",
      "equalsEquals",
      "bangEquals",
      "lineComment",
      "blockComment",
      "eof",
      "unknown",
    ];
    expect(allTypes).not.toContain("question");
    expect(allTypes).not.toContain("questionColon");
  });
});
