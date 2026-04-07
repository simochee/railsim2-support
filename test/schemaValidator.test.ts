import { describe, it, expect } from "vitest";
import { parse } from "../src/server/parser.js";
import { validateSchema } from "../src/server/validator/schemaValidator.js";
import type { Diagnostic } from "../src/shared/diagnostics.js";

function validate(source: string, fileName?: string): Diagnostic[] {
  const { file } = parse(source);
  return validateSchema(file, fileName);
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
  RailSimVersion = "2.00";
  PluginType = Rail;
  PluginName = "test";
  PluginAuthor = "author";
}
RailInfo {
  Gauge = 1.067;
  ModelFileName = "rail.x";
}
SoundInfo {
  WaveFileName = "sound.wav";
}
`;
    expect(validate(src, "Rail2.txt")).toEqual([]);
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
    expect(msgs(diags)).toContainEqual(
      expect.stringContaining("Type mismatch"),
    );
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
    expect(
      diags.some((d) => d.message.includes("Required property 'Gauge'") && d.severity === "warning"),
    ).toBe(true);
  });

  // ================================================================
  // 値 arity 不一致
  // ================================================================
  it("arity 不一致 (vector-3d に値2個) → error", () => {
    const src = `
Headlight {
  Coord = 1.0, 2.0;
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
    Coord = 0, 0, 0;
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
  RailSimVersion = "2.00";
  PluginType = Rail;
  PluginName = "test";
  PluginAuthor = "author";
}
RailInfo {
  Gauge = 1.0;
}
SoundInfo {}
TrainInfo {
  Gauge = 1.0;
}
`;
    const diags = validate(src, "Rail2.txt");
    expect(
      diags.some((d) => d.message.includes("not allowed as root object") && d.message.includes("TrainInfo")),
    ).toBe(true);
  });

  it("必須ルートオブジェクト欠落 → warning", () => {
    const src = `
PluginHeader {
  RailSimVersion = "2.00";
  PluginType = Rail;
  PluginName = "test";
  PluginAuthor = "author";
}
`;
    const diags = validate(src, "Rail2.txt");
    expect(
      diags.some((d) => d.message.includes("Required root object 'RailInfo'") && d.severity === "warning"),
    ).toBe(true);
  });

  it("multiple=false のルートオブジェクトが重複 → error", () => {
    const src = `
PluginHeader {
  RailSimVersion = "2.00";
  PluginType = Rail;
  PluginName = "test";
  PluginAuthor = "author";
}
RailInfo { Gauge = 1.0; }
SoundInfo {}
PluginHeader {
  RailSimVersion = "2.00";
  PluginType = Rail;
  PluginName = "test2";
  PluginAuthor = "author2";
}
`;
    const diags = validate(src, "Rail2.txt");
    expect(
      diags.some((d) => d.message.includes("Duplicate root object 'PluginHeader'")),
    ).toBe(true);
  });

  // ================================================================
  // ネストしたオブジェクトの検証
  // ================================================================
  it("ネストしたオブジェクトを検証する", () => {
    const src = `
Profile {
  Face {
    MaterialID = 0;
    Vertex {
      Coord = 1.0, 2.0;
    }
  }
}
`;
    // Profile > Face > Vertex:Profile — Coord は vector-2d → OK
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
  it("Profile内 Vertex は vector-2d, Wireframe内 Line の Vertex は vector-3d", () => {
    const src = `
