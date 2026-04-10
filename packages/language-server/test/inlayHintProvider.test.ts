import { describe, it, expect } from "vitest";
import { parse } from "../src/server/parser.js";
import { buildSwitchIndex } from "../src/server/switchSymbols.js";
import { getInlayHints } from "../src/server/inlayHintProvider.js";
import { InlayHintKind } from "vscode-languageserver";

function fullRange() {
  return { start: { line: 0, character: 0 }, end: { line: 9999, character: 0 } };
}

function setupHints(source: string) {
  const { file } = parse(source);
  const switchIndex = buildSwitchIndex(file);
  return getInlayHints(file, switchIndex, fullRange());
}

describe("getInlayHints", () => {
  it("should show Entry label for Case values", () => {
    const hints = setupHints(`
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
    expect(hints).toHaveLength(2);
    expect(hints[0].label).toBe("点灯");
    expect(hints[1].label).toBe("消灯");
    expect(hints[0].kind).toBe(InlayHintKind.Parameter);
    expect(hints[0].paddingLeft).toBe(true);
  });

  it("should show Entry label for If comparison values", () => {
    const hints = setupHints(`
DefineSwitch "サウンド" {
  Entry = "ON";
  Entry = "OFF";
}
Body {
  If "サウンド" == 0 {
  }
}
    `);
    expect(hints).toHaveLength(1);
    expect(hints[0].label).toBe("ON");
  });

  it("should handle compound If conditions (&&)", () => {
    const hints = setupHints(`
DefineSwitch "A" {
  Entry = "X";
  Entry = "Y";
}
DefineSwitch "B" {
  Entry = "P";
  Entry = "Q";
}
Body {
  If "A" == 0 && "B" == 1 {
  }
}
    `);
    expect(hints).toHaveLength(2);
    expect(hints[0].label).toBe("X");
    expect(hints[1].label).toBe("Q");
  });

  it("should show hints for multiple Case values", () => {
    const hints = setupHints(`
DefineSwitch "SW" {
  Entry = "A";
  Entry = "B";
  Entry = "C";
}
Body {
  ApplySwitch "SW" {
    Case 0, 1:
    Default:
  }
}
    `);
    expect(hints).toHaveLength(2);
    expect(hints[0].label).toBe("A");
    expect(hints[1].label).toBe("B");
  });

  it("should not show hints for system switches (no entries)", () => {
    const hints = setupHints(`
Body {
  If "_FRONT" == 1 {
  }
}
    `);
    expect(hints).toHaveLength(0);
  });

  it("should not show hints for undefined switches", () => {
    const hints = setupHints(`
Body {
  If "未定義" == 0 {
  }
}
    `);
    expect(hints).toHaveLength(0);
  });

  it("should not show hints for out-of-range entries", () => {
    const hints = setupHints(`
DefineSwitch "SW" {
  Entry = "A";
}
Body {
  ApplySwitch "SW" {
    Case 5:
    Default:
  }
}
    `);
    expect(hints).toHaveLength(0);
  });

  it("should not show hints for non-integer values", () => {
    const hints = setupHints(`
DefineSwitch "SW" {
  Entry = "A";
}
Body {
  ApplySwitch "SW" {
    Case 1.5:
    Default:
  }
}
    `);
    expect(hints).toHaveLength(0);
  });

  it("should filter hints by range parameter", () => {
    const src = `
DefineSwitch "SW" {
  Entry = "A";
  Entry = "B";
}
Body {
  ApplySwitch "SW" {
    Case 0:
    Case 1:
    Default:
  }
}`;
    const { file } = parse(src);
    const switchIndex = buildSwitchIndex(file);
    // Only request hints for line 7 (Case 0:)
    const hints = getInlayHints(file, switchIndex, {
      start: { line: 7, character: 0 },
      end: { line: 7, character: 999 },
    });
    expect(hints).toHaveLength(1);
    expect(hints[0].label).toBe("A");
  });

  it("should handle empty file", () => {
    const hints = setupHints("");
    expect(hints).toHaveLength(0);
  });
});
