import type { FileNode, ObjectNode, PropertyNode, BodyNode, IfNode, ApplySwitchNode, CaseNode } from "../../shared/ast.js";
import type { Diagnostic } from "../../shared/diagnostics.js";
import { OBJECT_NAME_SET, CONTROL_KEYWORD_SET, PROPERTY_NAME_SET } from "../../shared/keywords.js";

export function validateUnknownKeywords(file: FileNode): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const node of file.body) {
    visitTopLevel(node);
  }

  return diagnostics;

  function visitTopLevel(node: BodyNode | IfNode | ApplySwitchNode): void {
    switch (node.type) {
      case "object":
        visitObject(node);
        break;
      case "property":
        visitProperty(node);
        break;
      case "if":
        visitIf(node);
        break;
      case "applySwitch":
        visitApplySwitch(node);
        break;
      case "comment":
        break;
    }
  }

  function visitObject(node: ObjectNode): void {
    if (!OBJECT_NAME_SET.has(node.name) && !CONTROL_KEYWORD_SET.has(node.name)) {
      diagnostics.push({
        message: `Unknown object name '${node.name}'`,
        range: node.nameRange,
        severity: "warning",
      });
    }
    for (const child of node.body) {
      visitTopLevel(child);
    }
  }

  function visitProperty(node: PropertyNode): void {
    if (!PROPERTY_NAME_SET.has(node.name)) {
      diagnostics.push({
        message: `Unknown property name '${node.name}'`,
        range: node.nameRange,
        severity: "warning",
      });
    }
  }

  function visitIf(node: IfNode): void {
    for (const child of node.then) {
      visitTopLevel(child);
    }
    if (node.else_) {
      for (const child of node.else_) {
        visitTopLevel(child);
      }
    }
  }

  function visitApplySwitch(node: ApplySwitchNode): void {
    for (const c of node.cases) {
      visitCase(c);
    }
    if (node.default_) {
      for (const child of node.default_) {
        visitTopLevel(child);
      }
    }
  }

  function visitCase(node: CaseNode): void {
    for (const child of node.body) {
      visitTopLevel(child);
    }
  }
}
