import { describe, it, expect } from "vitest";
import { parse } from "../src/server/parser.js";
import { validateUnknownKeywords } from "../src/server/validator/unknownKeywordValidator.js";

describe("unknown keyword validator", () => {
  it("should not warn for known object names", () => {
    const { file } = parse("Body { Coord = 1; }");
    const diags = validateUnknownKeywords(file);
    expect(diags).toHaveLength(0);
  });

  it("should warn for unknown object names", () => {
    const { file } = parse("FooBar { }");
    const diags = validateUnknownKeywords(file);
    expect(diags).toHaveLength(1);
    expect(diags[0].severity).toBe("warning");
    expect(diags[0].message).toContain("FooBar");
  });

  it("should warn for unknown property names", () => {
    const { file } = parse("Body { UnknownProp = 1; }");
    const diags = validateUnknownKeywords(file);
    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("UnknownProp");
  });

  it("should not warn for identifiers in value position", () => {
    const { file } = parse("PluginHeader { PluginType = Rail; }");
    const diags = validateUnknownKeywords(file);
    expect(diags).toHaveLength(0);
  });

  it("should not warn for control keywords (If, ApplySwitch)", () => {
    const { file } = parse('Body { If 1 { Coord = 0; } }');
    const diags = validateUnknownKeywords(file);
    expect(diags).toHaveLength(0);
  });

  it("should validate inside nested objects", () => {
    const { file } = parse("Body { Inner { BadProp = 1; } }");
    const diags = validateUnknownKeywords(file);
    // Inner is unknown object, BadProp is unknown property
    expect(diags.length).toBeGreaterThanOrEqual(2);
  });

  it("should validate inside If/Else bodies", () => {
    const { file } = parse("Body { If 1 { BadProp = 0; } }");
    const diags = validateUnknownKeywords(file);
    expect(diags.some(d => d.message.includes("BadProp"))).toBe(true);
  });

  it("should validate inside ApplySwitch Case bodies", () => {
    const { file } = parse('ApplySwitch "_X" { Case 0: BadProp = 1; }');
    const diags = validateUnknownKeywords(file);
    expect(diags.some(d => d.message.includes("BadProp"))).toBe(true);
  });
});
