import { describe, it, expect } from "vitest";
import { walkNodes } from "../src/shared/astWalker.js";
import { parse } from "../src/server/parser.js";

describe("walkNodes", () => {
  it("visits all node types", () => {
    const src = [
      "PluginHeader { PluginType = Rail; }",
      'If "sw" == 0 { Body { Height = 1; } }',
      'ApplySwitch "test" { Case 0 { Body { Width = 2; } } Default { Body { Width = 3; } } }',
    ].join("\n");
    const { file } = parse(src);
    const visited: string[] = [];
    walkNodes(file.body, {
      object(node) {
        visited.push(`object:${node.name}`);
      },
      property(node) {
        visited.push(`property:${node.name}`);
      },
      if_() {
        visited.push("if");
      },
      applySwitch() {
        visited.push("applySwitch");
      },
      case_() {
        visited.push("case");
      },
    });
    expect(visited).toContain("object:PluginHeader");
    expect(visited).toContain("property:PluginType");
    expect(visited).toContain("if");
    expect(visited).toContain("object:Body");
    expect(visited).toContain("property:Height");
    expect(visited).toContain("applySwitch");
    expect(visited).toContain("case");
    expect(visited).toContain("property:Width");
  });

  it("visits nested objects in depth-first order", () => {
    const src = "Outer { Inner { Prop = 1; } }";
    const { file } = parse(src);
    const visited: string[] = [];
    walkNodes(file.body, {
      object(node) {
        visited.push(node.name);
      },
      property(node) {
        visited.push(node.name);
      },
    });
    expect(visited).toEqual(["Outer", "Inner", "Prop"]);
  });

  it("visits else branch", () => {
    const src = 'If "sw" == 0 { Body { A = 1; } } Else { Body { B = 2; } }';
    const { file } = parse(src);
    const props: string[] = [];
    walkNodes(file.body, {
      property(node) {
        props.push(node.name);
      },
    });
    expect(props).toContain("A");
    expect(props).toContain("B");
  });

  it("visits default branch of ApplySwitch", () => {
    const src = 'ApplySwitch "test" { Case 0 { Body { A = 1; } } Default { Body { B = 2; } } }';
    const { file } = parse(src);
    const props: string[] = [];
    walkNodes(file.body, {
      property(node) {
        props.push(node.name);
      },
    });
    expect(props).toContain("A");
    expect(props).toContain("B");
  });

  it("calls no callbacks for empty body", () => {
    const { file } = parse("");
    const visited: string[] = [];
    walkNodes(file.body, {
      object() {
        visited.push("object");
      },
      property() {
        visited.push("property");
      },
    });
    expect(visited).toEqual([]);
  });
});
