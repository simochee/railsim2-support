import { InlayHint, InlayHintKind } from "vscode-languageserver";
import type { Range } from "vscode-languageserver";
import type { FileNode, TopLevelNode, BodyNode, ExprNode } from "../shared/ast.js";
import type { SwitchIndex, SwitchDefinition } from "./switchSymbols.js";
import type { Position } from "../shared/tokens.js";

const COMPARISON_OPS = new Set(["==", "!=", "<", ">", "<=", ">="]);

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

  function addHintForNumber(expr: ExprNode, def: SwitchDefinition | undefined): void {
    if (!def) return;
    if (expr.type !== "number") return;
    if (!Number.isInteger(expr.value) || expr.value < 0) return;
    const entry = def.entries[expr.value];
    if (!entry) return;
    if (!posInRange(expr.range.end)) return;
    hints.push({
      position: expr.range.end,
      label: entry.label,
      kind: InlayHintKind.Parameter,
      paddingLeft: true,
    });
  }

  function visitExpr(expr: ExprNode, switchIdx: SwitchIndex): void {
    if (expr.type === "binary") {
      if (COMPARISON_OPS.has(expr.op) && expr.left.type === "string" && expr.right.type === "number") {
        const def = switchIdx.definitions.get(expr.left.value);
        addHintForNumber(expr.right, def);
      }
      visitExpr(expr.left, switchIdx);
      visitExpr(expr.right, switchIdx);
    } else if (expr.type === "unary") {
      visitExpr(expr.operand, switchIdx);
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
          visitExpr(node.condition, switchIndex);
          visit(node.then);
          if (node.else_) visit(node.else_);
          break;
        case "applySwitch": {
          let switchDef: SwitchDefinition | undefined;
          if (node.switchName.type === "string") {
            switchDef = switchIndex.definitions.get(node.switchName.value);
          }
          for (const c of node.cases) {
            if (!rangesOverlap(c.range)) continue;
            for (const val of c.values) {
              addHintForNumber(val, switchDef);
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
