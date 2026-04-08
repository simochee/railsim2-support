import { describe, it, expect } from "vitest";
import {
  findContext,
  getCompletions,
} from "../src/server/completionProvider.js";
import { parse } from "../src/server/parser.js";
import { tokenize } from "../src/server/tokenizer.js";
import type { Position } from "../src/shared/tokens.js";
import { CompletionItemKind, InsertTextFormat } from "vscode-languageserver/node";

// Helper: parse source and return what findContext/getCompletions need
function setup(source: string) {
  const tokens = tokenize(source);
  const { file } = parse(source);
  return { file, tokens };
}

// Helper: position from 0-based line/char
function pos(line: number, character: number): Position {
  return { line, character };
}

// =========================================================================
// findContext
// =========================================================================

describe("findContext", () => {
  it("empty file + Rail2.txt → root", () => {
    const { file, tokens } = setup("");
    const ctx = findContext(file, tokens, pos(0, 0), "Rail2.txt");
    expect(ctx.type).toBe("root");
    if (ctx.type === "root") {
      expect(ctx.fileName).toBe("Rail2.txt");
    }
  });

  it("inside RailInfo { } → objectBody with schemaKey RailInfo", () => {
    const src = "RailInfo {\n  \n}";
    const { file, tokens } = setup(src);
    const ctx = findContext(file, tokens, pos(1, 2), "Rail2.txt");
    expect(ctx.type).toBe("objectBody");
    if (ctx.type === "objectBody") {
      expect(ctx.objectName).toBe("RailInfo");
      expect(ctx.schemaKey).toBe("RailInfo");
    }
  });

  it("nested: Face inside Profile → schemaKey Face", () => {
    const src = "Profile {\n  Face {\n    \n  }\n}";
    const { file, tokens } = setup(src);
    const ctx = findContext(file, tokens, pos(2, 4), "Rail2.txt");
    expect(ctx.type).toBe("objectBody");
    if (ctx.type === "objectBody") {
      expect(ctx.objectName).toBe("Face");
      expect(ctx.schemaKey).toBe("Face");
    }
  });

  it("Vertex inside Face (Profile context) → schemaKey Vertex:Profile", () => {
    const src = "Profile {\n  Face {\n    Vertex {\n      \n    }\n  }\n}";
    const { file, tokens } = setup(src);
    const ctx = findContext(file, tokens, pos(3, 6), "Rail2.txt");
    expect(ctx.type).toBe("objectBody");
    if (ctx.type === "objectBody") {
      expect(ctx.objectName).toBe("Vertex");
      expect(ctx.schemaKey).toBe("Vertex:Profile");
    }
  });

  it("inside line comment → none", () => {
    const src = "RailInfo {\n  // some comment\n}";
    const { file, tokens } = setup(src);
    // Position inside the comment text
    const ctx = findContext(file, tokens, pos(1, 10), "Rail2.txt");
    expect(ctx.type).toBe("none");
  });

  it("inside block comment → none", () => {
    const src = "RailInfo {\n  /* block\n  comment */\n}";
    const { file, tokens } = setup(src);
    const ctx = findContext(file, tokens, pos(1, 8), "Rail2.txt");
    expect(ctx.type).toBe("none");
  });

  it("inside string literal → none", () => {
    const src = 'RailInfo {\n  ModelFileName = "test.x";\n}';
    const { file, tokens } = setup(src);
    // Inside the string "test.x"
    const ctx = findContext(file, tokens, pos(1, 20), "Rail2.txt");
    expect(ctx.type).toBe("none");
  });

  it("after = before ; (property value) → none", () => {
    const src = "RailInfo {\n  Gauge = \n}";
    const { file, tokens } = setup(src);
    const ctx = findContext(file, tokens, pos(1, 12), "Rail2.txt");
    expect(ctx.type).toBe("none");
  });

  it("after ; back to normal context → objectBody", () => {
    const src = "RailInfo {\n  Gauge = 1.0;\n  \n}";
    const { file, tokens } = setup(src);
    const ctx = findContext(file, tokens, pos(2, 2), "Rail2.txt");
    expect(ctx.type).toBe("objectBody");
  });

  it("unclosed object → objectBody (parser recovery)", () => {
    const src = "RailInfo {\n  Gauge = 1.0;\n  ";
    const { file, tokens } = setup(src);
    const ctx = findContext(file, tokens, pos(2, 2), "Rail2.txt");
    expect(ctx.type).toBe("objectBody");
    if (ctx.type === "objectBody") {
      expect(ctx.objectName).toBe("RailInfo");
    }
  });

  it("inside If block within object → objectBody of enclosing object", () => {
    const src =
      'RailInfo {\n  If (1) {\n    \n  }\n}';
    const { file, tokens } = setup(src);
    // Inside the If block body — should still resolve to RailInfo objectBody
    // because If doesn't change the context
    // The cursor at line 2 col 4 is inside If's then branch
    // But there's no ObjectNode there, so it should fall through to RailInfo
    const ctx = findContext(file, tokens, pos(2, 4), "Rail2.txt");
    // Since If is inside RailInfo body and doesn't contain an ObjectNode at cursor,
    // the innermost object is still RailInfo
    expect(ctx.type).toBe("objectBody");
    if (ctx.type === "objectBody") {
      expect(ctx.objectName).toBe("RailInfo");
    }
  });

  it("コメント開始位置 → none", () => {
    const src = "RailInfo {\n  // comment\n}";
    const { file, tokens } = setup(src);
    // cursor at the start of // (character 2)
    const result = findContext(file, tokens, pos(1, 2));
    expect(result.type).toBe("none");
  });

  it("outside any object → root", () => {
    const src = "RailInfo {\n}\n";
    const { file, tokens } = setup(src);
    const ctx = findContext(file, tokens, pos(2, 0), "Rail2.txt");
    expect(ctx.type).toBe("root");
  });

  it("オブジェクト名の上 → root (ヘッダ領域は body ではない)", () => {
    const src = "RailInfo {\n  \n}";
    const { file, tokens } = setup(src);
    // cursor on "RailInfo" name (line 0, char 4)
    const ctx = findContext(file, tokens, pos(0, 4), "Rail2.txt");
    expect(ctx.type).toBe("root");
  });

  it("nameParameter 引数の上 → root (ヘッダ領域)", () => {
    const src = 'DefineSwitch foo {\n  \n}';
    const { file, tokens } = setup(src);
    // cursor on "foo" (line 0, char 14)
    const ctx = findContext(file, tokens, pos(0, 14));
    expect(ctx.type).not.toBe("objectBody");
  });

  it("'{' の上 → root (ヘッダ領域)", () => {
    const src = "RailInfo {\n  \n}";
    const { file, tokens } = setup(src);
    // cursor on '{' (line 0, char 9)
    const ctx = findContext(file, tokens, pos(0, 9), "Rail2.txt");
    expect(ctx.type).toBe("root");
  });

  it("ネストした子オブジェクトのヘッダ → 親の objectBody", () => {
    const src = "TrainInfo {\n  Body {\n    \n  }\n}";
    const { file, tokens } = setup(src);
    // cursor on "Body" name (line 1, char 3)
    const ctx = findContext(file, tokens, pos(1, 3));
    // Should be TrainInfo's objectBody, not Body's
    expect(ctx.type).toBe("objectBody");
    if (ctx.type === "objectBody") {
      expect(ctx.schemaKey).toBe("TrainInfo");
    }
  });

  it("ネストした子オブジェクトの '{' 上 → 親の objectBody", () => {
    const src = "TrainInfo {\n  Body {\n    \n  }\n}";
    const { file, tokens } = setup(src);
    // cursor on Body's '{' (line 1, char 7)
    const ctx = findContext(file, tokens, pos(1, 7));
    expect(ctx.type).toBe("objectBody");
    if (ctx.type === "objectBody") {
      expect(ctx.schemaKey).toBe("TrainInfo");
    }
  });
});

