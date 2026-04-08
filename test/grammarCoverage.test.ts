/**
 * Grammar カバレッジテスト
 *
 * semanticSchema から導出した期待値と、生成された Grammar の実際の語彙が
 * 一致することを検証する。
 *
 * 検証式: derivedFromSchema + explicitGrammarExtras === actualGrammarKeywords
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { semanticSchema } from "../src/schema/semantic.js";
import {
  OBJECT_NAMES,
  CONTROL_KEYWORDS,
  PROPERTY_NAMES,
  CONSTANTS,
} from "../src/shared/keywords.js";

const ROOT = resolve(import.meta.dirname!, "..");
const GRAMMAR_PATH = join(ROOT, "syntaxes/railsim2.tmLanguage.json");

const grammar = JSON.parse(readFileSync(GRAMMAR_PATH, "utf-8"));

// ---------------------------------------------------------------------------
// keywords.ts から期待値を取得（yes/no は Grammar の constant ルールに含まれない）
// ---------------------------------------------------------------------------

const expectedObjects = [...OBJECT_NAMES];
const expectedProperties = [...PROPERTY_NAMES];
const expectedConstants = CONSTANTS.filter((c) => c !== "yes" && c !== "no");

// ---------------------------------------------------------------------------
// Grammar から実際の語彙を抽出
// ---------------------------------------------------------------------------

function extractRegexWords(pattern: string): string[] {
  const match = pattern.match(/\\b\(([^)]+)\)\\b/);
  if (!match) return [];
  return match[1].split("|");
}

const repo = grammar.repository;

// sym-objects: \\b((objects)|(controls))\\b
const objectsBegin: string = repo["sym-objects"].begin;
const objectsMatch = objectsBegin.match(/\\b\(\(([^)]+)\)\|\(([^)]+)\)\)\\b/);
const grammarObjectNames = objectsMatch ? objectsMatch[1].split("|") : [];
const grammarControlKeywords = objectsMatch ? objectsMatch[2].split("|") : [];

// sym-properties
const grammarPropertyNames = extractRegexWords(repo["sym-properties"].begin);

// constant
const grammarConstants = extractRegexWords(repo["constant"].match);

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe("Grammar coverage — object names", () => {
  it("should contain exactly the schema-derived object names", () => {
    expect(grammarObjectNames).toEqual(expectedObjects);
  });

  it("should contain exactly the control keywords", () => {
    expect(grammarControlKeywords).toEqual([...CONTROL_KEYWORDS]);
  });

  it("should not contain colon-variant keys", () => {
    for (const name of grammarObjectNames) {
      expect(name).not.toContain(":");
    }
  });
});

describe("Grammar coverage — properties", () => {
  it("should contain exactly the schema-derived + legacy property names", () => {
    expect(grammarPropertyNames).toEqual(expectedProperties);
  });

  it("every schema property should be present in Grammar", () => {
    for (const obj of Object.values(semanticSchema)) {
      for (const prop of Object.keys(obj.properties)) {
        expect(
          grammarPropertyNames,
          `Missing schema property: ${prop}`,
        ).toContain(prop);
      }
    }
  });
});

describe("Grammar coverage — constants", () => {
  it("should contain exactly the schema-derived + legacy constants", () => {
    expect(grammarConstants).toEqual([...expectedConstants]);
  });

  it("should include all PluginType enum values", () => {
    const pluginTypes = [
      "Rail", "Tie", "Girder", "Pier", "Line", "Pole",
      "Train", "Station", "Struct", "Surface", "Env", "Skin",
    ];
    for (const pt of pluginTypes) {
      expect(grammarConstants).toContain(pt);
    }
  });
});

describe("Grammar structure", () => {
  it("should have scopeName source.rs2", () => {
    expect(grammar.scopeName).toBe("source.rs2");
  });

  it("should have all 12 fileTypes", () => {
    expect(grammar.fileTypes).toHaveLength(12);
  });

  it("should have yes-no rule", () => {
    expect(repo["yes-no"]).toBeDefined();
  });

  it("should have Case/Default in sym-case-clause", () => {
    expect(repo["sym-case-clause"]).toBeDefined();
  });
});
