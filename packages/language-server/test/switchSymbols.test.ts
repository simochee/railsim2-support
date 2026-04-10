import { describe, it, expect } from "vitest";
import { parse } from "../src/server/parser.js";
import { buildSwitchIndex, getReferencedSwitch, SYSTEM_SWITCHES } from "../src/server/switchSymbols.js";

describe("buildSwitchIndex", () => {
  it("should collect DefineSwitch definitions", () => {
    const { file } = parse(`
DefineSwitch "ライト" {
  GroupCommon = "ライト";
  Entry = "点灯";
  Entry = "消灯";
}
Body { }
    `);
    const index = buildSwitchIndex(file);
    expect(index.definitions.size).toBe(1);
    const sw = index.definitions.get("ライト")!;
    expect(sw.name).toBe("ライト");
    expect(sw.entries).toEqual([
      { label: "点灯", index: 0 },
      { label: "消灯", index: 1 },
    ]);
  });

  it("should collect multiple DefineSwitch definitions", () => {
    const { file } = parse(`
DefineSwitch "ライト" {
  Entry = "点灯";
  Entry = "消灯";
}
DefineSwitch "サウンド" {
  Entry = "ON";
  Entry = "OFF";
}
Body { }
    `);
    const index = buildSwitchIndex(file);
    expect(index.definitions.size).toBe(2);
    expect(index.definitions.has("ライト")).toBe(true);
    expect(index.definitions.has("サウンド")).toBe(true);
  });

  it("should detect duplicate DefineSwitch names", () => {
    const { file } = parse(`
DefineSwitch "ライト" {
  Entry = "点灯";
}
DefineSwitch "ライト" {
  Entry = "ON";
}
Body { }
    `);
    const index = buildSwitchIndex(file);
    expect(index.definitions.size).toBe(1);
    expect(index.duplicates.get("ライト")).toHaveLength(2);
  });

  it("should handle DefineSwitch with no entries", () => {
    const { file } = parse(`
DefineSwitch "空スイッチ" {
  GroupCommon = "テスト";
}
Body { }
    `);
    const index = buildSwitchIndex(file);
    const sw = index.definitions.get("空スイッチ")!;
    expect(sw.entries).toEqual([]);
  });

  it("should handle empty file", () => {
    const { file } = parse("");
    const index = buildSwitchIndex(file);
    expect(index.definitions.size).toBe(0);
    expect(index.duplicates.size).toBe(0);
  });
});

describe("getReferencedSwitch", () => {
  it("should extract switch name from string literal", () => {
    const { file } = parse('If "ライト" == 0 { }');
    const ifNode = file.body[0] as any;
    expect(getReferencedSwitch(ifNode.condition)).toBe("ライト");
  });

  it("should extract switch name from binary == expression", () => {
    const { file } = parse('If "ライト" == 1 { }');
    const ifNode = file.body[0] as any;
    expect(getReferencedSwitch(ifNode.condition)).toBe("ライト");
  });

  it("should extract switch name from != expression", () => {
    const { file } = parse('If "ライト" != 0 { }');
    const ifNode = file.body[0] as any;
    expect(getReferencedSwitch(ifNode.condition)).toBe("ライト");
  });

  it("should extract from comparison operators (>, <, >=, <=)", () => {
    const { file } = parse('If "_VELOCITY" > 0 { }');
    const ifNode = file.body[0] as any;
    expect(getReferencedSwitch(ifNode.condition)).toBe("_VELOCITY");
  });

  it("should return null for complex expressions (&&, ||)", () => {
    const { file } = parse('If "A" == 0 && "B" == 1 { }');
    const ifNode = file.body[0] as any;
    expect(getReferencedSwitch(ifNode.condition)).toBeNull();
  });

  it("should return null for number literals", () => {
    const { file } = parse("If 1 { }");
    const ifNode = file.body[0] as any;
    expect(getReferencedSwitch(ifNode.condition)).toBeNull();
  });
});

describe("SYSTEM_SWITCHES", () => {
  it("should contain 25 system switches", () => {
    expect(SYSTEM_SWITCHES.size).toBe(25);
  });

  it("should contain known switches", () => {
    expect(SYSTEM_SWITCHES.has("_FRONT")).toBe(true);
    expect(SYSTEM_SWITCHES.has("_NIGHT")).toBe(true);
    expect(SYSTEM_SWITCHES.has("_VELOCITY")).toBe(true);
  });
});
