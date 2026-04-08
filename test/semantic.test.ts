import { describe, it, expect } from "vitest";
import { semanticSchema, fileSchemas, getFileSchema } from "../src/schema/semantic.js";
import { OBJECT_NAME_SET, PROPERTY_NAME_SET } from "../src/shared/keywords.js";

describe("semanticSchema", () => {
  it("全ルートオブジェクトが定義されている", () => {
    for (const entries of Object.values(fileSchemas)) {
      for (const entry of entries) {
        expect(
          semanticSchema[entry.name],
          `${entry.name} should be defined in semanticSchema`,
        ).toBeDefined();
      }
    }
  });

  it("PluginHeader の必須プロパティが正しい", () => {
    const ph = semanticSchema["PluginHeader"];
    expect(ph).toBeDefined();
    expect(ph.properties["RailSimVersion"]).toMatchObject({ type: "string", required: true });
    expect(ph.properties["PluginType"]).toMatchObject({ type: "enum", required: true });
    expect(ph.properties["PluginName"]).toMatchObject({ type: "string", required: true });
    expect(ph.properties["PluginAuthor"]).toMatchObject({ type: "string", required: true });
  });

  it("RailInfo のプロパティ型が正しい", () => {
    const ri = semanticSchema["RailInfo"];
    expect(ri).toBeDefined();
    expect(ri.properties["Gauge"]).toMatchObject({ type: "float" });
    expect(ri.properties["ModelFileName"]).toMatchObject({ type: "filename" });
  });

  it("Vertex:Profile と Vertex:Wireframe が異なる Coord 型を持つ", () => {
    const vp = semanticSchema["Vertex:Profile"];
    const vw = semanticSchema["Vertex:Wireframe"];
    expect(vp).toBeDefined();
    expect(vw).toBeDefined();
    expect(vp.properties["Coord"]).toMatchObject({ type: "vector-2d" });
    expect(vw.properties["Coord"]).toMatchObject({ type: "vector-3d" });
  });
});

describe("fileSchemas", () => {
  const expectedFiles = [
    "Rail2.txt", "Tie2.txt", "Girder2.txt", "Pier2.txt",
    "Line2.txt", "Pole2.txt", "Train2.txt", "Station2.txt",
    "Struct2.txt", "Surface2.txt", "Env2.txt", "Skin2.txt",
  ];

  it("12ファイル分の定義が存在する", () => {
    for (const f of expectedFiles) {
      expect(fileSchemas[f], `${f} should be defined`).toBeDefined();
    }
    expect(Object.keys(fileSchemas)).toHaveLength(expectedFiles.length);
  });

  it("Rail2.txt のルートオブジェクトが正しい", () => {
    const rail = fileSchemas["Rail2.txt"];
    const names = rail.map((e) => e.name);
    expect(names).toContain("PluginHeader");
    expect(names).toContain("RailInfo");
    expect(names).toContain("SoundInfo");
    expect(names).toContain("Profile");
    expect(names).toContain("Wireframe");
    expect(names).toContain("Interval");

    const ph = rail.find((e) => e.name === "PluginHeader")!;
    expect(ph.required).toBe(true);
    expect(ph.multiple).toBe(false);
  });
});

describe("getFileSchema", () => {
  it("全12ファイルで正しい結果を返す", () => {
    const files = Object.keys(fileSchemas);
    for (const f of files) {
      expect(getFileSchema(f)).toBe(fileSchemas[f]);
    }
  });

  it("未知のファイル名で undefined を返す", () => {
    expect(getFileSchema("Unknown.txt")).toBeUndefined();
  });
});

describe("keywords.ts との整合性", () => {
  it("semantic schema のオブジェクト名が keywords.ts に含まれる（内部 lookup key を除く）", () => {
    for (const key of Object.keys(semanticSchema)) {
      // schemaKey（コロン含む）は内部 lookup 用なのでスキップ
      if (key.includes(":")) continue;
      expect(
        OBJECT_NAME_SET.has(key),
        `Object "${key}" in semanticSchema should exist in OBJECT_NAMES`,
      ).toBe(true);
    }
  });

  it("semantic schema のプロパティ名が keywords.ts に含まれる", () => {
    for (const [objName, schema] of Object.entries(semanticSchema)) {
      for (const propName of Object.keys(schema.properties)) {
        expect(
          PROPERTY_NAME_SET.has(propName),
          `Property "${propName}" in ${objName} should exist in PROPERTY_NAMES`,
        ).toBe(true);
      }
    }
  });
});