Profile {
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

  it("Profile内 Vertex に vector-3d → error", () => {
    const src = `
Profile {
  Face {
    Vertex {
      Coord = 1.0, 2.0, 3.0;
    }
  }
}
`;
    const diags = validate(src);
    expect(
      diags.some((d) => d.message.includes("expects 2 value(s)") && d.message.includes("Coord")),
    ).toBe(true);
  });

  // ================================================================
  // fileName 省略時はルート検証スキップ
  // ================================================================
  it("fileName 省略時はルート検証をスキップ", () => {
    const src = `
TrainInfo {
  Gauge = 1.0;
}
RailInfo {
  Gauge = 1.0;
}
`;
    // fileName なしだとルート検証なし → TrainInfo と RailInfo の混在OK
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
RailInfo {
  Gauge = 1.0;
  EnableCant = 123;
}
`;
    const diags = validate(src);
    expect(
      diags.some((d) => d.message.includes("Type mismatch") && d.message.includes("EnableCant")),
    ).toBe(true);
  });

  // ================================================================
  // enum 型
  // ================================================================
  it("enum 型に不正な値 → error", () => {
    const src = `
PluginHeader {
  RailSimVersion = "2.00";
  PluginType = InvalidType;
  PluginName = "test";
  PluginAuthor = "author";
}
`;
    const diags = validate(src);
    expect(
      diags.some((d) => d.message.includes("PluginType") && d.message.includes("enum")),
    ).toBe(true);
  });

  // ================================================================
  // トップレベルの IfNode / ApplySwitchNode はルート検証スキップ
  // ================================================================
  it("トップレベルの If はルート検証をスキップ", () => {
    const src = `
PluginHeader {
  RailSimVersion = "2.00";
  PluginType = Rail;
  PluginName = "test";
  PluginAuthor = "author";
}
RailInfo { Gauge = 1.0; }
SoundInfo {}
If (1) {
  Profile {}
}
`;
    const diags = validate(src, "Rail2.txt");
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
  // If/ApplySwitch 内のプロパティ検証（Codex指摘）
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
    expect(
      diags.some((d) => d.message.includes("Duplicate property 'Gauge'")),
    ).toBe(true);
  });

  it("multiple=false の子オブジェクトが重複 → error", () => {
    const src = `
TrainInfo {
  Gauge = 1.0;
  Body { ModelFileName = "a.x"; }
  Body { ModelFileName = "b.x"; }
}
`;
    // Body は multiple=true なので重複OK
    const diags = validate(src);
    const dupBody = diags.filter((d) => d.message.includes("Duplicate child object 'Body'"));
    expect(dupBody).toHaveLength(0);
  });

  it("multiple=false の子オブジェクト FrontCabin が重複 → error", () => {
    const src = `
Body {
  ModelFileName = "a.x";
  FrontCabin { ModelFileName = "f1.x"; }
  FrontCabin { ModelFileName = "f2.x"; }
}
`;
    const diags = validate(src);
    expect(
      diags.some((d) => d.message.includes("Duplicate child object 'FrontCabin'")),
    ).toBe(true);
  });

  // ================================================================
  // DefineSwitch/DefineAnimation が親の children に登録されている（Codex指摘）
  // ================================================================
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
Body {
  ModelFileName = "a.x";
  If (1) {
    FrontCabin { ModelFileName = "f1.x"; }
  }
  Else {
    FrontCabin { ModelFileName = "f2.x"; }
  }
}
`;
    const diags = validate(src);
    const dupFrontCabin = diags.filter((d) => d.message.includes("Duplicate child object 'FrontCabin'"));
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
    expect(
      diags.some((d) => d.message.includes("Duplicate property 'Gauge'")),
    ).toBe(true);
  });

  it("同一 Case 内の子オブジェクト重複は検出する", () => {
    const src = `
Body {
  ModelFileName = "a.x";
  ApplySwitch "_SW" {
    Case 1:
      FrontCabin { ModelFileName = "f1.x"; }
      FrontCabin { ModelFileName = "f2.x"; }
  }
}
`;
    const diags = validate(src);
    expect(
      diags.some((d) => d.message.includes("Duplicate child object 'FrontCabin'")),
    ).toBe(true);
  });

  it("RailInfo 内の DefineSwitch は有効な子オブジェクト", () => {
    const src = `
RailInfo {
  Gauge = 1.0;
  DefineSwitch MySwitch {}
}
`;
    const diags = validate(src);
    const invalidChild = diags.filter((d) => d.message.includes("Invalid child object 'DefineSwitch'"));
    expect(invalidChild).toHaveLength(0);
  });
});
