import { InlayHint, InlayHintKind } from "vscode-languageserver";
import type { Range } from "vscode-languageserver";
import type { FileNode, TopLevelNode, BodyNode, ExprNode } from "../shared/ast.js";
import type { SwitchIndex, SwitchEntry } from "./switchSymbols.js";
import { getSwitchEntries, COMPARISON_OPS } from "./switchSymbols.js";
import type { Position } from "../shared/tokens.js";

export function getInlayHints(file: FileNode, switchIndex: SwitchIndex, range: Range): InlayHint[] {
  const hints: InlayHint[] = [];

  function posInRange(pos: Position): boolean {
    if (pos.line < range.start.line || pos.line > range.end.line) return false;
    if (pos.line === range.start.line && pos.character < range.start.character) return false;
    if (pos.line === range.end.line && pos.character >= range.end.character) return false;
    return true;
  }

  function rangesOverlap(nodeRange: { start: Position; end: Position }): boolean {
    if (nodeRange.end.line < range.start.line) return false;
    if (nodeRange.start.line > range.end.line) return false;
    return true;
  }

  function addHintForNumber(expr: ExprNode, entries: readonly SwitchEntry[] | undefined): void {
    if (!entries) return;
    if (expr.type !== "number") return;
    if (!Number.isInteger(expr.value) || expr.value < 0) return;
    const entry = entries[expr.value];
    if (!entry) return;
    if (!posInRange(expr.range.end)) return;
    hints.push({
      position: expr.range.end,
      label: entry.label,
      kind: InlayHintKind.Parameter,
      paddingLeft: true,
    });
  }

  function visitExpr(expr: ExprNode): void {
    if (expr.type === "binary") {
      if (COMPARISON_OPS.has(expr.op) && expr.left.type === "string" && expr.right.type === "number") {
        const entries = getSwitchEntries(expr.left.value, switchIndex);
        addHintForNumber(expr.right, entries);
      }
      visitExpr(expr.left);
      visitExpr(expr.right);
    } else if (expr.type === "unary") {
      visitExpr(expr.operand);
    }
  }

  function visit(nodes: (TopLevelNode | BodyNode)[]): void {
    for (const node of nodes) {
      if (!rangesOverlap(node.range)) continue;

      switch (node.type) {
        case "object":
          visit(node.body);
          break;
        case "if":
          visitExpr(node.condition);
          visit(node.then);
          if (node.else_) visit(node.else_);
          break;
        case "applySwitch": {
          let entries: readonly SwitchEntry[] | undefined;
          if (node.switchName.type === "string") {
            entries = getSwitchEntries(node.switchName.value, switchIndex);
          }
          for (const c of node.cases) {
            if (!rangesOverlap(c.range)) continue;
            for (const val of c.values) {
              addHintForNumber(val, entries);
            }
            visit(c.body);
          }
          if (node.default_) visit(node.default_);
          break;
        }
        case "comment":
        case "property":
          break;
      }
    }
  }

  visit(file.body);
  return hints;
}
