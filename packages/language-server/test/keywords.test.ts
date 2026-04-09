import { describe, it, expect } from "vitest";
import {
  OBJECT_NAMES,
  CONTROL_KEYWORDS,
  CASE_KEYWORDS,
  PROPERTY_NAMES,
  CONSTANTS,
  classifyIdentifier,
} from "../src/shared/keywords.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isSorted(arr: readonly string[]): boolean {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i - 1] > arr[i]) return false;
  }
  return true;
}

function hasDuplicates(arr: readonly string[]): boolean {
  return new Set(arr).size !== arr.length;
}

// ---------------------------------------------------------------------------
// Core object names
// ---------------------------------------------------------------------------

describe("OBJECT_NAMES", () => {
  it.each(["Body", "PluginHeader", "RailInfo", "TrainInfo", "FrontCabin", "TailCabin"])(
    "contains %s",
    (name) => {
      expect(OBJECT_NAMES).toContain(name);
    },
  );

  it("is alphabetically sorted", () => {
    expect(isSorted(OBJECT_NAMES)).toBe(true);
  });

  it("has no duplicates", () => {
    expect(hasDuplicates(OBJECT_NAMES)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Control keywords
// ---------------------------------------------------------------------------

describe("CONTROL_KEYWORDS", () => {
  it.each(["ApplySwitch", "If", "Else"])("contains %s", (name) => {
    expect(CONTROL_KEYWORDS).toContain(name);
  });

  it("is alphabetically sorted", () => {
    expect(isSorted(CONTROL_KEYWORDS)).toBe(true);
  });

  it("has no duplicates", () => {
    expect(hasDuplicates(CONTROL_KEYWORDS)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Case keywords
// ---------------------------------------------------------------------------

describe("CASE_KEYWORDS", () => {
  it.each(["Case", "Default"])("contains %s", (name) => {
    expect(CASE_KEYWORDS).toContain(name);
  });

  it("is alphabetically sorted", () => {
    expect(isSorted(CASE_KEYWORDS)).toBe(true);
  });

  it("has no duplicates", () => {
    expect(hasDuplicates(CASE_KEYWORDS)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Property names
// ---------------------------------------------------------------------------

describe("PROPERTY_NAMES", () => {
  it.each(["Coord", "ModelFileName", "Acceleration", "Gravity"])("contains %s", (name) => {
    expect(PROPERTY_NAMES).toContain(name);
  });

  it("is alphabetically sorted", () => {
    expect(isSorted(PROPERTY_NAMES)).toBe(true);
  });

  it("has no duplicates", () => {
    expect(hasDuplicates(PROPERTY_NAMES)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("CONSTANTS", () => {
  it.each(["DayAlpha", "yes", "no", "Hour"])("contains %s", (name) => {
    expect(CONSTANTS).toContain(name);
  });

  it("is alphabetically sorted", () => {
    expect(isSorted(CONSTANTS)).toBe(true);
  });

  it("has no duplicates", () => {
    expect(hasDuplicates(CONSTANTS)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// classifyIdentifier
// ---------------------------------------------------------------------------

describe("classifyIdentifier", () => {
  it("classifies object names", () => {
    expect(classifyIdentifier("Body")).toBe("object");
    expect(classifyIdentifier("PluginHeader")).toBe("object");
  });

  it("classifies control keywords", () => {
    expect(classifyIdentifier("If")).toBe("control");
    expect(classifyIdentifier("ApplySwitch")).toBe("control");
  });

  it("classifies case keywords", () => {
    expect(classifyIdentifier("Case")).toBe("case");
    expect(classifyIdentifier("Default")).toBe("case");
  });

  it("classifies property names", () => {
    expect(classifyIdentifier("Coord")).toBe("property");
    expect(classifyIdentifier("Gravity")).toBe("property");
  });

  it("classifies constants", () => {
    expect(classifyIdentifier("DayAlpha")).toBe("constant");
    expect(classifyIdentifier("yes")).toBe("constant");
    expect(classifyIdentifier("no")).toBe("constant");
  });

  it("returns unknown for unrecognised identifiers", () => {
    expect(classifyIdentifier("FooBar")).toBe("unknown");
    expect(classifyIdentifier("")).toBe("unknown");
  });
});
