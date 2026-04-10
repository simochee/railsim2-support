import type { Range } from "./tokens.js";

export type FileNode = { type: "file"; body: TopLevelNode[]; range: Range };
export type TopLevelNode = ObjectNode | IfNode | ApplySwitchNode | CommentNode;

export type ObjectNode = {
  type: "object";
  name: string;
  args: ExprNode[];
  body: BodyNode[];
  range: Range;
  nameRange: Range;
  bodyRange: Range;
};

export type BodyNode = ObjectNode | PropertyNode | IfNode | ApplySwitchNode | CommentNode;

export type PropertyNode = {
  type: "property";
  name: string;
  values: ExprNode[];
  range: Range;
  nameRange: Range;
  inlineComment?: CommentNode;
  trailingComment?: CommentNode;
};

export type IfNode = {
  type: "if";
  condition: ExprNode;
  then: BodyNode[];
  thenRange: Range;
  else_?: BodyNode[];
  elseRange?: Range;
  range: Range;
};

export type ApplySwitchNode = {
  type: "applySwitch";
  switchName: ExprNode;
  switchNameRange: Range;
  cases: CaseNode[];
  default_?: BodyNode[];
  defaultRange?: Range;
  range: Range;
};

export type CaseNode = {
  type: "case";
  values: ExprNode[];
  valuesRange: Range;
  body: BodyNode[];
  bodyRange: Range;
  range: Range;
};

export type CommentNode = {
  type: "comment";
  value: string;
  kind: "line" | "block";
  range: Range;
};

export type ExprNode =
  | { type: "number"; value: number; range: Range }
  | { type: "string"; value: string; range: Range }
  | { type: "identifier"; value: string; range: Range }
  | { type: "color"; value: string; range: Range }
  | { type: "boolean"; value: boolean; range: Range }
  | { type: "binary"; op: string; left: ExprNode; right: ExprNode; range: Range }
  | { type: "unary"; op: string; operand: ExprNode; range: Range };