// =========================================================================
// getCompletions
// =========================================================================

describe("getCompletions", () => {
  it("Rail2.txt top level → PluginHeader, RailInfo, etc.", () => {
    const { file, tokens } = setup("");
    const items = getCompletions(file, tokens, pos(0, 0), "Rail2.txt");
    const labels = items.map((i) => i.label);
    expect(labels).toContain("PluginHeader");
    expect(labels).toContain("RailInfo");
    expect(labels).toContain("SoundInfo");
    expect(labels).toContain("Profile");
    expect(labels).toContain("Wireframe");
    expect(labels).toContain("Interval");
  });

  it("Rail2.txt with existing PluginHeader → PluginHeader excluded", () => {
    const src = "PluginHeader {\n}\n";
    const { file, tokens } = setup(src);
    const items = getCompletions(file, tokens, pos(2, 0), "Rail2.txt");
    const labels = items.map((i) => i.label);
    expect(labels).not.toContain("PluginHeader");
    // Profile is multiple: true, should still appear
    expect(labels).toContain("Profile");
  });

  it("unknown file → empty", () => {
    const { file, tokens } = setup("");
    const items = getCompletions(file, tokens, pos(0, 0), "Unknown.txt");
    expect(items).toHaveLength(0);
  });

  it("no fileName → empty", () => {
    const { file, tokens } = setup("");
    const items = getCompletions(file, tokens, pos(0, 0));
    expect(items).toHaveLength(0);
  });

  it("RailInfo body → properties and children", () => {
    const src = "RailInfo {\n  \n}";
    const { file, tokens } = setup(src);
    const items = getCompletions(file, tokens, pos(1, 2), "Rail2.txt");
    const labels = items.map((i) => i.label);
    // Properties
    expect(labels).toContain("Gauge");
    expect(labels).toContain("TrackNum");
    expect(labels).toContain("ModelFileName");
    // Children
    expect(labels).toContain("DefineSwitch");
    expect(labels).toContain("DefineAnimation");
  });

  it("existing Gauge in RailInfo → excluded", () => {
    const src = "RailInfo {\n  Gauge = 1.067;\n  \n}";
    const { file, tokens } = setup(src);
    const items = getCompletions(file, tokens, pos(2, 2), "Rail2.txt");
    const labels = items.map((i) => i.label);
    expect(labels).not.toContain("Gauge");
    // TrackNum should still be available
    expect(labels).toContain("TrackNum");
  });

  it("TrainInfo body → Body, Sound, DefineSwitch children", () => {
    const src = "TrainInfo {\n  \n}";
    const { file, tokens } = setup(src);
    const items = getCompletions(file, tokens, pos(1, 2), "Train2.txt");
    const labels = items.map((i) => i.label);
    expect(labels).toContain("Body");
    expect(labels).toContain("Sound");
    expect(labels).toContain("DefineSwitch");
    expect(labels).toContain("DefineAnimation");
  });

  it("Body inside TrainInfo with existing FrontCabin → FrontCabin excluded", () => {
    const src =
      "TrainInfo {\n  Body {\n    ModelFileName = \"test.x\";\n    FrontCabin {\n    }\n    \n  }\n}";
    const { file, tokens } = setup(src);
    // Inside Body, after existing FrontCabin
    const items = getCompletions(file, tokens, pos(5, 4), "Train2.txt");
    const labels = items.map((i) => i.label);
    expect(labels).not.toContain("FrontCabin");
    // Headlight is multiple: true
    expect(labels).toContain("Headlight");
  });

  // Snippet format tests
  it("float property → = ${1:0};", () => {
    const src = "RailInfo {\n  \n}";
    const { file, tokens } = setup(src);
    const items = getCompletions(file, tokens, pos(1, 2), "Rail2.txt");
    const gauge = items.find((i) => i.label === "Gauge");
    expect(gauge).toBeDefined();
    expect(gauge!.insertText).toBe("Gauge = ${1:0};");
    expect(gauge!.insertTextFormat).toBe(InsertTextFormat.Snippet);
  });

  it("filename property → = \"${1}\";", () => {
    const src = "RailInfo {\n  \n}";
    const { file, tokens } = setup(src);
    const items = getCompletions(file, tokens, pos(1, 2), "Rail2.txt");
    const mfn = items.find((i) => i.label === "ModelFileName");
    expect(mfn).toBeDefined();
    expect(mfn!.insertText).toBe('ModelFileName = "${1}";');
  });

  it("yes-no property → = ${1|yes,no|};", () => {
    const src = "RailInfo {\n  \n}";
    const { file, tokens } = setup(src);
    const items = getCompletions(file, tokens, pos(1, 2), "Rail2.txt");
    const ec = items.find((i) => i.label === "EnableCant");
    expect(ec).toBeDefined();
    expect(ec!.insertText).toBe("EnableCant = ${1|yes,no|};");
  });

  it("vector-3d property → 3 placeholders", () => {
    const src = "TrainInfo {\n  Body {\n    ModelFileName = \"t.x\";\n    Headlight {\n      \n    }\n  }\n}";
    const { file, tokens } = setup(src);
    const items = getCompletions(file, tokens, pos(4, 6), "Train2.txt");
    const coord = items.find((i) => i.label === "Coord");
    expect(coord).toBeDefined();
    expect(coord!.insertText).toBe("Coord = ${1:0}, ${2:0}, ${3:0};");
  });

  it("vector-2d property → 2 placeholders", () => {
    const src = "Profile {\n  Face {\n    Vertex {\n      \n    }\n  }\n}";
    const { file, tokens } = setup(src);
    const items = getCompletions(file, tokens, pos(3, 6), "Rail2.txt");
    const coord = items.find((i) => i.label === "Coord");
    expect(coord).toBeDefined();
    expect(coord!.insertText).toBe("Coord = ${1:0}, ${2:0};");
  });

  it("enum property → choice snippet", () => {
    const src = "PluginHeader {\n  \n}";
    const { file, tokens } = setup(src);
    const items = getCompletions(file, tokens, pos(1, 2));
    const pt = items.find((i) => i.label === "PluginType");
    expect(pt).toBeDefined();
    expect(pt!.insertText).toContain("${1|Rail,");
  });

  it("identifier property → = ${1:name};", () => {
    const src = "RailInfo {\n  \n}";
    const { file, tokens } = setup(src);
    const items = getCompletions(file, tokens, pos(1, 2), "Rail2.txt");
    const cr = items.find((i) => i.label === "ConnectRail");
    expect(cr).toBeDefined();
    expect(cr!.insertText).toBe("ConnectRail = ${1:name};");
  });

  it("nameParameter object → snippet with name placeholder", () => {
    const src = "RailInfo {\n  \n}";
    const { file, tokens } = setup(src);
    const items = getCompletions(file, tokens, pos(1, 2), "Rail2.txt");
    const ds = items.find((i) => i.label === "DefineSwitch");
    expect(ds).toBeDefined();
    expect(ds!.insertText).toBe("DefineSwitch ${1:name} {\n\t$0\n}");
    expect(ds!.kind).toBe(CompletionItemKind.Class);
  });

  it("object without nameParameter → snippet without name", () => {
    const src = "Profile {\n  \n}";
    const { file, tokens } = setup(src);
    const items = getCompletions(file, tokens, pos(1, 2), "Rail2.txt");
    const face = items.find((i) => i.label === "Face");
    expect(face).toBeDefined();
    expect(face!.insertText).toBe("Face {\n\t$0\n}");
  });

  it("comment position → empty array", () => {
    const src = "RailInfo {\n  // comment\n}";
    const { file, tokens } = setup(src);
    const items = getCompletions(file, tokens, pos(1, 10), "Rail2.txt");
    expect(items).toHaveLength(0);
  });

  it("string position → empty array", () => {
    const src = 'RailInfo {\n  ModelFileName = "test.x";\n}';
    const { file, tokens } = setup(src);
    const items = getCompletions(file, tokens, pos(1, 22), "Rail2.txt");
    expect(items).toHaveLength(0);
  });

  it("property value position → empty array", () => {
    const src = "RailInfo {\n  Gauge = \n}";
    const { file, tokens } = setup(src);
    const items = getCompletions(file, tokens, pos(1, 12), "Rail2.txt");
    expect(items).toHaveLength(0);
  });

  it("all items have InsertTextFormat.Snippet", () => {
    const src = "RailInfo {\n  \n}";
    const { file, tokens } = setup(src);
    const items = getCompletions(file, tokens, pos(1, 2), "Rail2.txt");
    for (const item of items) {
      expect(item.insertTextFormat).toBe(InsertTextFormat.Snippet);
    }
  });

  it("property items have CompletionItemKind.Property", () => {
    const src = "RailInfo {\n  \n}";
    const { file, tokens } = setup(src);
    const items = getCompletions(file, tokens, pos(1, 2), "Rail2.txt");
    const gauge = items.find((i) => i.label === "Gauge");
    expect(gauge!.kind).toBe(CompletionItemKind.Property);
  });

  it("arity > 1 general case (e.g. IconRect arity 4)", () => {
    const src = "PluginHeader {\n  \n}";
    const { file, tokens } = setup(src);
    const items = getCompletions(file, tokens, pos(1, 2));
    const ir = items.find((i) => i.label === "IconRect");
    expect(ir).toBeDefined();
    expect(ir!.insertText).toBe("IconRect = ${1:0}, ${2:0}, ${3:0}, ${4:0};");
  });

  it("プロパティの detail に型情報が含まれる", () => {
    const src = "RailInfo {\n  \n}";
    const { file, tokens } = setup(src);
    const items = getCompletions(file, tokens, pos(1, 2), "Rail2.txt");
    const gauge = items.find((i) => i.label === "Gauge");
    expect(gauge?.detail).toBe("float (required)");
  });

  it("required 子オブジェクトの detail に (required) が含まれる", () => {
    const src = "TrainInfo {\n  Gauge = 1.0;\n  \n}";
    const { file, tokens } = setup(src);
    const items = getCompletions(file, tokens, pos(2, 2), "Train2.txt");
    const body = items.find((i) => i.label === "Body");
    expect(body?.detail).toBe("(required)");
  });

  it("optional プロパティの detail に (required) が含まれない", () => {
    const src = "RailInfo {\n  \n}";
    const { file, tokens } = setup(src);
    const items = getCompletions(file, tokens, pos(1, 2), "Rail2.txt");
    const trackNum = items.find((i) => i.label === "TrackNum");
    expect(trackNum?.detail).toBe("integer");
  });
});
