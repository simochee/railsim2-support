import { describe, it, expect } from "vitest";
import { tokenize } from "../src/server/tokenizer.js";
import type { Token, TokenType } from "../src/shared/tokens.js";

/** Helper: extract just types from token array */
function types(tokens: Token[]): TokenType[] {
  return tokens.map((t) => t.type);
}

/** Helper: extract types and values */
function typesAndValues(tokens: Token[]): [TokenType, string][] {
  return tokens.map((t) => [t.type, t.value]);
}

describe("tokenizer", () => {
  describe("empty input", () => {
    it("returns only eof for empty string", () => {
      const tokens = tokenize("");
      expect(types(tokens)).toEqual(["eof"]);
    });

    it("returns only eof for whitespace-only input", () => {
      const tokens = tokenize("   \t\n  ");
      expect(types(tokens)).toEqual(["eof"]);
    });
  });

  describe("identifiers", () => {
    it("tokenizes simple identifiers", () => {
      const tokens = tokenize("foo bar _baz");
      expect(typesAndValues(tokens)).toEqual([
        ["identifier", "foo"],
        ["identifier", "bar"],
        ["identifier", "_baz"],
        ["eof", ""],
      ]);
    });

    it("tokenizes identifiers with digits", () => {
      const tokens = tokenize("Rail2 _x0 abc123");
      expect(typesAndValues(tokens)).toEqual([
        ["identifier", "Rail2"],
        ["identifier", "_x0"],
        ["identifier", "abc123"],
        ["eof", ""],
      ]);
    });
  });

  describe("numbers", () => {
    it("tokenizes integers", () => {
      const tokens = tokenize("0 42 12345");
      expect(typesAndValues(tokens)).toEqual([
        ["number", "0"],
        ["number", "42"],
        ["number", "12345"],
        ["eof", ""],
      ]);
    });

    it("tokenizes floats", () => {
      const tokens = tokenize("3.14 0.5 100.0");
      expect(typesAndValues(tokens)).toEqual([
        ["number", "3.14"],
        ["number", "0.5"],
        ["number", "100.0"],
        ["eof", ""],
      ]);
    });

    it("does not consume trailing dot without digits", () => {
      // "42." should be number "42" then unknown "."
      const tokens = tokenize("42.");
      expect(typesAndValues(tokens)).toEqual([
        ["number", "42"],
        ["unknown", "."],
        ["eof", ""],
      ]);
    });
  });

  describe("strings", () => {
    it("tokenizes a simple string", () => {
      const tokens = tokenize('"hello"');
      expect(typesAndValues(tokens)).toEqual([
        ["string", '"hello"'],
        ["eof", ""],
      ]);
    });

    it("tokenizes a string with escape sequences", () => {
      const tokens = tokenize('"line\\nbreak"');
      expect(typesAndValues(tokens)).toEqual([
        ["string", '"line\\nbreak"'],
        ["eof", ""],
      ]);
    });

    it("tokenizes a string with escaped quote", () => {
      const tokens = tokenize('"say \\"hi\\""');
      expect(typesAndValues(tokens)).toEqual([
        ["string", '"say \\"hi\\""'],
        ["eof", ""],
      ]);
    });

    it("tokenizes empty string", () => {
      const tokens = tokenize('""');
      expect(typesAndValues(tokens)).toEqual([
        ["string", '""'],
        ["eof", ""],
      ]);
    });
  });

  describe("colors", () => {
    it("tokenizes 8-digit hex color", () => {
      const tokens = tokenize("#FF00AAFF");
      expect(typesAndValues(tokens)).toEqual([
        ["color", "#FF00AAFF"],
        ["eof", ""],
      ]);
    });

    it("tokenizes lowercase hex color", () => {
      const tokens = tokenize("#aabbccdd");
      expect(typesAndValues(tokens)).toEqual([
        ["color", "#aabbccdd"],
        ["eof", ""],
      ]);
    });

    it("does not tokenize 6-digit hex as color", () => {
      const tokens = tokenize("#FF00AA");
      // # is unknown, then FF00AA is identifier
      expect(tokens[0].type).toBe("unknown");
    });
  });

  describe("punctuation", () => {
    it("tokenizes braces, parens, semicolon, comma, equals, colon", () => {
      const tokens = tokenize("{ } ( ) ; , = :");
      expect(types(tokens)).toEqual([
        "lbrace",
        "rbrace",
        "lparen",
        "rparen",
        "semicolon",
        "comma",
        "equals",
        "colon",
        "eof",
      ]);
    });
  });

  describe("two-char operators", () => {
    it("tokenizes << >>", () => {
      const tokens = tokenize("<< >>");
      expect(typesAndValues(tokens)).toEqual([
        ["lessLess", "<<"],
        ["greaterGreater", ">>"],
        ["eof", ""],
      ]);
    });

    it("tokenizes <= >=", () => {
      const tokens = tokenize("<= >=");
      expect(typesAndValues(tokens)).toEqual([
        ["lessEquals", "<="],
        ["greaterEquals", ">="],
        ["eof", ""],
      ]);
    });

    it("tokenizes == !=", () => {
      const tokens = tokenize("== !=");
      expect(typesAndValues(tokens)).toEqual([
        ["equalsEquals", "=="],
        ["bangEquals", "!="],
        ["eof", ""],
      ]);
    });

    it("tokenizes && ||", () => {
      const tokens = tokenize("&& ||");
      expect(typesAndValues(tokens)).toEqual([
        ["ampersandAmpersand", "&&"],
        ["pipePipe", "||"],
        ["eof", ""],
      ]);
    });
  });

  describe("single-char operators", () => {
    it("tokenizes arithmetic operators", () => {
      const tokens = tokenize("+ - * / %");
      expect(types(tokens)).toEqual(["plus", "minus", "star", "slash", "percent", "eof"]);
    });

    it("tokenizes comparison operators", () => {
      const tokens = tokenize("< >");
      expect(types(tokens)).toEqual(["less", "greater", "eof"]);
    });

    it("tokenizes bitwise operators", () => {
      const tokens = tokenize("& ^ | ! ~");
      expect(types(tokens)).toEqual(["ampersand", "caret", "pipe", "bang", "tilde", "eof"]);
    });
  });

  describe("comments", () => {
    it("tokenizes line comment", () => {
      const tokens = tokenize("// this is a comment\nfoo");
      expect(typesAndValues(tokens)).toEqual([
        ["lineComment", "// this is a comment"],
        ["identifier", "foo"],
        ["eof", ""],
      ]);
    });

    it("tokenizes block comment", () => {
      const tokens = tokenize("/* block */");
      expect(typesAndValues(tokens)).toEqual([
        ["blockComment", "/* block */"],
        ["eof", ""],
      ]);
    });

    it("tokenizes multi-line block comment", () => {
      const tokens = tokenize("/* line1\nline2 */");
      expect(tokens[0].type).toBe("blockComment");
      expect(tokens[0].value).toBe("/* line1\nline2 */");
    });
  });

  describe("position tracking", () => {
    it("tracks line and character across lines", () => {
      const tokens = tokenize("a\nb\nc");
      // a at line 0, char 0
      expect(tokens[0]).toMatchObject({ line: 0, character: 0, offset: 0 });
      // b at line 1, char 0
      expect(tokens[1]).toMatchObject({ line: 1, character: 0, offset: 2 });
      // c at line 2, char 0
      expect(tokens[2]).toMatchObject({ line: 2, character: 0, offset: 4 });
    });

    it("tracks character offset within a line", () => {
      const tokens = tokenize("foo bar");
      expect(tokens[0]).toMatchObject({ line: 0, character: 0, offset: 0 });
      expect(tokens[1]).toMatchObject({ line: 0, character: 4, offset: 4 });
    });

    it("tracks length correctly", () => {
      const tokens = tokenize("hello 123 3.14");
      expect(tokens[0].length).toBe(5); // "hello"
      expect(tokens[1].length).toBe(3); // "123"
      expect(tokens[2].length).toBe(4); // "3.14"
    });
  });

  describe("unknown tokens", () => {
    it("tokenizes ? as unknown", () => {
      const tokens = tokenize("?");
      expect(typesAndValues(tokens)).toEqual([
        ["unknown", "?"],
        ["eof", ""],
      ]);
    });

    it("tokenizes . as unknown", () => {
      const tokens = tokenize(".");
      expect(typesAndValues(tokens)).toEqual([
        ["unknown", "."],
        ["eof", ""],
      ]);
    });
  });

  describe("full-width space", () => {
    it("skips full-width space (U+3000)", () => {
      const tokens = tokenize("a\u3000b");
      expect(typesAndValues(tokens)).toEqual([
        ["identifier", "a"],
        ["identifier", "b"],
        ["eof", ""],
      ]);
    });
  });

  describe("realistic RailSim2 snippet", () => {
    it("tokenizes a PluginHeader block", () => {
      const source = `PluginHeader {
  RailSimVersion = 2.14;
  PluginType = Rail;
  PluginName = "Test Rail";
}`;
      const tokens = tokenize(source);
      expect(typesAndValues(tokens)).toEqual([
        ["identifier", "PluginHeader"],
        ["lbrace", "{"],
        ["identifier", "RailSimVersion"],
        ["equals", "="],
        ["number", "2.14"],
        ["semicolon", ";"],
        ["identifier", "PluginType"],
        ["equals", "="],
        ["identifier", "Rail"],
        ["semicolon", ";"],
        ["identifier", "PluginName"],
        ["equals", "="],
        ["string", '"Test Rail"'],
        ["semicolon", ";"],
        ["rbrace", "}"],
        ["eof", ""],
      ]);
    });

    it("tracks positions in a multi-line snippet", () => {
      const source = `PluginHeader {
  RailSimVersion = 2.14;
}`;
      const tokens = tokenize(source);
      // PluginHeader at line 0, char 0
      expect(tokens[0]).toMatchObject({ line: 0, character: 0 });
      // { at line 0, char 13
      expect(tokens[1]).toMatchObject({ line: 0, character: 13 });
      // RailSimVersion at line 1, char 2
      expect(tokens[2]).toMatchObject({ line: 1, character: 2 });
      // } at line 2, char 0
      const rbrace = tokens.find((t) => t.type === "rbrace");
      expect(rbrace).toMatchObject({ line: 2, character: 0 });
    });
  });

  describe("edge cases", () => {
    it("should handle unterminated string", () => {
      const tokens = tokenize('"unterminated');
      expect(tokens[0].type).toBe("string");
      expect(tokens[1].type).toBe("eof");
    });

    it("should handle unterminated block comment", () => {
      const tokens = tokenize("/* never closed");
      expect(tokens[0].type).toBe("blockComment");
      expect(tokens[1].type).toBe("eof");
    });

    it("should not match color with more than 8 hex digits", () => {
      const tokens = tokenize("#123456789");
      // Should NOT be a color token — the 9th digit breaks the word boundary
      expect(tokens[0].type).not.toBe("color");
    });

    it("should match color with exactly 8 hex digits followed by non-hex", () => {
      const tokens = tokenize("#FF00FF80;");
      expect(tokens[0]).toMatchObject({ type: "color", value: "#FF00FF80" });
      expect(tokens[1]).toMatchObject({ type: "semicolon" });
    });
  });
});
