import { describe, it, expect, vi } from "vitest";

// Mock vscode-languageserver to avoid connection errors on import
vi.mock("vscode-languageserver", () => ({
  createConnection: () => ({
    onInitialize: vi.fn(),
    onCompletion: vi.fn(),
    onHover: vi.fn(),
    onDocumentFormatting: vi.fn(),
    sendDiagnostics: vi.fn(),
    listen: vi.fn(),
  }),
  ProposedFeatures: { all: [] },
  TextDocuments: class {
    onDidChangeContent = vi.fn();
    onDidClose = vi.fn();
    listen = vi.fn();
  },
  TextDocumentSyncKind: { Full: 1 },
  DiagnosticSeverity: { Error: 1, Warning: 2, Information: 3, Hint: 4 },
  CompletionItemKind: {
    Text: 1,
    Method: 2,
    Function: 3,
    Constructor: 4,
    Field: 5,
    Variable: 6,
    Class: 7,
    Interface: 8,
    Module: 9,
    Property: 10,
    Unit: 11,
    Value: 12,
    Enum: 13,
    Keyword: 14,
    Snippet: 15,
    Color: 16,
    File: 17,
    Reference: 18,
    Folder: 19,
    EnumMember: 20,
    Constant: 21,
    Struct: 22,
    Event: 23,
    Operator: 24,
    TypeParameter: 25,
  },
  InsertTextFormat: { PlainText: 1, Snippet: 2 },
}));

vi.mock("vscode-languageserver-textdocument", () => ({
  TextDocument: {},
}));

import { parse } from "../src/server/parser.js";
import { getCompletions } from "../src/server/completionProvider.js";
import { tokenize } from "../src/server/tokenizer.js";
import { validateTextDocument, toLspRange, toLspSeverity } from "../src/server/server.js";

// ---------------------------------------------------------------------------
// Suite 1: Parser integration — Realistic RailSim2 snippets
// ---------------------------------------------------------------------------

describe("parser integration", () => {
  it("should parse a complete valid Rail2.txt with no diagnostics", () => {
    const input = `
PluginHeader {
  RailSimVersion = 2.14;
  PluginType = Rail;
  PluginName = "Standard Rail";
  PluginAuthor = "Author";
}
RailInfo {
  Gauge = 1.067;
  Height = 0.172;
  SurfaceAlt = 0.0;
  CantRatio = 10.0;
  MaxCant = 6.0;
  FlattenCant = no;
}
SoundInfo {
  WheelSoundFile = "sound.wav";
  JointInterval = 25.0;
}`;
    const { diagnostics } = parse(input);
    expect(diagnostics).toHaveLength(0);
  });

  it("should parse a file with comments and no errors", () => {
    const input = `
// This is a Rail2.txt file
/* Multi-line
   comment block */
PluginHeader {
  // Plugin metadata
  PluginType = Rail;
  PluginName = "Test"; /* inline comment */
}
Body {
  // Body definition
  Coord = 0.0, 0.0, 0.0;
}`;
    const { file, diagnostics } = parse(input);
    expect(diagnostics).toHaveLength(0);
    const comments = file.body.filter((n) => n.type === "comment");
    expect(comments.length).toBeGreaterThanOrEqual(1);
    const objects = file.body.filter((n) => n.type === "object");
    expect(objects).toHaveLength(2);
  });

  it("should parse a file with DefineSwitch and ApplySwitch", () => {
    const input = `
DefineSwitch "_FRONT" {
  SwitchType = Multi;
  Count = 2;
}
Body {
  ModelFileName = "body.x";
  ApplySwitch "_FRONT" {
    Case 0:
      Coord = 0.0, 0.0, 0.0;
    Case 1:
      Coord = 1.0, 0.0, 0.0;
    Default:
      Coord = 0.5, 0.0, 0.0;
  }
}`;
    const { file, diagnostics } = parse(input);
    expect(diagnostics).toHaveLength(0);
    const nonComments = file.body.filter((n) => n.type !== "comment");
    expect(nonComments).toHaveLength(2);
    // DefineSwitch is parsed as an object
    expect(nonComments[0].type).toBe("object");
    // Body contains an ApplySwitch
    const body = nonComments[1];
    expect(body.type).toBe("object");
    if (body.type === "object") {
      const applySwitch = body.body.find((n) => n.type === "applySwitch");
      expect(applySwitch).toBeDefined();
      if (applySwitch && applySwitch.type === "applySwitch") {
        expect(applySwitch.cases).toHaveLength(2);
        expect(applySwitch.default_).toBeDefined();
      }
    }
  });

  it("should parse a file with If/Else", () => {
    const input = `
Body {
  ModelFileName = "body.x";
  If 1 {
    Transparent = yes;
    Material {
      Diffuse = 1.0, 1.0, 1.0, 0.5;
    }
  } Else {
    Transparent = no;
    Material {
      Diffuse = 1.0, 1.0, 1.0, 1.0;
    }
  }
}`;
    const { file, diagnostics } = parse(input);
    expect(diagnostics).toHaveLength(0);
    const body = file.body.filter((n) => n.type === "object");
    expect(body).toHaveLength(1);
    if (body[0].type === "object") {
      const ifNode = body[0].body.find((n) => n.type === "if");
      expect(ifNode).toBeDefined();
      if (ifNode && ifNode.type === "if") {
        expect(ifNode.then.length).toBeGreaterThan(0);
        expect(ifNode.else_).toBeDefined();
        expect(ifNode.else_!.length).toBeGreaterThan(0);
      }
    }
  });

  it("should report errors for malformed input", () => {
    const input = `
PluginHeader {
  PluginType = ;
  = "broken";
  PluginName = "OK";
}`;
    const { file, diagnostics } = parse(input);
    expect(file.type).toBe("file");
    expect(diagnostics.length).toBeGreaterThan(0);
    // Should still recover and parse PluginName
    if (file.body.length > 0) {
      const header = file.body.find((n) => n.type === "object");
      expect(header).toBeDefined();
    }
  });

  it("should parse a Train2.txt structure", () => {
    const input = `
PluginHeader {
  RailSimVersion = 2;
  PluginType = Train;
  PluginName = "Test Train";
  PluginAuthor = "Author";
}
TrainInfo {
  Length = 20.0;
  MotorType = EMU;
  MaxSpeed = 120;
}
Body {
  ModelFileName = "carbody.x";
  ModelScale = 1.0;
  Coord = 0.0, 0.0, 0.0;
  Object3D "headlight" {
    ModelFileName = "light.x";
    Coord = 0.0, 3.2, 10.0;
  }
  Material {
    Diffuse = 1.0, 1.0, 1.0, 1.0;
    Ambient = 0.5, 0.5, 0.5;
    TexFileName = "body_tex.bmp";
  }
}
Axle {
  Coord = 0.0, 0.43, 6.75;
  WheelDiameter = 0.86;
}
SoundInfo {
  MotorSoundFile = "motor.wav";
  HornSoundFile = "horn.wav";
}`;
    const { file, diagnostics } = parse(input);
    expect(diagnostics).toHaveLength(0);
    const nonComments = file.body.filter((n) => n.type !== "comment");
    expect(nonComments).toHaveLength(5); // PluginHeader, TrainInfo, Body, Axle, SoundInfo
  });
});

