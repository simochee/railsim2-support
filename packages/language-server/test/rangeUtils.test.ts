import { describe, it, expect } from "vitest";
import { containsPosition } from "../src/shared/rangeUtils.js";

describe("containsPosition", () => {
  const range = { start: { line: 1, character: 5 }, end: { line: 3, character: 10 } };

  it("returns true for position inside range", () => {
    expect(containsPosition(range, { line: 2, character: 0 })).toBe(true);
  });

  it("returns true for position at start boundary", () => {
    expect(containsPosition(range, { line: 1, character: 5 })).toBe(true);
  });

  it("returns false for position at end boundary (exclusive)", () => {
    expect(containsPosition(range, { line: 3, character: 10 })).toBe(false);
  });

  it("returns false for position before range", () => {
    expect(containsPosition(range, { line: 0, character: 0 })).toBe(false);
  });

  it("returns false for position after range", () => {
    expect(containsPosition(range, { line: 4, character: 0 })).toBe(false);
  });

  it("returns true for single-line range", () => {
    const singleLine = { start: { line: 5, character: 3 }, end: { line: 5, character: 10 } };
    expect(containsPosition(singleLine, { line: 5, character: 5 })).toBe(true);
    expect(containsPosition(singleLine, { line: 5, character: 2 })).toBe(false);
  });
});
