import { describe, it, expect } from "vitest";
import { fileNamePluginTypeMap } from "@railsim2-support/language-server/schema";
import { guessPluginType, suggestFileName, VALID_PLUGIN_TYPES } from "./plugin-type";

describe("VALID_PLUGIN_TYPES", () => {
  it("matches language-server fileNamePluginTypeMap values", () => {
    const expected = new Set(Object.values(fileNamePluginTypeMap));
    expect(VALID_PLUGIN_TYPES).toEqual(expected);
  });
});

describe("guessPluginType", () => {
  it("extracts PluginType from standard PluginHeader block", () => {
    const content = `PluginHeader {
  PluginType = Train;
}`;
    expect(guessPluginType(content)).toBe("Train");
  });

  it("extracts PluginType from single-line PluginHeader", () => {
    const content = `PluginHeader { PluginType = Rail; }`;
    expect(guessPluginType(content)).toBe("Rail");
  });

  it("ignores PluginType inside nested If block", () => {
    const content = `PluginHeader {
  If (condition) {
    PluginType = Train;
  }
}`;
    expect(guessPluginType(content)).toBeUndefined();
  });

  it("ignores PluginType in comment lines", () => {
    const content = `PluginHeader {
  // PluginType = Train;
}`;
    expect(guessPluginType(content)).toBeUndefined();
  });

  it("ignores PluginType in # comment lines", () => {
    const content = `PluginHeader {
  # PluginType = Train;
}`;
    expect(guessPluginType(content)).toBeUndefined();
  });

  it("handles inline comments without breaking brace depth", () => {
    const content = `PluginHeader { // opening brace
  PluginType = Env;
} // closing brace`;
    expect(guessPluginType(content)).toBe("Env");
  });

  it("ignores PluginType outside PluginHeader", () => {
    const content = `TrainInfo {
  PluginType = Train;
}`;
    expect(guessPluginType(content)).toBeUndefined();
  });

  it("returns undefined for invalid PluginType value", () => {
    const content = `PluginHeader {
  PluginType = Unknown;
}`;
    expect(guessPluginType(content)).toBeUndefined();
  });

  it("returns undefined for empty content", () => {
    expect(guessPluginType("")).toBeUndefined();
  });

  it("handles brace in comment without depth corruption", () => {
    const content = `PluginHeader {
  // }
  PluginType = Station;
}`;
    expect(guessPluginType(content)).toBe("Station");
  });
});

describe("suggestFileName", () => {
  it("returns activeFile for sample files", () => {
    expect(suggestFileName("Train2.txt", false, null, "")).toBe("Train2.txt");
  });

  it("returns localFileName when available", () => {
    expect(suggestFileName("__local__", true, "MyPlugin.txt", "")).toBe("MyPlugin.txt");
  });

  it("suggests filename from PluginType for unsaved local file", () => {
    const content = `PluginHeader {
  PluginType = Rail;
}`;
    expect(suggestFileName("__local__", true, null, content)).toBe("Rail2.txt");
  });

  it("falls back to Plugin.txt when no PluginType found", () => {
    expect(suggestFileName("__local__", true, null, "")).toBe("Plugin.txt");
  });
});
