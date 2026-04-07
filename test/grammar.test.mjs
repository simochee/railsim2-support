import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createOnigScanner, createOnigString, loadWASM } from "vscode-oniguruma";
import { Registry, parseRawGrammar } from "vscode-textmate";

const ROOT = resolve(import.meta.dirname, "..");
const GRAMMAR_PATH = join(ROOT, "syntaxes/railsim2.tmLanguage.json");

/** @type {import('vscode-textmate').IGrammar} */
let grammar;

beforeAll(async () => {
  const wasmBin = readFileSync(
    join(ROOT, "node_modules/vscode-oniguruma/release/onig.wasm")
  );
  await loadWASM(wasmBin.buffer);

  const registry = new Registry({
    onigLib: Promise.resolve({ createOnigScanner, createOnigString }),
    async loadGrammar() {
      const content = readFileSync(GRAMMAR_PATH, "utf-8");
      return parseRawGrammar(content, GRAMMAR_PATH);
    },
  });

  grammar = await registry.loadGrammar("source.rs2");
});

/**
 * Tokenize a single line and return tokens with their scopes.
 * @param {string} line
 * @param {import('vscode-textmate').StateStack} [prevState]
 */
function tokenizeLine(line, prevState = undefined) {
  const result = grammar.tokenizeLine(line, prevState);
  return result.tokens.map((t) => ({
    text: line.substring(t.startIndex, t.endIndex),
    scopes: t.scopes,
  }));
}

/**
 * Assert that a token matching the given text includes a scope containing `scopeFragment`.
 */
function expectScope(tokens, text, scopeFragment) {
  const token = tokens.find((t) => t.text === text);
  expect(token, `Token "${text}" not found`).toBeDefined();
  const hasScope = token.scopes.some((s) => s.includes(scopeFragment));
  expect(
    hasScope,
    `Token "${text}" should have scope containing "${scopeFragment}", got: ${token.scopes.join(", ")}`
  ).toBe(true);
}

// ─── Comments ──────────────────────────────────────────────

describe("comments", () => {
  it("should tokenize line comments", () => {
    const tokens = tokenizeLine("// this is a comment");
    expectScope(tokens, "// this is a comment", "comment.line.double-slash");
  });

  it("should tokenize block comments", () => {
    const result1 = grammar.tokenizeLine("/* block", undefined);
    const tokens1 = result1.tokens.map((t) => ({
      text: "/* block".substring(t.startIndex, t.endIndex),
      scopes: t.scopes,
    }));
    expectScope(tokens1, "/*", "comment.block");
    expectScope(tokens1, " block", "comment.block");

    const result2 = grammar.tokenizeLine("comment */", result1.ruleStack);
    const tokens2 = result2.tokens.map((t) => ({
      text: "comment */".substring(t.startIndex, t.endIndex),
      scopes: t.scopes,
    }));
    expectScope(tokens2, "comment ", "comment.block");
  });

  it("should tokenize inline block comments", () => {
    const tokens = tokenizeLine("/* inline */");
    expectScope(tokens, "/*", "comment.block");
    expectScope(tokens, " inline ", "comment.block");
  });
});

// ─── Object names ──────────────────────────────────────────

describe("object names", () => {
  const objectNames = [
    "Axle",
    "Body",
    "PluginHeader",
    "Object3D",
    "Joint3D",
    "Platform",
    "RailInfo",
    "TieInfo",
    "GirderInfo",
    "PierInfo",
    "LineInfo",
    "PoleInfo",
    "StationInfo",
    "StructInfo",
    "SurfaceInfo",
    "EnvInfo",
    "DefineAnimation",
    "DefineSwitch",
    // Newly added
    "TrainInfo",
    "FrontCabin",
    "TailCabin",
  ];

  for (const name of objectNames) {
    it(`should tokenize "${name}" as storage.type`, () => {
      const tokens = tokenizeLine(`${name} {`);
      expectScope(tokens, name, "storage.type.object-name");
    });
  }

  const controlNames = ["ApplySwitch", "If", "Else"];

  for (const name of controlNames) {
    it(`should tokenize "${name}" as keyword.control`, () => {
      const tokens = tokenizeLine(`${name} {`);
      expectScope(tokens, name, "keyword.control.object-name");
    });
  }
});

// ─── Properties ────────────────────────────────────────────

describe("properties", () => {
  const properties = [
    "ModelFileName",
    "TexFileName",
    "Coord",
    "Offset",
    "Diffuse",
    "Ambient",
    // Newly added
    "FrontLimit",
    "TailLimit",
    "MaxVelocity",
    "MaxAcceleration",
    "MaxDeceleration",
    "TiltSpeed",
    "DoorClosingTime",
    "ConnectRail",
    "BranchRail",
    "DisconnectRail",
    "ParentObject",
    "Gravity",
  ];

  for (const prop of properties) {
    it(`should tokenize "${prop}" as variable.parameter.property`, () => {
      // Properties are recognized inside object blocks.
      // We simulate being inside a block by tokenizing the object opener first.
      const r1 = grammar.tokenizeLine("Body {", undefined);
      const tokens = tokenizeLine(`  ${prop} = 1;`, r1.ruleStack);
      expectScope(tokens, prop, "variable.parameter.property");
    });
  }
});

