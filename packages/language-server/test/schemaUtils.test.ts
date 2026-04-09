import { describe, it, expect } from "vitest";
import { resolveSchemaKey } from "../src/schema/schemaUtils.js";

describe("resolveSchemaKey", () => {
  it("親なし → オブジェクト名そのまま", () => {
    expect(resolveSchemaKey("RailInfo", undefined)).toBe("RailInfo");
  });

  it("親あり + schemaKey なし → オブジェクト名そのまま", () => {
    expect(resolveSchemaKey("Face", "Profile")).toBe("Face");
  });

  it("親あり + schemaKey あり → schemaKey を���す", () => {
    // LensFlare's children has Circle with schemaKey "Circle:LensFlare"
    expect(resolveSchemaKey("Circle", "LensFlare")).toBe("Circle:LensFlare");
  });

  it("親あり + 子が存在しない → オブジェクト名そのまま", () => {
    expect(resolveSchemaKey("Unknown", "RailInfo")).toBe("Unknown");
  });
});
