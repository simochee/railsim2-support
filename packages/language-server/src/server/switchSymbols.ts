import type { Range } from "../shared/tokens.js";
import type { FileNode, ExprNode, TopLevelNode, BodyNode } from "../shared/ast.js";

export interface SwitchEntry {
  label: string;
  index: number;
}

export interface SwitchDefinition {
  name: string;
  entries: SwitchEntry[];
  switchNameRange: Range;
  range: Range;
}

export interface SwitchIndex {
  definitions: Map<string, SwitchDefinition>;
  duplicates: Map<string, SwitchDefinition[]>;
}

export const SYSTEM_SWITCHES: ReadonlySet<string> = new Set([
  "_FRONT", "_CONNECT1", "_CONNECT2", "_DOOR1", "_DOOR2",
  "_SERIAL", "_CAMDIST", "_VELOCITY", "_ACCEL", "_CABINVIEW",
  "_APPROACH1", "_APPROACH2", "_STOPPING",
  "_NIGHT", "_WEATHER", "_SEASON", "_SHADOW", "_ENVMAP",
  "_YEAR", "_MONTH", "_DAY", "_DAYOFWEEK",
  "_HOUR", "_MINUTE", "_SECOND",
]);

export function buildSwitchIndex(file: FileNode): SwitchIndex {
  const definitions = new Map<string, SwitchDefinition>();
  const duplicates = new Map<string, SwitchDefinition[]>();

  function visit(nodes: (TopLevelNode | BodyNode)[]): void {
    for (const node of nodes) {
      if (node.type === "object" && node.name === "DefineSwitch") {
        const nameArg = node.args[0];
        if (!nameArg || nameArg.type !== "string") continue;

        const entries: SwitchEntry[] = [];
        for (const child of node.body) {
          if (child.type === "property" && child.name === "Entry") {
            const val = child.values[0];
            if (val && val.type === "string") {
              entries.push({ label: val.value, index: entries.length });
            }
          }
        }

        const def: SwitchDefinition = {
          name: nameArg.value,
          entries,
          switchNameRange: nameArg.range,
          range: node.range,
        };

        if (definitions.has(nameArg.value)) {
          const existing = duplicates.get(nameArg.value);
          if (existing) {
            existing.push(def);
          } else {
            duplicates.set(nameArg.value, [definitions.get(nameArg.value)!, def]);
          }
        } else {
          definitions.set(nameArg.value, def);
        }
      } else if (node.type === "object") {
        visit(node.body);
      } else if (node.type === "if") {
        visit(node.then);
        if (node.else_) visit(node.else_);
      } else if (node.type === "applySwitch") {
        for (const c of node.cases) visit(c.body);
        if (node.default_) visit(node.default_);
      }
    }
  }

  visit(file.body);
  return { definitions, duplicates };
}

/** System switches with known discrete value labels */
export const SYSTEM_SWITCH_ENTRIES: ReadonlyMap<string, readonly SwitchEntry[]> = new Map([
  ["_FRONT", [{ label: "進行方向", index: 0 }, { label: "逆方向", index: 1 }]],
  ["_CONNECT1", [{ label: "未連結", index: 0 }, { label: "連結", index: 1 }]],
  ["_CONNECT2", [{ label: "未連結", index: 0 }, { label: "連結", index: 1 }]],
  ["_DOOR1", [{ label: "閉", index: 0 }, { label: "開", index: 1 }]],
  ["_DOOR2", [{ label: "閉", index: 0 }, { label: "開", index: 1 }]],
  ["_CABINVIEW", [{ label: "通常", index: 0 }, { label: "運転台視点", index: 1 }]],
  ["_NIGHT", [{ label: "昼", index: 0 }, { label: "夜", index: 1 }]],
  ["_SHADOW", [{ label: "無効", index: 0 }, { label: "有効", index: 1 }]],
  ["_ENVMAP", [{ label: "無効", index: 0 }, { label: "有効", index: 1 }]],
  ["_SEASON", [
    { label: "春", index: 0 }, { label: "夏", index: 1 },
    { label: "秋", index: 2 }, { label: "冬", index: 3 },
  ]],
  ["_DAYOFWEEK", [
    { label: "日", index: 0 }, { label: "月", index: 1 }, { label: "火", index: 2 },
    { label: "水", index: 3 }, { label: "木", index: 4 }, { label: "金", index: 5 },
    { label: "土", index: 6 },
  ]],
]);

/**
 * Get entries for a switch by name — checks user definitions first, then system switch entries.
 */
export function getSwitchEntries(name: string, switchIndex: SwitchIndex): readonly SwitchEntry[] | undefined {
  const userDef = switchIndex.definitions.get(name);
  if (userDef) return userDef.entries;
  return SYSTEM_SWITCH_ENTRIES.get(name);
}

const COMPARISON_OPS = new Set(["==", "!=", "<", ">", "<=", ">="]);

export function getReferencedSwitch(expr: ExprNode): string | null {
  if (expr.type === "string") return expr.value || null;
  if (expr.type === "binary" && COMPARISON_OPS.has(expr.op)) {
    if (expr.left.type === "string") return expr.left.value || null;
  }
  return null;
}
