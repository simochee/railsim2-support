import { describe, it, expect } from "vitest";
import { SymbolTable } from "../../scripts/lib/symbol-table.js";
import { emitSemanticSchema } from "../../scripts/lib/schema-emitter.js";

const HELP_DIR = new URL(
  "../../../../vendor/railsim2/Distribution/jp/RailSim2/Help/",
  import.meta.url,
).pathname;

describe("emitSemanticSchema", () => {
  let output: string;

  // Build once
  it("emits without error", () => {
    const table = SymbolTable.fromHelpDir(HELP_DIR);
    output = emitSemanticSchema(table);
    expect(output).toBeDefined();
  });

  it("contains export const semanticSchema", () => {
    expect(output).toContain("export const semanticSchema");
  });

  it("contains export const pluginTypeSchemas", () => {
    expect(output).toContain("export const pluginTypeSchemas");
  });

  it("contains all 12 plugin types in pluginTypeSchemas", () => {
    const expectedTypes = [
      "Rail",
      "Tie",
      "Girder",
      "Pier",
      "Line",
      "Pole",
      "Train",
      "Station",
      "Struct",
      "Surface",
      "Env",
      "Skin",
    ];
    for (const pt of expectedTypes) {
      expect(output).toContain(`${pt}: [`);
    }
  });

  it("RailInfo has Gauge property", () => {
    // Should contain Gauge as a property key within the RailInfo object
    expect(output).toMatch(/RailInfo[\s\S]*?Gauge/);
  });

  it("Object3D has Joint3D as child", () => {
    expect(output).toMatch(/Object3D[\s\S]*?Joint3D/);
  });

  it("contains getFileSchema function", () => {
    expect(output).toContain("export function getFileSchema");
  });

  it("contains import from schemaTypes", () => {
    expect(output).toContain('from "./schemaTypes.js"');
  });

  it("has valid TypeScript structure (no JSON.stringify artifacts)", () => {
    // Should not contain raw JSON patterns
    expect(output).not.toMatch(/"properties":\s*\{"/);
    // Should use object literal syntax
    expect(output).toMatch(/properties:\s*\{/);
  });

  it("emits enum type with enumValues", () => {
    // PluginType is an enum in PluginHeader
    expect(output).toMatch(/type:\s*"enum"/);
    expect(output).toMatch(/enumValues:\s*\[/);
  });

  it("PluginHeader is required and not multiple in every plugin type schema", () => {
    // PluginHeader should appear in plugin type schemas as required: true, multiple: false
    const headerMatches = output.match(
      /name:\s*"PluginHeader",\s*required:\s*true,\s*multiple:\s*false/g,
    );
    // Should appear 12 times (once per plugin type)
    expect(headerMatches).not.toBeNull();
    expect(headerMatches!.length).toBe(12);
  });
});
