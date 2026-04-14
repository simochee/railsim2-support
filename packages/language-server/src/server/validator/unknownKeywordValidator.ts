import type { FileNode } from "../../shared/ast.js";
import type { Diagnostic } from "../../shared/diagnostics.js";
import { unknown as msg } from "../../shared/messages.js";
import { OBJECT_NAME_SET, CONTROL_KEYWORD_SET, PROPERTY_NAME_SET } from "../../shared/keywords.js";
import { walkNodes } from "../../shared/astWalker.js";

export function validateUnknownKeywords(file: FileNode): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  walkNodes(file.body, {
    object(node) {
      if (!OBJECT_NAME_SET.has(node.name) && !CONTROL_KEYWORD_SET.has(node.name)) {
        diagnostics.push({
          message: msg.objectName(node.name),
          range: node.nameRange,
          severity: "warning",
        });
      }
    },
    property(node) {
      if (!PROPERTY_NAME_SET.has(node.name)) {
        diagnostics.push({
          message: msg.propertyName(node.name),
          range: node.nameRange,
          severity: "warning",
        });
      }
    },
  });

  return diagnostics;
}
