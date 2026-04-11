import type { FileNode } from "../shared/ast.js";

/**
 * AST から PluginHeader > PluginType の値を抽出する。
 * 直接のルートオブジェクト・直接のプロパティのみ対象。
 * If/ApplySwitch 内の PluginType は曖昧なため無視する。
 */
export function extractPluginType(file: FileNode): string | undefined {
  for (const node of file.body) {
    if (node.type !== "object" || node.name !== "PluginHeader") continue;

    for (const child of node.body) {
      if (child.type !== "property" || child.name !== "PluginType") continue;
      if (child.values.length === 1 && child.values[0].type === "identifier") {
        return child.values[0].value;
      }
    }
  }
  return undefined;
}
