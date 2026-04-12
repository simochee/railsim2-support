import type { FileNode, ExprNode } from "../../shared/ast.js";
import type { Diagnostic } from "../../shared/diagnostics.js";
import { type SwitchIndex, getReferencedSwitch, SYSTEM_SWITCHES } from "../switchSymbols.js";
import { walkNodes } from "../../shared/astWalker.js";

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
    },
    applySwitch(node) {
      checkSwitchRef(node.switchName);
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

  return diagnostics;
}
