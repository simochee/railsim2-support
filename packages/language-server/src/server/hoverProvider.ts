import type { Hover, Position } from "vscode-languageserver/node";
import { MarkupKind } from "vscode-languageserver/node";
import type { FileNode, BodyNode, TopLevelNode } from "../shared/ast.js";
import { getObjectDoc, getPropertyDoc } from "./hoverData.generated.js";

/**
 * Find the AST node at the given cursor position and return hover info.
 */
export function getHover(file: FileNode, position: Position): Hover | null {
  // Walk the AST to find what's at the cursor
  const result = findNodeAt(file.body, position);
  if (!result) return null;

  if (result.kind === "objectName") {
    const doc = getObjectDoc(result.name);
    if (!doc) return null;

    const lines = [`**${result.name}**`];
    if (doc.description) lines.push("", doc.description);
    lines.push("", `[${doc.helpTitle || "Help"}](${doc.helpUrl})`);

    return {
      contents: { kind: MarkupKind.Markdown, value: lines.join("\n") },
    };
  }

  if (result.kind === "propertyName") {
    // Look up property in the context of the parent object
    const propDoc = result.parentObject
      ? getPropertyDoc(result.parentObject, result.name)
      : undefined;

    // Also try to get the object doc for a help link
    const objDoc = result.parentObject ? getObjectDoc(result.parentObject) : undefined;

    // Use property-level helpUrl if available, fall back to object-level
    const helpUrl = propDoc?.helpUrl ?? objDoc?.helpUrl;
    const helpTitle = propDoc?.helpTitle ?? objDoc?.helpTitle;

    const lines = [`**${result.name}**`];
    if (propDoc?.description) lines.push("", propDoc.description);
    if (helpUrl) lines.push("", `[${helpTitle || "Help"}](${helpUrl})`);

    if (lines.length === 1) return null; // No useful info
    return {
      contents: { kind: MarkupKind.Markdown, value: lines.join("\n") },
    };
  }

  return null;
}

// ── AST traversal ────────────────────────────────────────────────────────────

type HoverTarget =
  | { kind: "objectName"; name: string }
  | { kind: "propertyName"; name: string; parentObject: string | null };

function containsPosition(range: { start: Position; end: Position }, pos: Position): boolean {
  if (pos.line < range.start.line || pos.line > range.end.line) return false;
  if (pos.line === range.start.line && pos.character < range.start.character) return false;
  if (pos.line === range.end.line && pos.character >= range.end.character) return false;
  return true;
}

function findNodeAt(
  nodes: (TopLevelNode | BodyNode)[],
  pos: Position,
  parentObjectName: string | null = null,
): HoverTarget | null {
  for (const node of nodes) {
    if (!containsPosition(node.range, pos)) continue;

    if (node.type === "object") {
      // Check if cursor is on the object name
      if (containsPosition(node.nameRange, pos)) {
        return { kind: "objectName", name: node.name };
      }
      // Recurse into body
      const inner = findNodeAt(node.body, pos, node.name);
      if (inner) return inner;
    }

    if (node.type === "property") {
      if (containsPosition(node.nameRange, pos)) {
        return {
          kind: "propertyName",
          name: node.name,
          parentObject: parentObjectName,
        };
      }
    }

    if (node.type === "if") {
      const inner = findNodeAt(node.then, pos, parentObjectName);
      if (inner) return inner;
      if (node.else_) {
        const elseInner = findNodeAt(node.else_, pos, parentObjectName);
        if (elseInner) return elseInner;
      }
    }

    if (node.type === "applySwitch") {
      for (const c of node.cases) {
        const inner = findNodeAt(c.body, pos, parentObjectName);
        if (inner) return inner;
      }
      if (node.default_) {
        const inner = findNodeAt(node.default_, pos, parentObjectName);
        if (inner) return inner;
      }
    }
  }
  return null;
}
