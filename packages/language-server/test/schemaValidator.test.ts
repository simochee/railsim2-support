import { describe, it, expect } from "vitest";
import { parse } from "../src/server/parser.js";
import { validateSchema } from "../src/server/validator/schemaValidator.js";
import type { Diagnostic } from "../src/shared/diagnostics.js";

function validate(source: string): Diagnostic[] {
  const { file } = parse(source);
  return validateSchema(file);
}

function msgs(diags: Diagnostic[]): string[] {
  return diags.map((d) => d.message);
}

describe("schemaValidator", () => {
  // ================================================================
  // 有効な入力
  // ================================================================
  it("有効な入力 → エラーなし", () => {
    const src = `
PluginHeader {
  RailSimVersion = 2.00;
  PluginType = Rail;
  PluginName = "test";
  PluginAuthor = "author";
  Description = "desc";
}
RailInfo {
  Gauge = 1.067;
  Height = 0.172;
  SurfaceAlt = 0.0;
  CantRatio = 10.0;
  MaxCant = 6.0;
}
SoundInfo {
  WheelSoundFile = "sound.wav";
  JointInterval = 25.0;
}
`;
    expect(validate(src)).toEqual([]);
  });

  // ================================================================
  // 無効なプロパティ
  // ================================================================
  it("無効プロパティ → error", () => {
    const src = `
RailInfo {
  Gauge = 1.067;
  FooBar = 123;
}
`;
    const diags = validate(src);
    expect(msgs(diags)).toContain("Invalid property 'FooBar' in 'RailInfo'");
    expect(diags.find((d) => d.message.includes("FooBar"))!.severity).toBe("error");
  });

  // ================================================================
  // 型不一致
  // ================================================================
  it("型不一致: string を float に → error", () => {
    const src = `
RailInfo {
  Gauge = "not a number";
}
`;
    const diags = validate(src);
    expect(msgs(diags)).toContainEqual(expect.stringContaining("Type mismatch"));
  });

  it("型不一致: float を string に → error", () => {
    const src = `
PluginHeader {
  RailSimVersion = 1.0;
  PluginType = Rail;
  PluginName = 42;
  PluginAuthor = "a";
}
`;
    const diags = validate(src);
    expect(
      diags.some((d) => d.message.includes("Type mismatch") && d.message.includes("PluginName")),
    ).toBe(true);
  });

  it("負数 -1.0 が float として許容される", () => {
    const src = `
RailInfo {
  Gauge = -1.067;
}
`;
    const diags = validate(src);
    const gaugeErrors = diags.filter((d) => d.message.includes("Gauge"));
    expect(gaugeErrors).toHaveLength(0);
  });

  // ================================================================
  // 必須プロパティ欠落
  // ================================================================
  it("必須プロパティ欠落 → warning", () => {
    const src = `
RailInfo {
}
`;
    const diags = validate(src);
    // RailInfo.Gauge は required
    expect(
      diags.some(
        (d) => d.message.includes("Required property 'Gauge'") && d.severity === "warning",
      ),
    ).toBe(true);
  });

  // ================================================================
  // 値 arity 不一致
  // ================================================================
  it("arity 不一致 (vector-3d に値2個) → error", () => {
    const src = `
Headlight {
  SourceCoord = 1.0, 2.0;
}
`;
    const diags = validate(src);
    expect(
      diags.some((d) => d.message.includes("expects 3 value(s)") && d.severity === "error"),
    ).toBe(true);
  });

  // ================================================================
  // 無効な子オブジェクト
  // ================================================================
  it("無効な子オブジェクト → error", () => {
    const src = `
RailInfo {
  Gauge = 1.0;
  Headlight {
    SourceCoord = 0, 0, 0;
  }
}
`;
    const diags = validate(src);
    expect(msgs(diags)).toContainEqual(
      expect.stringContaining("Invalid child object 'Headlight' in 'RailInfo'"),
    );
  });

  // ================================================================
  // ファイルレベルのルート検証
  // ================================================================
  it("Rail2.txt に TrainInfo → error", () => {
    const src = `
PluginHeader {
  RailSimVersion = 2.00;
  PluginType = Rail;
  PluginName = "test";
  PluginAuthor = "author";
  Description = "desc";
}
RailInfo {
  Gauge = 1.0;
  Height = 0.172;
  SurfaceAlt = 0.0;
  CantRatio = 10.0;
  MaxCant = 6.0;
}
SoundInfo {
  WheelSoundFile = "sound.wav";
  JointInterval = 25.0;
}
TrainInfo {
  FrontLimit = 10.0;
  TailLimit = -10.0;
  MaxVelocity = 100.0;
  MaxAcceleration = 2.0;
  MaxDeceleration = 3.0;
}
`;
    const diags = validate(src);
    expect(
      diags.some(
        (d) => d.message.includes("not allowed as root object for PluginType") && d.message.includes("TrainInfo"),
      ),
    ).toBe(true);
  });

  it("必須ルートオブジェクト欠��� → warning", () => {
    const src = `
PluginHeader {
  RailSimVersion = 2.00;
  PluginType = Rail;
  PluginName = "test";
  PluginAuthor = "author";
  Description = "desc";
}
`;
    const diags = validate(src);
    expect(
      diags.some(
        (d) => d.message.includes("Required root object 'RailInfo'") && d.severity === "warning",
      ),
    ).toBe(true);
  });

  it("multiple=false のルートオブジェクトが重複 → error", () => {
    const src = `
PluginHeader {
  RailSimVersion = 2.00;
  PluginType = Rail;
  PluginName = "test";
  PluginAuthor = "author";
  Description = "desc";
}
RailInfo {
  Gauge = 1.0;
  Height = 0.172;
  SurfaceAlt = 0.0;
  CantRatio = 10.0;
  MaxCant = 6.0;
}
SoundInfo {
  WheelSoundFile = "sound.wav";
  JointInterval = 25.0;
}
PluginHeader {
  RailSimVersion = 2.00;
  PluginType = Rail;
  PluginName = "test2";
  PluginAuthor = "author2";
  Description = "desc";
}
`;
    const diags = validate(src);
    expect(diags.some((d) => d.message.includes("Duplicate root object 'PluginHeader'"))).toBe(
      true,
    );
  });

  // ================================================================
  // ネストしたオブジェクトの検証
  // ================================================================
  it("ネストしたオブジェクトを検証する", () => {
    const src = `
Profile {
  Material { UseTexture = yes; }
  Face {
    Vertex {
      Coord = 1.0, 2.0;
    }
  }
}
`;
    // Profile > Face > Vertex — Coord は vector-2d (Vertex:Profile) → OK
    expect(validate(src)).toEqual([]);
  });

  // ================================================================
  // スキーマ未定義オブジェクトはスキップ
  // ================================================================
  it("スキーマ未定義オブジェクトはスキップ", () => {
    const src = `
UnknownObject {
  UnknownProp = 123;
}
`;
    // schema が見つからない → unknownKeywordValidator の責務
    expect(validate(src)).toEqual([]);
  });

  // ================================================================
  // 親コンテキスト依存
  // ================================================================
  it("Profile内 Vertex は vector-2d, Wireframe内 Vertex は vector-3d を使う", () => {
    const src = `
Profile {
  Material { UseTexture = yes; }
  Face {
    Vertex {
      Coord = 1.0, 2.0;
    }
  }
}
Wireframe {
  Line {
    Vertex {
      Coord = 1.0, 2.0, 3.0;
    }
  }
}
`;
    expect(validate(src)).toEqual([]);
  });

  // ================================================================
  // fileName 省略時はルート検証スキップ
  // ================================================================
  it("PluginType 未指定時はルート検証をスキップ", () => {
    const src = `
TrainInfo {
  FrontLimit = 10.0;
  TailLimit = -10.0;
  MaxVelocity = 100.0;
  MaxAcceleration = 2.0;
  MaxDeceleration = 3.0;
}
RailInfo {
  Gauge = 1.0;
  Height = 0.172;
  SurfaceAlt = 0.0;
  CantRatio = 10.0;
  MaxCant = 6.0;
}
`;
    // PluginHeader がないのでルート検証なし → TrainInfo と RailInfo の混在OK
    const diags = validate(src);
    const rootErrors = diags.filter(
      (d) => d.message.includes("root object") || d.message.includes("Required root"),
    );
    expect(rootErrors).toHaveLength(0);
  });

  // ================================================================
  // yes-no 型に数値 → error
  // ================================================================
  it("yes-no 型に数値 → error", () => {
    const src = `
Axle "test" {
  ModelFileName = "a.x";
  WheelSound = 123;
}
`;
    const diags = validate(src);
    expect(
      diags.some((d) => d.message.includes("Type mismatch") && d.message.includes("WheelSound")),
    ).toBe(true);
  });

  // ================================================================
  // enum 型
  // ================================================================
  it("enum 型に不正な値 → error", () => {
    const src = `
Axle "test" {
  ModelFileName = "a.x";
  AnalogClock = InvalidType;
}
`;
    const diags = validate(src);
    expect(diags.some((d) => d.message.includes("AnalogClock") && d.message.includes("enum"))).toBe(
      true,
    );
  });

  // ================================================================
  // トップレベルの IfNode / ApplySwitchNode はルート検証スキップ
  // ================================================================
  it("トップレベルの If はルート検証をスキップ", () => {
    const src = `
PluginHeader {
  RailSimVersion = 2.00;
  PluginType = Rail;
  PluginName = "test";
  PluginAuthor = "author";
  Description = "desc";
}
RailInfo {
  Gauge = 1.0;
  Height = 0.172;
  SurfaceAlt = 0.0;
  CantRatio = 10.0;
  MaxCant = 6.0;
}
SoundInfo {
  WheelSoundFile = "sound.wav";
  JointInterval = 25.0;
}
If (1) {
  Profile {}
}
`;
    const diags = validate(src);
    // If の中の Profile はルート検証対象外
    const rootErrors = diags.filter((d) => d.message.includes("root object"));
    expect(rootErrors).toHaveLength(0);
  });

  // ================================================================
  // expression 型（binary 式）はスキップ
  // ================================================================
  it("式 (binary) は expression 扱いでスキップ", () => {
    const src = `
RailInfo {
  Gauge = 1.0 + 0.067;
}
`;
    const diags = validate(src);
    const gaugeErrors = diags.filter((d) => d.message.includes("Gauge"));
    expect(gaugeErrors).toHaveLength(0);
  });

  // ================================================================
  // If/ApplySwitch 内のプロパティ検証（Codex指��）
  // ================================================================
  it("If 内のプロパティも検証される", () => {
    const src = `
RailInfo {
  Gauge = 1.0;
  If (1) {
    FooBar = 123;
  }
}
`;
    const diags = validate(src);
    expect(msgs(diags)).toContainEqual(
      expect.stringContaining("Invalid property 'FooBar' in 'RailInfo'"),
    );
  });

  it("If 内の型不一致も検出される", () => {
    const src = `
RailInfo {
  If (1) {
    Gauge = "not a number";
  }
}
`;
    const diags = validate(src);
    expect(
      diags.some((d) => d.message.includes("Type mismatch") && d.message.includes("Gauge")),
    ).toBe(true);
  });

  it("If 内の子オブジェクトが必須子オブジェクトとしてカウントされる", () => {
    const src = `
Face {
  If (1) {
    Vertex {
      Coord = 1.0, 2.0;
    }
  }
}
`;
    const diags = validate(src);
    // Vertex は If 内にあるがカウントされるので Required child 警告は出ない
    const missingVertex = diags.filter((d) => d.message.includes("Required child object 'Vertex'"));
    expect(missingVertex).toHaveLength(0);
  });

  // ================================================================
  // multiple=false の重複チェック（Codex指摘）
  // ================================================================
  it("multiple=false のプロパティが重複 → error", () => {
    const src = `
RailInfo {
  Gauge = 1.0;
  Gauge = 2.0;
}
`;
    const diags = validate(src);
    expect(diags.some((d) => d.message.includes("Duplicate property 'Gauge'"))).toBe(true);
  });

  it("multiple=false の子オブジェクト FrontCabin が重複 → error", () => {
    const src = `
PrimaryAssembly {
  FrontCabin {}
  FrontCabin {}
}
`;
    const diags = validate(src);
    expect(diags.some((d) => d.message.includes("Duplicate child object 'FrontCabin'"))).toBe(true);
  });

  // ================================================================
  // 排他的分岐内の重複は偽陽性にならない（Codex指摘2回目）
  // ================================================================
  it("If/Else の別枝にある同名プロパティは重複扱いしない", () => {
    const src = `
RailInfo {
  If (1) {
    Gauge = 1.0;
  }
  Else {
    Gauge = 2.0;
  }
}
`;
    const diags = validate(src);
    const dupGauge = diags.filter((d) => d.message.includes("Duplicate property 'Gauge'"));
    expect(dupGauge).toHaveLength(0);
  });

  it("If/Else の別枝にある同名子オブジェクトは重複扱いしない", () => {
    const src = `
PrimaryAssembly {
  If (1) {
    FrontCabin {}
  }
  Else {
    FrontCabin {}
  }
}
`;
    const diags = validate(src);
    const dupFrontCabin = diags.filter((d) =>
      d.message.includes("Duplicate child object 'FrontCabin'"),
    );
    expect(dupFrontCabin).toHaveLength(0);
  });

  it("ApplySwitch の各 Case にある同名プロパティは重複扱いしない", () => {
    const src = `
RailInfo {
  ApplySwitch "_SW" {
    Case 1:
      Gauge = 1.0;
    Case 2:
      Gauge = 2.0;
  }
}
`;
    const diags = validate(src);
    const dupGauge = diags.filter((d) => d.message.includes("Duplicate property 'Gauge'"));
    expect(dupGauge).toHaveLength(0);
  });

  it("同一 If 枝内のプロパティ重複は検出する", () => {
    const src = `
RailInfo {
  If (1) {
    Gauge = 1.0;
    Gauge = 2.0;
  }
}
`;
    const diags = validate(src);
    expect(diags.some((d) => d.message.includes("Duplicate property 'Gauge'"))).toBe(true);
  });

  it("同一 Case 内の子オブジェクト重複は検出する", () => {
    const src = `
PrimaryAssembly {
  ApplySwitch "_SW" {
    Case 1:
      FrontCabin {}
      FrontCabin {}
  }
}
`;
    const diags = validate(src);
    expect(diags.some((d) => d.message.includes("Duplicate child object 'FrontCabin'"))).toBe(true);
  });

  it("RailInfo 内の子オブジェクトは無効", () => {
    const src = `
RailInfo {
  Gauge = 1.0;
  DefineSwitch MySwitch {}
}
`;
    const diags = validate(src);
    // RailInfo has no children in the generated schema
    const invalidChild = diags.filter((d) =>
      d.message.includes("Invalid child object 'DefineSwitch'"),
    );
    expect(invalidChild).toHaveLength(1);
  });

  // ================================================================
  // Train2.txt 統合テスト
  // ================================================================
  it("Train2.txt の基本構造にスキーマエラーが出ない", () => {
    const src = `
PluginHeader {
  RailSimVersion = 2.00;
  PluginType = Train;
  PluginName = "test";
  PluginAuthor = "author";
  Description = "desc";
}
TrainInfo {
  FrontLimit = 10.65;
  TailLimit = -10.65;
  MaxVelocity = 100.0;
  MaxAcceleration = 2.1;
  MaxDeceleration = 3.3;
}
PrimaryAssembly {
  Axle "Wheel1" {
    ModelFileName = "wheel.x";
    Diameter = 0.8;
    Symmetric = 8;
    Coord = (8.25, 0.43);
  }
  Body "Bogie1" {
    ModelFileName = "bogie.x";
    JointZY "Wheel1" {
      AttachCoord = (0.0, 0.0);
      LocalCoord = (0.9, 0.0);
    }
  }
  Object3D "MainBody" {
    ModelFileName = "body.x";
    NoCastShadow = 24;
    AlphaZeroTest = 24, 0;
    Joint3D "Bogie1" {
      AttachCoord = (0.0, 0.57, 0.0);
      AttachDir = (0.0, 0.0, 1.0);
    }
    ChangeMaterial {
      MaterialID = 0, 0;
      Emissive = 1.0, 1.0, 1.0;
    }
    StaticMove {
      Displacement = (0.0, 0.0, 0.6);
      AnimationTime = 2.5;
    }
  }
  FrontCabin {
    Joint3D "MainBody" {
      AttachCoord = (-0.9, 2.5, 10.0);
      AttachDir = (0.0, 0.0, 1.0);
    }
  }
}
`;
    const diags = validate(src);
    const errors = diags.filter((d) => d.severity === "error");
    expect(errors).toEqual([]);
  });

  it("Train2.txt のルートに未許可オブジェクト → error", () => {
    const src = `
PluginHeader {
  RailSimVersion = 2.00;
  PluginType = Train;
  PluginName = "test";
  PluginAuthor = "author";
  Description = "desc";
}
TrainInfo {
  FrontLimit = 10.0;
  TailLimit = -10.0;
  MaxVelocity = 100.0;
  MaxAcceleration = 2.0;
  MaxDeceleration = 3.0;
}
RailInfo {
  Gauge = 1.0;
}
`;
    const diags = validate(src);
    const rootErrors = diags.filter((d) => d.message.includes("not allowed as root object for PluginType"));
    expect(rootErrors.length).toBeGreaterThan(0);
  });

  it("TrainInfo に Gauge がなくても warning が出ない (Gauge はスキーマに存在しない)", () => {
    const src = `
TrainInfo {
  FrontLimit = 10.0;
  TailLimit = -10.0;
  MaxVelocity = 100.0;
  MaxAcceleration = 2.0;
  MaxDeceleration = 3.0;
}
`;
    const diags = validate(src);
    const gaugeWarnings = diags.filter((d) => d.message.includes("Required property 'Gauge'"));
    expect(gaugeWarnings).toHaveLength(0);
  });

  it("Body 内の JointZY は有効な子オブジェクト", () => {
    const src = `
Body "Bogie1" {
  ModelFileName = "bogie.x";
  JointZY "Wheel1" {
    AttachCoord = (0.0, 0.0);
    LocalCoord = (0.9, 0.0);
  }
}
`;
    const diags = validate(src);
    const invalidChild = diags.filter((d) => d.message.includes("Invalid child object 'JointZY'"));
    expect(invalidChild).toHaveLength(0);
  });

  it("Object3D 内の複数 StaticMove は multiple=true なので重複エラーにならない", () => {
    const src = `
Object3D "Door" {
  ModelFileName = "door.x";
  StaticMove {
    Displacement = (0.0, 0.0, 0.6);
    AnimationTime = 2.5;
  }
  StaticMove {
    Displacement = (0.0, 0.0, 0.05);
    AnimationTime = 0.5;
  }
}
`;
    const diags = validate(src);
    const dupErrors = diags.filter((d) =>
      d.message.includes("Duplicate child object 'StaticMove'"),
    );
    expect(dupErrors).toHaveLength(0);
  });
});