// ---------------------------------------------------------------------------
// Suite 2: Full validation pipeline
// ---------------------------------------------------------------------------

describe("validation pipeline", () => {
  it("should return no diagnostics for valid input", () => {
    const input = `
PluginHeader {
  RailSimVersion = 2.00;
  PluginType = Train;
  PluginName = "Test";
  PluginAuthor = "Author";
  Description = "desc";
}
TrainInfo {
  FrontLimit = 10.0;
  TailLimit = -10.0;
  MaxVelocity = 100.0;
  MaxAcceleration = 2.0;
  MaxDeceleration = 3.0;
}`;
    const diagnostics = validateTextDocument(input);
    expect(diagnostics).toHaveLength(0);
  });

  it("should return parse errors for syntax issues", () => {
    const input = `
Body {
  Coord = ;
}`;
    const diagnostics = validateTextDocument(input);
    const errors = diagnostics.filter((d) => d.severity === "error");
    expect(errors.length).toBeGreaterThan(0);
  });

  it("should return warnings for unknown object names", () => {
    const input = `
CompletelyFakeObject {
  Coord = 1.0;
}`;
    const diagnostics = validateTextDocument(input);
    const warnings = diagnostics.filter((d) => d.severity === "warning");
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some((w) => w.message.includes("Unknown object name"))).toBe(true);
    expect(warnings.some((w) => w.message.includes("CompletelyFakeObject"))).toBe(true);
  });

  it("should return warnings for unknown property names", () => {
    const input = `
Body {
  CompletelyFakeProperty = 1.0;
}`;
    const diagnostics = validateTextDocument(input);
    const warnings = diagnostics.filter((d) => d.severity === "warning");
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some((w) => w.message.includes("Unknown property name"))).toBe(true);
    expect(warnings.some((w) => w.message.includes("CompletelyFakeProperty"))).toBe(true);
  });

  it("should combine parse errors and keyword warnings", () => {
    const input = `
FakeObject {
  Coord = ;
  FakeProp = 1.0;
}`;
    const diagnostics = validateTextDocument(input);
    const errors = diagnostics.filter((d) => d.severity === "error");
    const warnings = diagnostics.filter((d) => d.severity === "warning");
    expect(errors.length).toBeGreaterThan(0);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("should handle empty input", () => {
    const diagnostics = validateTextDocument("");
    expect(diagnostics).toHaveLength(0);
  });

  it("should handle input with only comments", () => {
    const input = `
// This is a comment
/* This is a
   multi-line comment */
// Another comment`;
    const diagnostics = validateTextDocument(input);
    expect(diagnostics).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Suite 3: Schema validation integration
// ---------------------------------------------------------------------------

describe("schema validation integration", () => {
  it("should return type mismatch errors with fileName", () => {
    const input = `
PluginHeader {
  RailSimVersion = 2.00;
  PluginType = Rail;
  PluginName = "Test";
  PluginAuthor = "Author";
}
RailInfo {
  Gauge = "not a number";
}
SoundInfo {}`;
    const diagnostics = validateTextDocument(input, "Rail2.txt");
    expect(
      diagnostics.some((d) => d.message.includes("Type mismatch") && d.message.includes("Gauge")),
    ).toBe(true);
  });

  it("should return required property warnings", () => {
    const input = `
RailInfo {
}`;
    const diagnostics = validateTextDocument(input);
    expect(
      diagnostics.some(
        (d) => d.message.includes("Required property 'Gauge'") && d.severity === "warning",
      ),
    ).toBe(true);
  });

  it("should return root validation errors with fileName", () => {
    const input = `
PluginHeader {
  RailSimVersion = 2.00;
  PluginType = Rail;
  PluginName = "Test";
  PluginAuthor = "Author";
}
RailInfo { Gauge = 1.0; }
SoundInfo {}
TrainInfo { Gauge = 1.0; }`;
    const diagnostics = validateTextDocument(input, "Rail2.txt");
    expect(
      diagnostics.some(
        (d) => d.message.includes("not allowed as root object") && d.message.includes("TrainInfo"),
      ),
    ).toBe(true);
  });

  it("should skip root validation without fileName (backward compat)", () => {
    const input = `
RailInfo { Gauge = 1.0; }
TrainInfo { Gauge = 1.0; }`;
    const diagnostics = validateTextDocument(input);
    const rootErrors = diagnostics.filter((d) => d.message.includes("root object"));
    expect(rootErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Suite 4: LSP conversion functions
// ---------------------------------------------------------------------------

describe("LSP conversion", () => {
  it("should convert range correctly", () => {
    const range = { start: { line: 1, character: 5 }, end: { line: 1, character: 10 } };
    const lsp = toLspRange(range);
    expect(lsp.start.line).toBe(1);
    expect(lsp.start.character).toBe(5);
    expect(lsp.end.line).toBe(1);
    expect(lsp.end.character).toBe(10);
  });

  it("should convert error severity", () => {
    expect(toLspSeverity("error")).toBe(1); // DiagnosticSeverity.Error
  });

  it("should convert warning severity", () => {
    expect(toLspSeverity("warning")).toBe(2); // DiagnosticSeverity.Warning
  });

  it("should convert info severity", () => {
    expect(toLspSeverity("info")).toBe(3); // DiagnosticSeverity.Information
  });

  it("should default to error for unknown severity", () => {
    expect(toLspSeverity("bogus")).toBe(1); // DiagnosticSeverity.Error
  });
});

// ---------------------------------------------------------------------------
// Suite 5: Switch validation integration
// ---------------------------------------------------------------------------

describe("switch validation integration", () => {
  it("should warn on undefined switch reference", () => {
    const diags = validateTextDocument(`
Body {
  If "存在しない" == 0 { }
}
    `);
    expect(diags.some(d => d.message.includes("存在しない") && d.severity === "warning")).toBe(true);
  });

  it("should not warn on defined switch reference", () => {
    const diags = validateTextDocument(`
DefineSwitch "ライト" {
  Entry = "点灯";
}
Body {
  If "ライト" == 0 { }
}
    `);
    expect(diags.some(d => d.message.includes("ライト") && d.severity === "warning")).toBe(false);
  });

  it("should not warn on system switch reference", () => {
    const diags = validateTextDocument(`
Body {
  If "_FRONT" == 1 { }
  ApplySwitch "_NIGHT" {
    Case 0:
    Default:
  }
}
    `);
    expect(diags.some(d => d.message.includes("_FRONT"))).toBe(false);
    expect(diags.some(d => d.message.includes("_NIGHT"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 6: Completion integration
// ---------------------------------------------------------------------------

describe("integration: completion", () => {
  it("Rail2.txt フルパイプライン: parse → findContext → getCompletions", () => {
    const src = `PluginHeader {
  RailSimVersion = 2.00;
  PluginType = Rail;
  PluginName = "test";
  PluginAuthor = "author";
  Description = "desc";
}
RailInfo {
  Gauge = 1.067;

}`;
    const { file } = parse(src);
    const tokens = tokenize(src);
    const items = getCompletions(file, tokens, { line: 9, character: 2 }, "Rail2.txt");
    const itemLabels = items.map((i) => i.label);
    // Gauge は既出なので除外
    expect(itemLabels).not.toContain("Gauge");
    // 他のプロパティは表示
    expect(itemLabels).toContain("Height");
    expect(itemLabels).toContain("SurfaceAlt");
  });
});
