import type { FileNode, ExprNode, ApplySwitchNode } from "../../shared/ast.js";
import type { Diagnostic } from "../../shared/diagnostics.js";
import type { SwitchEntry } from "../switchSymbols.js";
import {
  type SwitchIndex,
  getReferencedSwitch,
  SYSTEM_SWITCHES,
  evaluateStaticNumber,
  extractSwitchComparison,
  unwrapGroup,
} from "../switchSymbols.js";
import { walkNodes } from "../../shared/astWalker.js";

function formatSwitchValueWarning(val: number, name: string, entries: readonly SwitchEntry[]): string {
  if (entries.length === 0) {
    return `スイッチ '${name}' にエントリーがありません`;
  }
  if (entries.length <= 5) {
    const labels = entries.map((e) => `${e.index}=${e.label}`).join(", ");
    return `スイッチ '${name}' に値 ${val} は定義されていません (有効: ${labels})`;
  }
  return `スイッチ '${name}' に値 ${val} は定義されていません (有効範囲: 0..${entries.length - 1})`;
}

export function validateSwitches(file: FileNode, switchIndex: SwitchIndex): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Report duplicate definitions
  for (const [name, defs] of switchIndex.duplicates) {
    for (const def of defs) {
      diagnostics.push({
        message: `スイッチ定義 '${name}' が重複しています`,
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

    const unwrapped = unwrapGroup(expr);
    const range =
      unwrapped.type === "binary" && unwrapGroup(unwrapped.left).type === "string"
        ? unwrapGroup(unwrapped.left).range
        : expr.range;

    diagnostics.push({
      message: `未定義のスイッチ '${name}' が参照されています`,
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
        message: `スイッチ '${switchName}' の値 ${val} は有効な整数インデックスではありません`,
        range: expr.range,
        severity: "warning",
      });
      return;
    }

    if (entries.length === 0) {
      diagnostics.push({
        message: `スイッチ '${switchName}' にエントリーがありません`,
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
