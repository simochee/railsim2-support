import { describe, it, expect } from "vitest";
import { format } from "../src/server/formatter.js";

describe("formatter", () => {
  // --- Basic structure ---

  it("should format a simple object with tab indentation", () => {
    const input = "Body{Coord=1;}";
    const result = format(input);
    expect(result).toBe("Body {\n\tCoord = 1;\n}\n");
  });

  it("should format nested objects", () => {
    const input = 'Body{Object3D "main"{Coord=1;}}';
    const result = format(input);
    expect(result).toBe('Body {\n\tObject3D "main" {\n\t\tCoord = 1;\n\t}\n}\n');
  });

  it("should format If/Else", () => {
    const input = "Body{If 1{Coord=0;}Else{Coord=1;}}";
    const result = format(input);
    expect(result).toBe("Body {\n\tIf 1 {\n\t\tCoord = 0;\n\t} Else {\n\t\tCoord = 1;\n\t}\n}\n");
  });

  it("should format ApplySwitch with Case/Default", () => {
    const input = 'ApplySwitch "_X"{Case 0:Coord=0;Default:Coord=1;}';
    const result = format(input);
    expect(result).toBe(
      'ApplySwitch "_X" {\n\tCase 0:\n\t\tCoord = 0;\n\tDefault:\n\t\tCoord = 1;\n}\n',
    );
  });

  it("should normalize spaces around operators in If conditions", () => {
    const input = 'Body { If "サウンド"==0 { Coord = 1; } }';
    const result = format(input);
    expect(result).toContain('If "サウンド" == 0 {');
  });

  it("should preserve parens in If condition expressions", () => {
    const input = 'If ("_YEAR"/10)%10 { Body { } }';
    const result = format(input);
    expect(result).toContain('If ("_YEAR" / 10) % 10 {');
  });

  it("should preserve expression formatting from source", () => {
    const input = "Body{X=1+2*3;}";
    const result = format(input);
    expect(result).toBe("Body {\n\tX = 1+2*3;\n}\n");
  });

  it("should preserve parenthesized expressions", () => {
    const input = "Body { X = (1+2)*3; }";
    const result = format(input);
    expect(result).toBe("Body {\n\tX = (1+2)*3;\n}\n");
  });

  it("should format comma-separated values", () => {
    const input = "Body{Coord=1.0,2.0,3.0;}";
    const result = format(input);
    expect(result).toBe("Body {\n\tCoord = 1.0, 2.0, 3.0;\n}\n");
  });

  it("should format tuple syntax with parens", () => {
    const input = "Body{Coord=(0.9,0.0);}";
    const result = format(input);
    expect(result).toBe("Body {\n\tCoord = (0.9, 0.0);\n}\n");
  });

  // --- = alignment ---

  it("should align = in consecutive property groups", () => {
    const input = "Body {\nModelFileName = \"body.x\";\nModelScale = 1.0;\nCoord = 0.0, 0.0, 0.0;\n}\n";
    const result = format(input);
    expect(result).toBe(
      "Body {\n\tModelFileName = \"body.x\";\n\tModelScale    = 1.0;\n\tCoord         = 0.0, 0.0, 0.0;\n}\n",
    );
  });

  it("should break alignment groups at blank lines", () => {
    const input = "Body {\n\tA = 1;\n\n\tLongName = 2;\n}\n";
    const result = format(input);
    // A and LongName are in separate groups (blank line between them)
    expect(result).toContain("\tA = 1;");
    expect(result).toContain("\tLongName = 2;");
    // A should NOT be padded to match LongName
    expect(result).not.toContain("\tA        = 1;");
  });

  it("should break alignment groups at non-property nodes", () => {
    const input = "Body {\nA = 1;\nInner { }\nB = 2;\n}\n";
    const result = format(input);
    expect(result).toContain("\tA = 1;");
    expect(result).toContain("\tB = 2;");
    // A and B should NOT be aligned to each other (separated by object)
    // Both are single-property groups so no padding is added
    expect(result).not.toContain("\tA  ");
  });

  // --- Blank line preservation ---

  it("should preserve blank lines from original source", () => {
    const input = "Body {\n\tA = 1;\n\n\tB = 2;\n}\n";
    const result = format(input);
    expect(result).toBe("Body {\n\tA = 1;\n\n\tB = 2;\n}\n");
  });

  it("should preserve multiple blank lines", () => {
    const input = "Body {\n\tA = 1;\n\n\n\tB = 2;\n}\n";
    const result = format(input);
    expect(result).toBe("Body {\n\tA = 1;\n\n\n\tB = 2;\n}\n");
  });

  // --- Comments ---

  it("should output line comments with correct indentation", () => {
    const input = "// top comment\nBody {\n// inner\nCoord = 1;\n}";
    const result = format(input);
    expect(result).toBe("// top comment\nBody {\n\t// inner\n\tCoord = 1;\n}\n");
  });

  it("should output block comments", () => {
    const input = "Body {\n/* multi\nline */\nCoord = 1;\n}";
    const result = format(input);
    expect(result).toBe("Body {\n\t/* multi\nline */\n\tCoord = 1;\n}\n");
  });

  it("should align = across comments within property groups", () => {
    const input = "Body {\nModelFileName = \"a\";\n// divider\nCoord = 1;\n}";
    const result = format(input);
    // Comments don't break alignment groups
    expect(result).toContain("\tModelFileName = \"a\";");
    expect(result).toContain("\t// divider");
    expect(result).toContain("\tCoord         = 1;");
  });

  it("should align = with interleaved comments like RailSim2 style", () => {
    const input = `TrainInfo {
FrontLimit = 10.65;
// 前方連結位置
TailLimit = -10.65;
MaxVelocity = 100.0;
MaxAcceleration = 2.1;
DoorClosingTime = 4.0;
}`;
    const result = format(input);
    expect(result).toContain("\tFrontLimit      = 10.65;");
    expect(result).toContain("\tTailLimit       = -10.65;");
    expect(result).toContain("\tMaxAcceleration = 2.1;");
    expect(result).toContain("\tDoorClosingTime = 4.0;");
  });

  // --- Negative values in tuple ---

  it("should preserve negative values in tuple", () => {
    const result = format("Body { Coord = (-8.25, 0.43); }");
    expect(result).toBe("Body {\n\tCoord = (-8.25, 0.43);\n}\n");
  });

  // --- Edge cases ---

  it("should handle empty input", () => {
    expect(format("")).toBe("");
  });

  it("should handle comments-only input", () => {
    expect(format("// just a comment")).toBe("// just a comment\n");
  });

  it("should format unary expressions", () => {
    const result = format("Body { X = -1; }");
    expect(result).toBe("Body {\n\tX = -1;\n}\n");
  });

  it("should format boolean values", () => {
    const result = format("Body { Flag = yes; }");
    expect(result).toBe("Body {\n\tFlag = yes;\n}\n");
  });

  it("should format color values", () => {
    const result = format("Body { Color = #FF00FF80; }");
    expect(result).toBe("Body {\n\tColor = #FF00FF80;\n}\n");
  });

  it("should format multi-value Case", () => {
    const result = format('ApplySwitch "_X" { Case 0, 1: Coord = 0; }');
    expect(result).toBe('ApplySwitch "_X" {\n\tCase 0, 1:\n\t\tCoord = 0;\n}\n');
  });

  it("should format top-level If", () => {
    const result = format("If 1 { Body { } }");
    expect(result).toBe("If 1 {\n\tBody {\n\t}\n}\n");
  });

  // --- Realistic file ---

  it("should format a realistic RailSim2 file", () => {
    const input = `// RailSim2 plugin
PluginHeader{PluginType=Train;PluginName="Test Train";PluginAuthor="Author";RailSimVersion=2;}

Body{ModelFileName="body.x";ModelScale=1.0;Coord=0.0,0.0,0.0;

Object3D "headlight"{ModelFileName="light.x";Coord=0.0,1.5,5.0;}

If 1{Transparent=yes;}Else{Transparent=no;}

Material{Diffuse=1.0,1.0,1.0,1.0;Ambient=0.5,0.5,0.5;TexFileName="tex.bmp";}}

ApplySwitch "_FRONT"{Case 0:Coord=0.0,0.0,0.0;Case 1:Coord=1.0,0.0,0.0;Default:Coord=0.5,0.0,0.0;}`;

    const result = format(input);
    expect(result).toContain("// RailSim2 plugin");
    expect(result).toContain("PluginHeader {\n");
    // PluginType(10), PluginName(10), PluginAuthor(12), RailSimVersion(14) → align to 14
    expect(result).toContain("\tPluginType     = Train;\n");
    expect(result).toContain("\tPluginName     = \"Test Train\";\n");
    expect(result).toContain("\tRailSimVersion = 2;\n");
    expect(result).toContain('\tObject3D "headlight" {\n');
    expect(result).toContain("\t} Else {\n");
    expect(result).toContain("\tCase 0:\n\t\tCoord = 0.0, 0.0, 0.0;\n");
    expect(result).toContain("\tDefault:\n\t\tCoord = 0.5, 0.0, 0.0;\n");
  });
});
