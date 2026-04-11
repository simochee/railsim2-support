import type {
  TopLevelNode,
  BodyNode,
  ObjectNode,
  PropertyNode,
  IfNode,
  ApplySwitchNode,
  CaseNode,
  CommentNode,
} from "./ast.js";

export interface AstVisitor {
  object?: (node: ObjectNode) => void;
  property?: (node: PropertyNode) => void;
  if_?: (node: IfNode) => void;
  applySwitch?: (node: ApplySwitchNode) => void;
  case_?: (node: CaseNode) => void;
  comment?: (node: CommentNode) => void;
}

export function walkNodes(nodes: readonly (TopLevelNode | BodyNode)[], visitor: AstVisitor): void {
  for (const node of nodes) {
    switch (node.type) {
      case "object":
        visitor.object?.(node);
        walkNodes(node.body, visitor);
        break;
      case "property":
        visitor.property?.(node);
        break;
      case "if":
        visitor.if_?.(node);
        walkNodes(node.then, visitor);
        if (node.else_) walkNodes(node.else_, visitor);
        break;
      case "applySwitch":
        visitor.applySwitch?.(node);
        for (const c of node.cases) {
          visitor.case_?.(c);
          walkNodes(c.body, visitor);
        }
        if (node.default_) walkNodes(node.default_, visitor);
        break;
      case "comment":
        visitor.comment?.(node);
        break;
    }
  }
}
