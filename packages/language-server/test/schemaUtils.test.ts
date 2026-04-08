import { describe, it, expect } from "vitest";
import { resolveSchemaKey } from "../src/schema/schemaUtils.js";

describe("resolveSchemaKey", () => {
  it("親なし → オブジェクト名そのまま", () => {
    expect(resolveSchemaKey("RailInfo", undefined)).toBe("RailInfo");
  });

  it("親あり + schemaKey なし → オブジェクト名そのまま", () => {
    expect(resolveSchemaKey("Face", "Profile")).toBe("Face");
  });

  it("親あり + schemaKey あり → schemaKey を返す", () => {
    // Face's children has Vertex with schemaKey "Vertex:Profile"
    expect(resolveSchemaKey("Vertex", "Face")).toBe("Vertex:Profile");
  });

  it("親あり + 子が存在しない → オブジェクト名そのまま", () => {
    expect(resolveSchemaKey("Unknown", "RailInfo")).toBe("Unknown");
  });
});
