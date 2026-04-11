import { describe, it, expect } from "vitest";
import { mapOffsetByNonWhitespace } from "./lsp.js";

describe("mapOffsetByNonWhitespace", () => {
  it("should keep cursor at same content position when indentation changes", () => {
    const oldText = "  Coord = 1;";
    const newText = "\tCoord = 1;";
    // Cursor on 'C' (offset 2 in old text)
    expect(mapOffsetByNonWhitespace(oldText, newText, 2)).toBe(1);
  });

  it("should keep cursor at same content position when spaces are removed", () => {
    const oldText = "Coord  =  1;";
    const newText = "Coord = 1;";
    // Cursor on '1' (offset 10 in old: 'Coord  =  |1')
    expect(mapOffsetByNonWhitespace(oldText, newText, 10)).toBe(8);
  });

  it("should handle cursor at beginning of text (in leading whitespace)", () => {
    const oldText = "  Coord = 1;";
    const newText = "\tCoord = 1;";
    // Cursor at offset 0 is in whitespace region, stays at start
    expect(mapOffsetByNonWhitespace(oldText, newText, 0)).toBe(0);
  });

  it("should handle cursor at end of text", () => {
    const oldText = "Coord = 1;";
    const newText = "\tCoord = 1;\n";
    // Cursor at EOF (on WS boundary), stays right after the last non-WS char
    expect(mapOffsetByNonWhitespace(oldText, newText, 10)).toBe(11);
  });

  it("should handle line split (single line to multi-line)", () => {
    const oldText = "Body{Coord=1;}";
    const newText = "Body {\n\tCoord = 1;\n}\n";
    // Cursor on 'C' in old text (offset 5: 'Body{|C')
    const newOffset = mapOffsetByNonWhitespace(oldText, newText, 5);
    expect(newText[newOffset]).toBe("C");
  });

  it("should handle line split - cursor on closing brace", () => {
    const oldText = "Body{Coord=1;}";
    const newText = "Body {\n\tCoord = 1;\n}\n";
    // Cursor on '}' in old text (offset 13: 'Body{Coord=1;|}')
    const newOffset = mapOffsetByNonWhitespace(oldText, newText, 13);
    expect(newText[newOffset]).toBe("}");
  });

  it("should handle empty text", () => {
    expect(mapOffsetByNonWhitespace("", "", 0)).toBe(0);
  });

  it("should handle whitespace-only text", () => {
    const oldText = "   ";
    const newText = "";
    expect(mapOffsetByNonWhitespace(oldText, newText, 2)).toBe(0);
  });

  it("should handle cursor in whitespace region (on blank line)", () => {
    const oldText = "A = 1;\n\nB = 2;";
    const newText = "A = 1;\n\nB = 2;\n";
    // Cursor on blank line (offset 7, the 2nd \n between A and B lines)
    const newOffset = mapOffsetByNonWhitespace(oldText, newText, 7);
    // Should stay on the blank line, not jump to 'B'
    expect(newOffset).toBe(7);
  });

  it("should handle cursor in trailing whitespace at EOF", () => {
    const oldText = "Coord = 1;\n\n";
    const newText = "Coord = 1;\n";
    // Cursor at EOF (offset 12)
    expect(mapOffsetByNonWhitespace(oldText, newText, 12)).toBe(11);
  });

  it("should handle nested object formatting", () => {
    const oldText = 'Body{Object3D "main"{Coord=1;}}';
    const newText = 'Body {\n\tObject3D "main" {\n\t\tCoord = 1;\n\t}\n}\n';
    // Cursor on '1' in Coord=1 (offset 27 in old: B(0)o(1)d(2)y(3){(4)O(5)...=(26)1(27))
    const newOffset = mapOffsetByNonWhitespace(oldText, newText, 27);
    expect(newText[newOffset]).toBe("1");
  });
});