// ─── Constants ─────────────────────────────────────────────

describe("constants", () => {
  const constants = [
    "DayAlpha",
    "NightAlpha",
    "Hour",
    "Minute",
    "Second",
    "Alpha",
    "Add",
    "Up",
    "Down",
    "Rail",
    "Tie",
    "Girder",
    "Pier",
    "Train",
  ];

  for (const c of constants) {
    it(`should tokenize "${c}" as support.constant`, () => {
      const r1 = grammar.tokenizeLine("Body {", undefined);
      const r2 = grammar.tokenizeLine(`  Coord = ${c};`, r1.ruleStack);
      const tokens = r2.tokens.map((t) => ({
        text: `  Coord = ${c};`.substring(t.startIndex, t.endIndex),
        scopes: t.scopes,
      }));
      expectScope(tokens, c, "support.constant");
    });
  }
});

// ─── Boolean yes/no ────────────────────────────────────────

describe("boolean yes/no", () => {
  for (const val of ["yes", "no"]) {
    it(`should tokenize "${val}" as constant.language.boolean`, () => {
      const r1 = grammar.tokenizeLine("Body {", undefined);
      const r2 = grammar.tokenizeLine(`  CastShadow = ${val};`, r1.ruleStack);
      const tokens = r2.tokens.map((t) => ({
        text: `  CastShadow = ${val};`.substring(t.startIndex, t.endIndex),
        scopes: t.scopes,
      }));
      expectScope(tokens, val, "constant.language.boolean");
    });
  }
});

// ─── Literals ──────────────────────────────────────────────

describe("literals", () => {
  it("should tokenize integers", () => {
    const r1 = grammar.tokenizeLine("Body {", undefined);
    const tokens = tokenizeLine("  Coord = 42;", r1.ruleStack);
    expectScope(tokens, "42", "constant.numeric.decimal");
  });

  it("should tokenize decimals", () => {
    const r1 = grammar.tokenizeLine("Body {", undefined);
    const tokens = tokenizeLine("  Coord = 3.14;", r1.ruleStack);
    expectScope(tokens, "3.14", "constant.numeric.decimal");
  });

  it("should tokenize negative sign", () => {
    const r1 = grammar.tokenizeLine("Body {", undefined);
    const tokens = tokenizeLine("  Coord = -5;", r1.ruleStack);
    expectScope(tokens, "-", "constant.numeric.signature");
  });

  it("should tokenize strings", () => {
    const r1 = grammar.tokenizeLine("Body {", undefined);
    const tokens = tokenizeLine('  ModelFileName = "test.x";', r1.ruleStack);
    expectScope(tokens, '"', "string.quoted.double");
  });

  it("should tokenize colors", () => {
    const r1 = grammar.tokenizeLine("Body {", undefined);
    const tokens = tokenizeLine("  Diffuse = #FF00FF80;", r1.ruleStack);
    expectScope(tokens, "#FF00FF80", "constant.other.color");
  });
});

// ─── Operators ─────────────────────────────────────────────

describe("operators", () => {
  const operators = [
    { op: "+", label: "plus" },
    { op: "-", label: "minus" },
    { op: "*", label: "multiply" },
    { op: "/", label: "divide" },
    { op: "%", label: "modulo" },
    { op: "!", label: "not" },
    { op: "~", label: "bitwise not" },
    { op: "<<", label: "left shift" },
    { op: ">>", label: "right shift" },
    { op: "<", label: "less than" },
    { op: ">", label: "greater than" },
    { op: "<=", label: "less equal" },
    { op: ">=", label: "greater equal" },
    { op: "==", label: "equal" },
    { op: "!=", label: "not equal" },
    { op: "&", label: "bitwise and" },
    { op: "^", label: "bitwise xor" },
    { op: "|", label: "bitwise or" },
    { op: "&&", label: "logical and" },
    { op: "||", label: "logical or" },
  ];

  for (const { op, label } of operators) {
    it(`should tokenize "${op}" (${label}) as keyword.operator`, () => {
      // Expression context: inside an object argument area before {
      const tokens = tokenizeLine(`Body 1${op}2 {`);
      const opToken = tokens.find((t) => t.text === op);
      expect(opToken, `Operator "${op}" not found in tokens`).toBeDefined();
      const hasScope = opToken.scopes.some((s) => s.includes("keyword.operator"));
      expect(
        hasScope,
        `Operator "${op}" should have keyword.operator scope, got: ${opToken.scopes.join(", ")}`
      ).toBe(true);
    });
  }
});

// ─── Switch / Case ─────────────────────────────────────────

describe("switch/case", () => {
  it("should tokenize Case as keyword.control.switch", () => {
    const r1 = grammar.tokenizeLine("ApplySwitch {", undefined);
    const tokens = tokenizeLine("  Case 1:", r1.ruleStack);
    expectScope(tokens, "Case", "keyword.control.switch");
  });

  it("should tokenize Default as keyword.control.switch", () => {
    const r1 = grammar.tokenizeLine("ApplySwitch {", undefined);
    const tokens = tokenizeLine("  Default:", r1.ruleStack);
    expectScope(tokens, "Default", "keyword.control.switch");
  });
});
