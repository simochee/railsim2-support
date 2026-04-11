/**
 * RailSim2 keyword definitions — derived from semanticSchema (Single Source of Truth).
 *
 * Object names, property names, and constants are extracted from the semantic schema.
 * Control/case keywords are structural and defined here directly.
 */

import { semanticSchema } from "../schema/semantic.generated.js";

// ---------------------------------------------------------------------------
// semantic schema からの自動導出
// ---------------------------------------------------------------------------

/** 制御キーワード — オブジェクト名から除外 */
const CONTROL_EXCLUDE = new Set(["ApplySwitch", "If", "Else", "Case", "Default"]);

function deriveObjectNames(): string[] {
  const names = new Set<string>();
  for (const key of Object.keys(semanticSchema)) {
    const name = key.includes(":") ? key.split(":")[0] : key;
    if (!CONTROL_EXCLUDE.has(name)) names.add(name);
  }
  return [...names].sort();
}

function derivePropertyNames(): string[] {
  const names = new Set<string>();
  for (const obj of Object.values(semanticSchema)) {
    for (const prop of Object.keys(obj.properties)) {
      names.add(prop);
    }
  }
  return [...names].sort();
}

/** スキーマ未定義だが RailSim2 で使われるレガシー定数 */
const LEGACY_CONSTANTS = ["DayAlpha", "NightAlpha"];

function deriveEnumValues(): string[] {
  const values = new Set<string>();
  for (const obj of Object.values(semanticSchema)) {
    for (const prop of Object.values(obj.properties)) {
      if (prop.type === "enum" && prop.enumValues) {
        for (const v of prop.enumValues) {
          values.add(v);
        }
      }
    }
  }
  // yes/no は言語リテラルとして追加
  values.add("yes");
  values.add("no");
  for (const c of LEGACY_CONSTANTS) values.add(c);
  return [...values].sort();
}

// ---------------------------------------------------------------------------
// Object names (storage.type)
// ---------------------------------------------------------------------------

export const OBJECT_NAMES: readonly string[] = deriveObjectNames();

// ---------------------------------------------------------------------------
// Control keywords (keyword.control)
// ---------------------------------------------------------------------------

export const CONTROL_KEYWORDS = ["ApplySwitch", "Else", "If"] as const satisfies readonly string[];

// ---------------------------------------------------------------------------
// Case keywords (keyword.control.switch)
// ---------------------------------------------------------------------------

export const CASE_KEYWORDS = ["Case", "Default"] as const satisfies readonly string[];

// ---------------------------------------------------------------------------
// Property names (variable.parameter.property)
// ---------------------------------------------------------------------------

export const PROPERTY_NAMES: readonly string[] = derivePropertyNames();

// ---------------------------------------------------------------------------
// Constants (support.constant + yes/no)
// ---------------------------------------------------------------------------

export const CONSTANTS: readonly string[] = deriveEnumValues();

// ---------------------------------------------------------------------------
// Set versions for O(1) lookup
// ---------------------------------------------------------------------------

export const OBJECT_NAME_SET: ReadonlySet<string> = new Set(OBJECT_NAMES);
export const CONTROL_KEYWORD_SET: ReadonlySet<string> = new Set(CONTROL_KEYWORDS);
export const CASE_KEYWORD_SET: ReadonlySet<string> = new Set(CASE_KEYWORDS);
export const PROPERTY_NAME_SET: ReadonlySet<string> = new Set(PROPERTY_NAMES);
export const CONSTANT_SET: ReadonlySet<string> = new Set(CONSTANTS);

// ---------------------------------------------------------------------------
// Classifier
// ---------------------------------------------------------------------------

export type IdentifierKind = "object" | "control" | "case" | "property" | "constant" | "unknown";

export function classifyIdentifier(name: string): IdentifierKind {
  if (CONTROL_KEYWORD_SET.has(name)) return "control";
  if (CASE_KEYWORD_SET.has(name)) return "case";
  if (OBJECT_NAME_SET.has(name)) return "object";
  if (PROPERTY_NAME_SET.has(name)) return "property";
  if (CONSTANT_SET.has(name)) return "constant";
  return "unknown";
}
