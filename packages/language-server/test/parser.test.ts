import { describe, it, expect } from "vitest";
import { parse } from "../src/server/parser.js";
import type { ObjectNode, PropertyNode, IfNode, ApplySwitchNode } from "../src/shared/ast.js";

describe("parser", () => {
  // Basics
  it("should parse empty input → file with empty body, no diagnostics", () => {
    const { file, diagnostics } = parse("");
    expect(file.type).toBe("file");
    expect(file.body).toHaveLength(0);
    expect(diagnostics).toHaveLength(0);
  });

  it("should parse a simple object: Body { }", () => {
    const { file, diagnostics } = parse("Body { }");
    expect(diagnostics).toHaveLength(0);
    expect(file.body).toHaveLength(1);
    const obj = file.body[0] as ObjectNode;
    expect(obj.type).toBe("object");
    expect(obj.name).toBe("Body");
    expect(obj.args).toHaveLength(0);
    expect(obj.body).toHaveLength(0);
  });

  it('should parse object with string argument: Object3D "main" { }', () => {
    const { file, diagnostics } = parse('Object3D "main" { }');
    expect(diagnostics).toHaveLength(0);
    const obj = file.body[0] as ObjectNode;
    expect(obj.type).toBe("object");
    expect(obj.name).toBe("Object3D");
    expect(obj.args).toHaveLength(1);
    expect(obj.args[0].type).toBe("string");
    if (obj.args[0].type === "string") {
      expect(obj.args[0].value).toBe("main");
    }
  });

  it("should parse properties with comma-separated values: Body { Coord = 1.0, 2.0, 3.0; }", () => {
    const { file, diagnostics } = parse("Body { Coord = 1.0, 2.0, 3.0; }");
    expect(diagnostics).toHaveLength(0);
    const obj = file.body[0] as ObjectNode;
    const prop = obj.body[0] as PropertyNode;
    expect(prop.type).toBe("property");
    expect(prop.name).toBe("Coord");
    expect(prop.values).toHaveLength(3);
    expect(prop.values[0].type).toBe("number");
    if (prop.values[0].type === "number") expect(prop.values[0].value).toBe(1.0);
    if (prop.values[1].type === "number") expect(prop.values[1].value).toBe(2.0);
    if (prop.values[2].type === "number") expect(prop.values[2].value).toBe(3.0);
  });

  it("should parse nested objects: RailInfo { Profile { } }", () => {
    const { file, diagnostics } = parse("RailInfo { Profile { } }");
    expect(diagnostics).toHaveLength(0);
    const outer = file.body[0] as ObjectNode;
    expect(outer.name).toBe("RailInfo");
    expect(outer.body).toHaveLength(1);
    const inner = outer.body[0] as ObjectNode;
    expect(inner.type).toBe("object");
    expect(inner.name).toBe("Profile");
  });

  it("should skip comments in AST body", () => {
    const { file, diagnostics } = parse("// top comment\nBody { // inner\n}");
    expect(diagnostics).toHaveLength(0);
    // Comments are stored as CommentNode in the file body
    const comments = file.body.filter((n) => n.type === "comment");
    expect(comments.length).toBe(2);
    const objects = file.body.filter((n) => n.type === "object");
    expect(objects.length).toBe(1);
  });

  // If/Else — verify exact AST shape
  it("should parse If/Else → IfNode with condition, then[], else_[]", () => {
    const { file, diagnostics } = parse("Body { If 1 { Coord = 0; } Else { Coord = 1; } }");
    expect(diagnostics).toHaveLength(0);
    const body = file.body[0] as ObjectNode;
    const ifNode = body.body[0] as IfNode;
    expect(ifNode.type).toBe("if");
    expect(ifNode.condition.type).toBe("number");
    expect(ifNode.then).toHaveLength(1);
    expect(ifNode.else_).toHaveLength(1);
  });

  it("should parse If without Else", () => {
    const { file, diagnostics } = parse("Body { If 1 { Coord = 0; } }");
    expect(diagnostics).toHaveLength(0);
    const body = file.body[0] as ObjectNode;
    const ifNode = body.body[0] as IfNode;
    expect(ifNode.type).toBe("if");
    expect(ifNode.then).toHaveLength(1);
    expect(ifNode.else_).toBeUndefined();
  });

  // ApplySwitch — verify exact AST shape
  it("should parse ApplySwitch with Case/Default", () => {
    const { file, diagnostics } = parse(
      'ApplySwitch "_FRONT" { Case 0: Coord = 0; Case 1: Coord = 1; Default: Coord = 2; }',
    );
    expect(diagnostics).toHaveLength(0);
    const node = file.body[0] as ApplySwitchNode;
    expect(node.type).toBe("applySwitch");
    expect(node.switchName.type).toBe("string");
    expect(node.cases).toHaveLength(2);
    expect(node.default_).toHaveLength(1);
  });

  it("should parse ApplySwitch with multi-value Case", () => {
    const { file, diagnostics } = parse('ApplySwitch "_X" { Case 0, 1: Coord = 0; }');
    expect(diagnostics).toHaveLength(0);
    const node = file.body[0] as ApplySwitchNode;
    expect(node.cases).toHaveLength(1);
    expect(node.cases[0].values).toHaveLength(2);
  });

  // Expression precedence
  it("should respect operator precedence: 1+2*3 → binary(+, 1, binary(*, 2, 3))", () => {
    const { file, diagnostics } = parse("Body { X = 1+2*3; }");
    expect(diagnostics).toHaveLength(0);
    const obj = file.body[0] as ObjectNode;
    const prop = obj.body[0] as PropertyNode;
    const expr = prop.values[0];
    expect(expr.type).toBe("binary");
    if (expr.type === "binary") {
      expect(expr.op).toBe("+");
      expect(expr.left.type).toBe("number");
      if (expr.left.type === "number") expect(expr.left.value).toBe(1);
      expect(expr.right.type).toBe("binary");
      if (expr.right.type === "binary") {
        expect(expr.right.op).toBe("*");
        if (expr.right.left.type === "number") expect(expr.right.left.value).toBe(2);
        if (expr.right.right.type === "number") expect(expr.right.right.value).toBe(3);
      }
    }
  });

  it("should parse unary expressions: -1", () => {
    const { file, diagnostics } = parse("Body { X = -1; }");
    expect(diagnostics).toHaveLength(0);
    const obj = file.body[0] as ObjectNode;
    const prop = obj.body[0] as PropertyNode;
    const expr = prop.values[0];
    expect(expr.type).toBe("unary");
    if (expr.type === "unary") {
      expect(expr.op).toBe("-");
      expect(expr.operand.type).toBe("number");
    }
  });

  it("should parse parenthesized expressions", () => {
    const { file, diagnostics } = parse("Body { X = (1+2)*3; }");
    expect(diagnostics).toHaveLength(0);
    const obj = file.body[0] as ObjectNode;
    const prop = obj.body[0] as PropertyNode;
    const expr = prop.values[0];
    expect(expr.type).toBe("binary");
    if (expr.type === "binary") {
      expect(expr.op).toBe("*");
      expect(expr.left.type).toBe("binary");
    }
  });

  it("should parse parenthesized value lists (tuple syntax)", () => {
    const { file, diagnostics } = parse("Axle { Coord = (0.9, 0.0); }");
    expect(diagnostics).toHaveLength(0);
    const obj = file.body[0] as ObjectNode;
    const prop = obj.body[0] as PropertyNode;
    expect(prop.values).toHaveLength(2);
    expect(prop.values[0].type).toBe("number");
    expect(prop.values[1].type).toBe("number");
  });

  it("should parse parenthesized 3D vector", () => {
    const { file, diagnostics } = parse("Joint3D { AttachCoord = (0.0, 0.57, 0.0); }");
    expect(diagnostics).toHaveLength(0);
    const obj = file.body[0] as ObjectNode;
    const prop = obj.body[0] as PropertyNode;
    expect(prop.values).toHaveLength(3);
  });

  it("should parse negative values in parenthesized list", () => {
    const { file, diagnostics } = parse("Axle { Coord = (-8.25, 0.43); }");
    expect(diagnostics).toHaveLength(0);
    const obj = file.body[0] as ObjectNode;
    const prop = obj.body[0] as PropertyNode;
    expect(prop.values).toHaveLength(2);
    expect(prop.values[0].type).toBe("unary");
  });

  it("should parse boolean values yes/no", () => {
    const { file, diagnostics } = parse("Body { Flag = yes; }");
    expect(diagnostics).toHaveLength(0);
    const obj = file.body[0] as ObjectNode;
    const prop = obj.body[0] as PropertyNode;
    expect(prop.values[0].type).toBe("boolean");
    if (prop.values[0].type === "boolean") expect(prop.values[0].value).toBe(true);
  });

  it("should parse color values", () => {
    const { file, diagnostics } = parse("Body { Color = #FF00FF80; }");
    expect(diagnostics).toHaveLength(0);
    const obj = file.body[0] as ObjectNode;
    const prop = obj.body[0] as PropertyNode;
    expect(prop.values[0].type).toBe("color");
    if (prop.values[0].type === "color") expect(prop.values[0].value).toBe("#FF00FF80");
  });

  // Error recovery
  it("should collect parse errors without crashing: Body { Coord = ; }", () => {
    const { file, diagnostics } = parse("Body { Coord = ; }");
    expect(file.type).toBe("file");
    expect(diagnostics.length).toBeGreaterThan(0);
  });

  it("should recover from errors and continue: Body { Coord = ; Height = 1.0; }", () => {
    const { file, diagnostics } = parse("Body { Coord = ; Height = 1.0; }");
    expect(file.type).toBe("file");
    expect(diagnostics.length).toBeGreaterThan(0);
    // Should still parse the second property
    const obj = file.body[0] as ObjectNode;
    const props = obj.body.filter((n) => n.type === "property") as PropertyNode[];
    // At least Height should be parsed
    const heightProp = props.find((p) => p.name === "Height");
    expect(heightProp).toBeDefined();
    if (heightProp) {
      expect(heightProp.values).toHaveLength(1);
      if (heightProp.values[0].type === "number") expect(heightProp.values[0].value).toBe(1.0);
    }
  });

  // Realistic file
  it("should parse a realistic RailSim2 file with no diagnostics", () => {
    const source = `
// RailSim2 plugin definition
PluginHeader {
  PluginType = Train;
  PluginName = "Test Train";
  PluginAuthor = "Author";
  RailSimVersion = 2;
}

Body {
  ModelFileName = "body.x";
  ModelScale = 1.0;
  Coord = 0.0, 0.0, 0.0;

  Object3D "headlight" {
    ModelFileName = "light.x";
    Coord = 0.0, 1.5, 5.0;
  }

  If 1 {
    Transparent = yes;
  } Else {
    Transparent = no;
  }

  Material {
    Diffuse = 1.0, 1.0, 1.0, 1.0;
    Ambient = 0.5, 0.5, 0.5;
    TexFileName = "tex.bmp";
  }
}

ApplySwitch "_FRONT" {
  Case 0:
    Coord = 0.0, 0.0, 0.0;
  Case 1:
    Coord = 1.0, 0.0, 0.0;
  Default:
    Coord = 0.5, 0.0, 0.0;
}
`;
    const { file, diagnostics } = parse(source);
    expect(diagnostics).toHaveLength(0);

    // Filter out comments
    const nonComments = file.body.filter((n) => n.type !== "comment");
    expect(nonComments).toHaveLength(3); // PluginHeader, Body, ApplySwitch

    const header = nonComments[0] as ObjectNode;
    expect(header.name).toBe("PluginHeader");

    const body = nonComments[1] as ObjectNode;
    expect(body.name).toBe("Body");

    const applySwitch = nonComments[2] as ApplySwitchNode;
    expect(applySwitch.type).toBe("applySwitch");
    expect(applySwitch.cases).toHaveLength(2);
    expect(applySwitch.default_).toBeDefined();
  });

  // Comparison operators in expressions
  it("should parse comparison operators", () => {
    const { file, diagnostics } = parse("Body { X = 1 == 2; }");
    expect(diagnostics).toHaveLength(0);
    const obj = file.body[0] as ObjectNode;
    const prop = obj.body[0] as PropertyNode;
    expect(prop.values[0].type).toBe("binary");
    if (prop.values[0].type === "binary") {
      expect(prop.values[0].op).toBe("==");
    }
  });

  it("should parse logical operators with correct precedence", () => {
    // a && b || c  =>  binary(||, binary(&&, a, b), c)
    // because && has lower number (11) than || (12), so && binds tighter
    const { file, diagnostics } = parse("Body { X = 1 && 2 || 3; }");
    expect(diagnostics).toHaveLength(0);
    const obj = file.body[0] as ObjectNode;
    const prop = obj.body[0] as PropertyNode;
    const expr = prop.values[0];
    expect(expr.type).toBe("binary");
    if (expr.type === "binary") {
      expect(expr.op).toBe("||");
      expect(expr.left.type).toBe("binary");
      if (expr.left.type === "binary") {
        expect(expr.left.op).toBe("&&");
      }
    }
  });

  // Top-level If
  it("should parse top-level If/Else", () => {
    const { file, diagnostics } = parse("If 1 { Body { } } Else { Body { } }");
    expect(diagnostics).toHaveLength(0);
    const ifNode = file.body[0] as IfNode;
    expect(ifNode.type).toBe("if");
    expect(ifNode.then).toHaveLength(1);
    expect(ifNode.else_).toHaveLength(1);
  });

  // nameRange
  it("should have correct nameRange for objects and properties", () => {
    const { file, diagnostics } = parse("Body { Coord = 1; }");
    expect(diagnostics).toHaveLength(0);
    const obj = file.body[0] as ObjectNode;
    expect(obj.nameRange.start.character).toBe(0);
    expect(obj.nameRange.end.character).toBe(4); // "Body" is 4 chars
    const prop = obj.body[0] as PropertyNode;
    expect(prop.nameRange.start.character).toBe(7);
    expect(prop.nameRange.end.character).toBe(12); // "Coord" is 5 chars
  });

  it("should verify Case body contains concrete AST nodes", () => {
    const { file } = parse('ApplySwitch "_X" { Case 0: Coord = 10; Default: Coord = 20; }');
    const sw = file.body[0] as ApplySwitchNode;
    // Case body
    expect(sw.cases[0].body).toHaveLength(1);
    const caseProp = sw.cases[0].body[0] as PropertyNode;
    expect(caseProp.type).toBe("property");
    expect(caseProp.name).toBe("Coord");
    // Default body
    expect(sw.default_).toHaveLength(1);
    const defProp = sw.default_![0] as PropertyNode;
    expect(defProp.type).toBe("property");
    expect(defProp.name).toBe("Coord");
  });

  it("should not infinite-loop on object inside ApplySwitch without Case", () => {
    const { diagnostics } = parse('ApplySwitch "_SW" { Profile { Coord = 1; } }');
    expect(diagnostics.length).toBeGreaterThan(0);
  }, 2000);

  it("should not infinite-loop on property inside ApplySwitch without Case", () => {
    const { diagnostics } = parse('ApplySwitch "_SW" { Coord = 1; }');
    expect(diagnostics.length).toBeGreaterThan(0);
  }, 2000);

  it("should recover at object-start sync point after error", () => {
    // Error in first object, second object should still parse
    const { file, diagnostics } = parse("Foo { = } Bar { Coord = 1; }");
    expect(diagnostics.length).toBeGreaterThan(0);
    // Bar should be parsed as a separate object
    const objects = file.body.filter((n) => n.type === "object") as ObjectNode[];
    expect(objects.length).toBeGreaterThanOrEqual(2);
    const bar = objects.find((o) => o.name === "Bar");
    expect(bar).toBeDefined();
  });

  // --- Unclosed structure range.end extends to EOF ---

  it("should extend unclosed object range.end to EOF position", () => {
    const src = "RailInfo {\n  Gauge = 1.0;\n";
    const { file, diagnostics } = parse(src);
    expect(diagnostics.length).toBeGreaterThan(0);
    const obj = file.body[0] as ObjectNode;
    expect(obj.type).toBe("object");
    expect(obj.name).toBe("RailInfo");
    // range.end should be at EOF, not at the last real token
    // EOF is at line 2, character 0 (after the trailing newline)
    expect(obj.range.end.line).toBeGreaterThanOrEqual(2);
  });

  it("should extend unclosed If range.end to EOF position", () => {
    const src = "Foo {\n  If 1 {\n    Gauge = 1.0;\n";
    const { file, diagnostics } = parse(src);
    expect(diagnostics.length).toBeGreaterThan(0);
    const obj = file.body[0] as ObjectNode;
    expect(obj.type).toBe("object");
    const ifNode = obj.body.find((n) => n.type === "if") as IfNode;
    expect(ifNode).toBeDefined();
    // The If's range.end should extend to EOF
    expect(ifNode.range.end.line).toBeGreaterThanOrEqual(2);
  });

  it("should extend unclosed ApplySwitch range.end to EOF position", () => {
    const src = "Foo {\n  ApplySwitch x {\n    Case 1:\n      Gauge = 1.0;\n";
    const { file, diagnostics } = parse(src);
    expect(diagnostics.length).toBeGreaterThan(0);
    const obj = file.body[0] as ObjectNode;
    expect(obj.type).toBe("object");
    const asNode = obj.body.find((n) => n.type === "applySwitch") as ApplySwitchNode;
    expect(asNode).toBeDefined();
    // The ApplySwitch's range.end should extend to EOF
    expect(asNode.range.end.line).toBeGreaterThanOrEqual(3);
  });
});
