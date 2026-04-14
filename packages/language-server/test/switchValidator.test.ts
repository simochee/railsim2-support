import { describe, it, expect } from "vitest";
import { parse } from "../src/server/parser.js";
import { buildSwitchIndex } from "../src/server/switchSymbols.js";
import { validateSwitches } from "../src/server/validator/switchValidator.js";

describe("validateSwitches", () => {
  it("should not warn for defined switches", () => {
    const { file } = parse(`
DefineSwitch "ライト" {
  Entry = "点灯";
  Entry = "消灯";
}
Body {
  If "ライト" == 0 { }
}
    `);
    const index = buildSwitchIndex(file);
    const diags = validateSwitches(file, index);
    expect(diags).toHaveLength(0);
  });

  it("should not warn for system switches", () => {
    const { file } = parse(`
Body {
  If "_FRONT" == 1 { }
  If "_NIGHT" == 0 { }
}
    `);
    const index = buildSwitchIndex(file);
    const diags = validateSwitches(file, index);
    expect(diags).toHaveLength(0);
  });

  it("should warn for undefined switches in If", () => {
    const { file } = parse(`
Body {
  If "未定義" == 0 { }
}
    `);
    const index = buildSwitchIndex(file);
    const diags = validateSwitches(file, index);
    expect(diags).toHaveLength(1);
    expect(diags[0].severity).toBe("warning");
    expect(diags[0].message).toContain("未定義のスイッチ");
  });

  it("should warn for undefined switches in ApplySwitch", () => {
    const { file } = parse(`
Body {
  ApplySwitch "未定義" {
    Case 0:
    Default:
  }
}
    `);
    const index = buildSwitchIndex(file);
    const diags = validateSwitches(file, index);
    expect(diags).toHaveLength(1);
    expect(diags[0].severity).toBe("warning");
    expect(diags[0].message).toContain("未定義のスイッチ");
  });

  it("should warn for duplicate DefineSwitch on all duplicate locations", () => {
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
    const diags = validateSwitches(file, index);
    const dupDiags = diags.filter((d) => d.message === "スイッチ定義 'ライト' が重複しています");
    expect(dupDiags).toHaveLength(2);
    expect(dupDiags.every((d) => d.severity === "warning")).toBe(true);
  });

  it("should not warn when string is used in complex expression (&&, ||)", () => {
    const { file } = parse(`
Body {
  If "ライト" == 0 && "サウンド" == 1 { }
}
    `);
    const index = buildSwitchIndex(file);
    const diags = validateSwitches(file, index);
    // Complex expression — getReferencedSwitch returns null, so no warning
    expect(diags).toHaveLength(0);
  });

  it("should warn for out-of-range Case value in ApplySwitch", () => {
    const { file } = parse(`
DefineSwitch "ライト" {
  Entry = "点灯";
  Entry = "消灯";
}
Body {
  ApplySwitch "ライト" {
    Case 0:
    Case 1:
    Case 3:
    Default:
  }
}
    `);
    const index = buildSwitchIndex(file);
    const diags = validateSwitches(file, index);
    expect(diags).toHaveLength(1);
    expect(diags[0].severity).toBe("warning");
    expect(diags[0].message).toContain("3");
    expect(diags[0].message).toContain("ライト");
  });

  it("should warn for negative Case value", () => {
    const { file } = parse(`
DefineSwitch "ライト" {
  Entry = "点灯";
  Entry = "消灯";
}
Body {
  ApplySwitch "ライト" {
    Case -1:
    Default:
  }
}
    `);
    const index = buildSwitchIndex(file);
    const diags = validateSwitches(file, index);
    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("-1");
  });

  it("should warn for non-integer Case value", () => {
    const { file } = parse(`
DefineSwitch "ライト" {
  Entry = "点灯";
  Entry = "消灯";
}
Body {
  ApplySwitch "ライト" {
    Case 1.5:
    Default:
  }
}
    `);
    const index = buildSwitchIndex(file);
    const diags = validateSwitches(file, index);
    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("整数インデックス");
  });

  it("should not warn for valid Case values", () => {
    const { file } = parse(`
DefineSwitch "ライト" {
  Entry = "点灯";
  Entry = "消灯";
}
Body {
  ApplySwitch "ライト" {
    Case 0:
    Case 1:
    Default:
  }
}
    `);
    const index = buildSwitchIndex(file);
    const diags = validateSwitches(file, index);
    expect(diags).toHaveLength(0);
  });

  it("should not check Case values for system switches", () => {
    const { file } = parse(`
Body {
  ApplySwitch "_FRONT" {
    Case 99:
    Default:
  }
}
    `);
    const index = buildSwitchIndex(file);
    const diags = validateSwitches(file, index);
    expect(diags).toHaveLength(0);
  });

  it("should warn for out-of-range value in If == comparison", () => {
    const { file } = parse(`
DefineSwitch "ライト" {
  Entry = "点灯";
  Entry = "消灯";
}
Body {
  If "ライト" == 5 { }
}
    `);
    const index = buildSwitchIndex(file);
    const diags = validateSwitches(file, index);
    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("5");
    expect(diags[0].message).toContain("ライト");
  });

  it("should warn for out-of-range value in If != comparison", () => {
    const { file } = parse(`
DefineSwitch "ライト" {
  Entry = "点灯";
  Entry = "消灯";
}
Body {
  If "ライト" != 5 { }
}
    `);
    const index = buildSwitchIndex(file);
    const diags = validateSwitches(file, index);
    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("5");
  });

  it("should warn for reversed comparison (number == string)", () => {
    const { file } = parse(`
DefineSwitch "ライト" {
  Entry = "点灯";
  Entry = "消灯";
}
Body {
  If 5 == "ライト" { }
}
    `);
    const index = buildSwitchIndex(file);
    const diags = validateSwitches(file, index);
    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("5");
  });

  it("should not warn for valid If comparison values", () => {
    const { file } = parse(`
DefineSwitch "ライト" {
  Entry = "点灯";
  Entry = "消灯";
}
Body {
  If "ライト" == 0 { }
  If "ライト" != 1 { }
}
    `);
    const index = buildSwitchIndex(file);
    const diags = validateSwitches(file, index);
    expect(diags).toHaveLength(0);
  });

  it("should not check If comparison for < > <= >= operators", () => {
    const { file } = parse(`
DefineSwitch "ライト" {
  Entry = "点灯";
  Entry = "消灯";
}
Body {
  If "ライト" > 99 { }
  If "ライト" < 99 { }
}
    `);
    const index = buildSwitchIndex(file);
    const diags = validateSwitches(file, index);
    expect(diags).toHaveLength(0);
  });

  it("should warn when DefineSwitch has no entries", () => {
    const { file } = parse(`
DefineSwitch "空スイッチ" { }
Body {
  ApplySwitch "空スイッチ" {
    Case 0:
    Default:
  }
}
    `);
    const index = buildSwitchIndex(file);
    const diags = validateSwitches(file, index);
    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("エントリーがありません");
  });

  it("should include entry labels in warning for small switches", () => {
    const { file } = parse(`
DefineSwitch "ライト" {
  Entry = "点灯";
  Entry = "消灯";
}
Body {
  ApplySwitch "ライト" {
    Case 3:
    Default:
  }
}
    `);
    const index = buildSwitchIndex(file);
    const diags = validateSwitches(file, index);
    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("点灯");
    expect(diags[0].message).toContain("消灯");
  });

  it("should point diagnostic range to the string literal in comparison", () => {
    const { file } = parse(`
Body {
  If "未定義スイッチ" == 0 { }
}
    `);
    const index = buildSwitchIndex(file);
    const diags = validateSwitches(file, index);
    expect(diags).toHaveLength(1);
    // Range should point to the string literal, not the whole expression
    const ifNode = file.body[0] as any;
    const bodyIf = ifNode.body[0] as any;
    expect(diags[0].range).toEqual(bodyIf.condition.left.range);
  });
});
