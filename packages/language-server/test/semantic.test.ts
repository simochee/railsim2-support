import { describe, it, expect } from "vitest";
import {
  semanticSchema,
  pluginTypeSchemas,
  getPluginTypeSchema,
  getFileSchema,
} from "../src/schema/semantic.generated.js";

describe("semanticSchema", () => {
  it("全ルートオブジェクトが定義されている", () => {
    for (const entries of Object.values(pluginTypeSchemas)) {
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
    expect(ph.properties["RailSimVersion"]).toMatchObject({ type: "float", required: true });
    expect(ph.properties["PluginType"]).toMatchObject({ type: "enum", required: true });
    expect(ph.properties["PluginName"]).toMatchObject({ type: "string", required: true });
    expect(ph.properties["PluginAuthor"]).toMatchObject({ type: "string", required: true });
  });

  it("RailInfo のプロパティ型が正しい", () => {
    const ri = semanticSchema["RailInfo"];
    expect(ri).toBeDefined();
    expect(ri.properties["Gauge"]).toMatchObject({ type: "float" });
    expect(ri.properties["Height"]).toMatchObject({ type: "float" });
    expect(ri.properties["SurfaceAlt"]).toMatchObject({ type: "float" });
  });

  it("Vertex の Coord が vector-3d", () => {
    const v = semanticSchema["Vertex"];
    expect(v).toBeDefined();
    expect(v.properties["Coord"]).toMatchObject({ type: "vector-3d" });
  });

  it("Axle.Coord は vector-2d (ZY座標系)", () => {
    expect(semanticSchema["Axle"].properties["Coord"]).toMatchObject({ type: "vector-2d" });
  });

  it("TrainInfo に FrontLimit/TailLimit が定義されている", () => {
    const ti = semanticSchema["TrainInfo"];
    expect(ti.properties["FrontLimit"]).toMatchObject({ type: "float", required: true });
    expect(ti.properties["TailLimit"]).toMatchObject({ type: "float", required: true });
  });

  it("PrimaryAssembly に主要な子オブジェクトが定義されている", () => {
    const pa = semanticSchema["PrimaryAssembly"];
    expect(pa.children["Axle"]).toBeDefined();
    expect(pa.children["Body"]).toBeDefined();
    expect(pa.children["Object3D"]).toBeDefined();
    expect(pa.children["FrontCabin"]).toBeDefined();
    expect(pa.children["SoundEffect"]).toBeDefined();
  });

  it("Object3D に材質カスタマイザプロパティが定義されている", () => {
    const o3d = semanticSchema["Object3D"];
    expect(o3d.properties["NoCastShadow"]).toBeDefined();
    expect(o3d.properties["ChangeTexture"]).toMatchObject({ type: "expression", arity: 2 });
    expect(o3d.children["Joint3D"]).toBeDefined();
    expect(o3d.children["ChangeMaterial"]).toBeDefined();
    expect(o3d.children["StaticMove"]).toBeDefined();
  });

  it("Joint3D に AttachCoord/AttachDir が定義されている", () => {
    const j3d = semanticSchema["Joint3D"];
    expect(j3d.properties["AttachCoord"]).toMatchObject({ type: "vector-3d" });
    expect(j3d.properties["AttachDir"]).toMatchObject({ type: "vector-3d" });
    expect(j3d.nameParameter).toBe("string");
  });

  it("ChangeMaterial に MaterialID/Emissive が定義されている", () => {
    const cm = semanticSchema["ChangeMaterial"];
    expect(cm.properties["MaterialID"]).toMatchObject({ type: "expression" });
    expect(cm.properties["Emissive"]).toMatchObject({ type: "vector-3d" });
    expect(cm.properties["Diffuse"]).toMatchObject({ type: "expression", arity: 4 });
  });

  it("Sound に MouseDownWaveFileName が定義されている", () => {
    expect(semanticSchema["Sound"].properties["MouseDownWaveFileName"]).toMatchObject({
      type: "filename",
    });
  });
});

describe("pluginTypeSchemas", () => {
  const expectedPluginTypes = [
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
    "RailwayPluginSet",
  ];

  it("13プラグインタイプ分の定義が存在する", () => {
    for (const pt of expectedPluginTypes) {
      expect(pluginTypeSchemas[pt], `${pt} should be defined`).toBeDefined();
    }
    expect(Object.keys(pluginTypeSchemas)).toHaveLength(expectedPluginTypes.length);
  });

  it("Rail のルートオブジェクトが正しい", () => {
    const rail = pluginTypeSchemas["Rail"];
    const names = rail.map((e) => e.name);
    expect(names).toContain("PluginHeader");
    expect(names).toContain("RailInfo");
    expect(names).toContain("SoundInfo");

    const ph = rail.find((e) => e.name === "PluginHeader")!;
    expect(ph.required).toBe(true);
    expect(ph.multiple).toBe(false);
  });

  it("Train に PrimaryAssembly が含まれる", () => {
    const train = pluginTypeSchemas["Train"];
    const names = train.map((e) => e.name);
    expect(names).toContain("PrimaryAssembly");
    expect(names).toContain("TrainInfo");
    expect(names).toContain("PluginHeader");
  });
});

describe("getPluginTypeSchema", () => {
  it("全12プラグインタイプで正しい結果を返す", () => {
    const types = Object.keys(pluginTypeSchemas);
    for (const pt of types) {
      expect(getPluginTypeSchema(pt)).toBe(pluginTypeSchemas[pt]);
    }
  });

  it("未知のプラグインタイプで undefined を返す", () => {
    expect(getPluginTypeSchema("Unknown")).toBeUndefined();
  });
});

describe("getFileSchema (後方互換)", () => {
  it("ファイル名からPluginType経由でスキーマを取得できる", () => {
    expect(getFileSchema("Rail2.txt")).toBe(pluginTypeSchemas["Rail"]);
    expect(getFileSchema("Train2.txt")).toBe(pluginTypeSchemas["Train"]);
  });

  it("未知のファイル名で undefined を返す", () => {
    expect(getFileSchema("Unknown.txt")).toBeUndefined();
  });
});
