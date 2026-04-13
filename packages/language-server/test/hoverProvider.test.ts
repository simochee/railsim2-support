import { describe, it, expect } from "vitest";
import { getHover } from "../src/server/hoverProvider.js";
import { parse } from "../src/server/parser.js";
import type { Position } from "vscode-languageserver";
import { MarkupKind } from "vscode-languageserver";

function pos(line: number, character: number): Position {
  return { line, character };
}

function setupHover(source: string, position: Position) {
  const { file } = parse(source);
  return getHover(file, position);
}

describe("getHover", () => {
  // ── Object name hover ───────────────────────────────────────────────

  it("should return markdown hover for a known object name (Body)", () => {
    const src = "Body {\n}";
    // "Body" spans characters 0..3 on line 0
    const hover = setupHover(src, pos(0, 1));

    expect(hover).not.toBeNull();
    expect(hover!.contents).toEqual(
      expect.objectContaining({ kind: MarkupKind.Markdown }),
    );
    const md = (hover!.contents as { kind: string; value: string }).value;
    expect(md).toContain("**Body**");
    expect(md).toContain("車輌の台車や本体を構成する基本的なオブジェクト");
    expect(md).toContain("https://railsim2.simochee.net/");
  });

  it("should return markdown hover for RailInfo object", () => {
    const src = "RailInfo {\n  Gauge = 1.067;\n}";
    const hover = setupHover(src, pos(0, 3));

    expect(hover).not.toBeNull();
    const md = (hover!.contents as { kind: string; value: string }).value;
    expect(md).toContain("**RailInfo**");
    expect(md).toContain("レールプラグイン");
  });

  // ── Property name hover ─────────────────────────────────────────────

  it("should return markdown hover for a known property (Gauge in RailInfo)", () => {
    const src = "RailInfo {\n  Gauge = 1.067;\n}";
    // "Gauge" is at line 1, characters 2..6
    const hover = setupHover(src, pos(1, 3));

    expect(hover).not.toBeNull();
    const md = (hover!.contents as { kind: string; value: string }).value;
    expect(md).toContain("**Gauge**");
    expect(md).toContain("ゲージ幅");
  });

  it("should return hover with help link for property", () => {
    const src = "RailInfo {\n  Height = 0.15;\n}";
    const hover = setupHover(src, pos(1, 4));

    expect(hover).not.toBeNull();
    const md = (hover!.contents as { kind: string; value: string }).value;
    expect(md).toContain("**Height**");
    expect(md).toContain("https://railsim2.simochee.net/");
  });

  // ── Null cases ──────────────────────────────────────────────────────

  it("should return null for whitespace/empty area", () => {
    const src = "Body {\n  \n}";
    // Line 1 is just whitespace
    const hover = setupHover(src, pos(1, 1));
    expect(hover).toBeNull();
  });

  it("should return null for a comment line", () => {
    const src = "Body {\n  // this is a comment\n}";
    // Position inside the comment text
    const hover = setupHover(src, pos(1, 10));
    expect(hover).toBeNull();
  });

  it("should return null for an unknown object name", () => {
    const src = "UnknownThing {\n}";
    const hover = setupHover(src, pos(0, 3));
    expect(hover).toBeNull();
  });

  it("should return help link for unknown property under known object", () => {
    const src = "Body {\n  SomeUnknownProp = 1;\n}";
    const hover = setupHover(src, pos(1, 5));
    // No property-level doc, but parent object has a help link so hover is returned
    expect(hover).not.toBeNull();
    const md = (hover!.contents as { kind: string; value: string }).value;
    expect(md).toContain("**SomeUnknownProp**");
    expect(md).toContain("https://railsim2.simochee.net/");
  });

  it("should return null for unknown property under unknown object", () => {
    const src = "UnknownObj {\n  UnknownProp = 1;\n}";
    const hover = setupHover(src, pos(1, 5));
    expect(hover).toBeNull();
  });

  // ── Nested object ───────────────────────────────────────────────────

  it("should return hover for a property inside a nested object", () => {
    const src = "RailInfo {\n  Gauge = 1.067;\n  Height = 0.15;\n}";
    const hover = setupHover(src, pos(2, 4));

    expect(hover).not.toBeNull();
    const md = (hover!.contents as { kind: string; value: string }).value;
    expect(md).toContain("**Height**");
  });
});
