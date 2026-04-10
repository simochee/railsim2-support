import type { FileNode, TopLevelNode, BodyNode, IfNode, ApplySwitchNode, ExprNode } from "../../shared/ast.js";
import type { Diagnostic } from "../../shared/diagnostics.js";
import { type SwitchIndex, getReferencedSwitch, SYSTEM_SWITCHES } from "../switchSymbols.js";

export function validateSwitches(file: FileNode, switchIndex: SwitchIndex): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Report duplicate definitions
  for (const [name, defs] of switchIndex.duplicates) {
    for (const def of defs) {
      diagnostics.push({
        message: `スイッチ「${name}」が重複して定義されています`,
        range: def.switchNameRange,
        severity: "warning",
      });
    }
  }

  // Walk AST to find switch references
  function visit(nodes: (TopLevelNode | BodyNode)[]): void {
    for (const node of nodes) {
      switch (node.type) {
        case "object":
          visit(node.body);
          break;
        case "if":
          checkSwitchRef(node.condition);
          visit(node.then);
          if (node.else_) visit(node.else_);
          break;
        case "applySwitch":
          checkSwitchRef(node.switchName);
          for (const c of node.cases) visit(c.body);
          if (node.default_) visit(node.default_);
          break;
      }
    }
  }

  function checkSwitchRef(expr: ExprNode): void {
    const name = getReferencedSwitch(expr);
    if (name === null) return;
    if (switchIndex.definitions.has(name)) return;
    if (SYSTEM_SWITCHES.has(name)) return;

    // For binary expressions, point to the string literal (left side)
    const range = expr.type === "binary" && expr.left.type === "string"
      ? expr.left.range
      : expr.range;

    diagnostics.push({
      message: `未定義のスイッチ「${name}」が参照されています`,
      range,
      severity: "warning",
    });
  }

  visit(file.body);
  return diagnostics;
}
