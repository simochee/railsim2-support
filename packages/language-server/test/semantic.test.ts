import { describe, it, expect } from "vitest";
import { semanticSchema, fileSchemas, getFileSchema } from "../src/schema/semantic.js";

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
    expect(ph.properties["RailSimVersion"]).toMatchObject({ type: "expression", required: true });
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

  it("Axle.Coord は vector-2d (ZY座標系)", () => {
    expect(semanticSchema["Axle"].properties["Coord"]).toMatchObject({ type: "vector-2d" });
  });

  it("TrainInfo.Gauge は optional", () => {
    expect(semanticSchema["TrainInfo"].properties["Gauge"]).toMatchObject({ required: false });
  });

  it("TrainInfo.Body は optional", () => {
    expect(semanticSchema["TrainInfo"].children["Body"]).toMatchObject({ required: false });
  });

  it("PrimaryAssembly に主要な子オブジェクトが定義されている", () => {
    const pa = semanticSchema["PrimaryAssembly"];
    expect(pa.children["Axle"]).toBeDefined();
    expect(pa.children["Body"]).toBeDefined();
    expect(pa.children["Object3D"]).toBeDefined();
    expect(pa.children["FrontCabin"]).toBeDefined();
    expect(pa.children["Sound"]).toBeDefined();
    expect(pa.children["SoundEffect"]).toMatchObject({ schemaKey: "SoundEffect:Train" });
  });

  it("SoundEffect:Train は Sound と同等のプロパティを持つ", () => {
    const se = semanticSchema["SoundEffect:Train"];
    expect(se).toBeDefined();
    expect(se.properties["WaveFileName"]).toMatchObject({ type: "filename", required: true });
    expect(se.properties["SourceCoord"]).toMatchObject({ type: "vector-3d" });
  });

  it("Object3D に材質カスタマイザプロパティが定義されている", () => {
    const o3d = semanticSchema["Object3D"];
    expect(o3d.properties["NoCastShadow"]).toMatchObject({ type: "integer", multiple: true });
    expect(o3d.properties["ChangeTexture"]).toMatchObject({ type: "expression", arity: 2, multiple: true });
    expect(o3d.children["Joint3D"]).toBeDefined();
    expect(o3d.children["ChangeMaterial"]).toBeDefined();
    expect(o3d.children["StaticMove"]).toMatchObject({ multiple: true });
  });

  it("Joint3D に AttachCoord/AttachDir/DirLink が定義されている", () => {
    const j3d = semanticSchema["Joint3D"];
    expect(j3d.properties["AttachCoord"]).toMatchObject({ type: "vector-3d" });
    expect(j3d.properties["AttachDir"]).toMatchObject({ type: "vector-3d" });
    expect(j3d.properties["DirLink"]).toMatchObject({ type: "identifier" });
    expect(j3d.nameParameter).toBe("identifier");
  });

  it("ChangeMaterial に MaterialID/Emissive が定義されている", () => {
    const cm = semanticSchema["ChangeMaterial"];
    expect(cm.properties["MaterialID"]).toMatchObject({ type: "integer" });
    expect(cm.properties["Emissive"]).toMatchObject({ type: "float", arity: 3 });
    expect(cm.properties["Diffuse"]).toMatchObject({ type: "float", arity: 4 });
  });

  it("Sound に SourceCoord が定義されている", () => {
    expect(semanticSchema["Sound"].properties["SourceCoord"]).toMatchObject({ type: "vector-3d" });
  });
});

describe("fileSchemas", () => {
  const expectedFiles = [
    "Rail2.txt",
    "Tie2.txt",
    "Girder2.txt",
    "Pier2.txt",
    "Line2.txt",
    "Pole2.txt",
    "Train2.txt",
    "Station2.txt",
    "Struct2.txt",
    "Surface2.txt",
    "Env2.txt",
    "Skin2.txt",
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

  it("Train2.txt に DefineSwitch と PrimaryAssembly が含まれる", () => {
    const train = fileSchemas["Train2.txt"];
    const names = train.map((e) => e.name);
    expect(names).toContain("DefineSwitch");
    expect(names).toContain("PrimaryAssembly");

    const ds = train.find((e) => e.name === "DefineSwitch")!;
    expect(ds.required).toBe(false);
    expect(ds.multiple).toBe(true);

    const pa = train.find((e) => e.name === "PrimaryAssembly")!;
    expect(pa.required).toBe(false);
    expect(pa.multiple).toBe(false);
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
