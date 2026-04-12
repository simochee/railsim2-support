import type { FileNode, ExprNode, ApplySwitchNode } from "../../shared/ast.js";
import type { Diagnostic } from "../../shared/diagnostics.js";
import type { SwitchEntry } from "../switchSymbols.js";
import {
  type SwitchIndex,
  getReferencedSwitch,
  SYSTEM_SWITCHES,
  evaluateStaticNumber,
  extractSwitchComparison,
} from "../switchSymbols.js";
import { walkNodes } from "../../shared/astWalker.js";

function formatSwitchValueWarning(val: number, name: string, entries: readonly SwitchEntry[]): string {
  if (entries.length === 0) {
    return `Switch '${name}' has no entries`;
  }
  if (entries.length <= 5) {
    const labels = entries.map((e) => `${e.index}=${e.label}`).join(", ");
    return `Switch value ${val} is not defined in switch '${name}' (valid: ${labels})`;
  }
  return `Switch value ${val} is not defined in switch '${name}' (expected 0..${entries.length - 1})`;
}

export function validateSwitches(file: FileNode, switchIndex: SwitchIndex): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Report duplicate definitions
  for (const [name, defs] of switchIndex.duplicates) {
    for (const def of defs) {
      diagnostics.push({
        message: `Duplicate switch definition '${name}'`,
        range: def.switchNameRange,
        severity: "warning",
      });
    }
  }

  // Walk AST to find switch references
  walkNodes(file.body, {
    if_(node) {
      checkSwitchRef(node.condition);
      checkSwitchValue(node.condition);
    },
    applySwitch(node) {
      checkSwitchRef(node.switchName);
      checkCaseValues(node);
    },
  });

  function checkSwitchRef(expr: ExprNode): void {
    const name = getReferencedSwitch(expr);
    if (name === null) return;
    if (switchIndex.definitions.has(name)) return;
    if (SYSTEM_SWITCHES.has(name)) return;

    const range =
      expr.type === "binary" && expr.left.type === "string" ? expr.left.range : expr.range;

    diagnostics.push({
      message: `Reference to undefined switch '${name}'`,
      range,
      severity: "warning",
    });
  }

  function checkCaseValues(node: ApplySwitchNode): void {
    const name = getReferencedSwitch(node.switchName);
    if (name === null) return;
    const def = switchIndex.definitions.get(name);
    if (!def) return; // system switch — skip

    for (const c of node.cases) {
      for (const valExpr of c.values) {
        validateSwitchValueExpr(valExpr, name, def.entries);
      }
    }
  }

  function checkSwitchValue(condition: ExprNode): void {
    const comp = extractSwitchComparison(condition);
    if (!comp) return;
    const def = switchIndex.definitions.get(comp.switchName);
    if (!def) return; // system or undefined switch — skip

    validateSwitchValueExpr(comp.value, comp.switchName, def.entries);
  }

  function validateSwitchValueExpr(
    expr: ExprNode,
    switchName: string,
    entries: readonly SwitchEntry[],
  ): void {
    const val = evaluateStaticNumber(expr);
    if (val === null) return;

    if (!Number.isInteger(val)) {
      diagnostics.push({
        message: `Switch value ${val} is not a valid integer index for switch '${switchName}'`,
        range: expr.range,
        severity: "warning",
      });
      return;
    }

    if (entries.length === 0) {
      diagnostics.push({
        message: `Switch '${switchName}' has no entries`,
        range: expr.range,
        severity: "warning",
      });
      return;
    }

    if (val < 0 || val >= entries.length) {
      diagnostics.push({
        message: formatSwitchValueWarning(val, switchName, entries),
        range: expr.range,
        severity: "warning",
      });
    }
  }

  return diagnostics;
}
