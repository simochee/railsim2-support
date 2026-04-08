import { describe, it, expect } from "vitest";
import {
  readHelpHtml,
  extractBnfBlocks,
  extractPropertyDocs,
  extractOverview,
} from "../../scripts/lib/html-reader.js";
import path from "node:path";

const HELP_DIR = new URL(
  "../../../../vendor/railsim2/Distribution/jp/RailSim2/Help/",
  import.meta.url,
).pathname;

describe("readHelpHtml", () => {
  it("reads a Shift-JIS HTML file and returns a CheerioAPI", () => {
    const $ = readHelpHtml(path.join(HELP_DIR, "pi_sym_piston_zy.html"));
    // Should decode Shift-JIS correctly — title contains the nonterm name
    expect($("title").text()).toBe("piston-zy");
  });

  it("decodes Japanese text correctly", () => {
    const $ = readHelpHtml(path.join(HELP_DIR, "pi_rail.html"));
    expect($("title").text()).toBe("レールプラグイン");
  });
});

describe("extractBnfBlocks", () => {
  it("extracts BNF block from pi_sym_piston_zy.html", () => {
    const $ = readHelpHtml(path.join(HELP_DIR, "pi_sym_piston_zy.html"));
    const blocks = extractBnfBlocks($);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].nontermName).toBe("piston-zy");
    expect(blocks[0].body).toContain("PistonZY{");
    expect(blocks[0].body).toContain("triangle-link-zy");
    expect(blocks[0].refs).toContain("triangle-link-zy");
    expect(blocks[0].rawHtml).toContain('<a class="nonterm"');
    expect(blocks[0].fileName).toBeUndefined();
  });

  it("extracts file-level BNF with fileName from pi_station.html", () => {
    const $ = readHelpHtml(path.join(HELP_DIR, "pi_station.html"));
    const blocks = extractBnfBlocks($);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].nontermName).toBe("station-plugin");
    expect(blocks[0].fileName).toBe("Station2.txt");
    expect(blocks[0].refs).toContain("plugin-header");
    expect(blocks[0].refs).toContain("platform");
    expect(blocks[0].refs).toContain("model-option");
    expect(blocks[0].refs).toContain("train-free-object");
    expect(blocks[0].refs).toContain("effector");
  });

  it("extracts BNF block with named object from pi_sym_object_3d.html", () => {
    const $ = readHelpHtml(path.join(HELP_DIR, "pi_sym_object_3d.html"));
    const blocks = extractBnfBlocks($);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].nontermName).toBe("object-3d");
    expect(blocks[0].body).toContain("Object3D");
    expect(blocks[0].refs).toContain("string");
    expect(blocks[0].refs).toContain("named-object-info");
    expect(blocks[0].refs).toContain("object-joint-3d");
  });

  it("extracts file-level BNF with fileName from pi_rail.html", () => {
    const $ = readHelpHtml(path.join(HELP_DIR, "pi_rail.html"));
    const blocks = extractBnfBlocks($);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].nontermName).toBe("rail-plugin");
    expect(blocks[0].fileName).toBe("Rail2.txt");
    expect(blocks[0].refs).toContain("plugin-header");
    expect(blocks[0].refs).toContain("float");
    expect(blocks[0].refs).toContain("profile-list");
  });
});

describe("extractPropertyDocs", () => {
  it("extracts property documentation from pi_rail.html", () => {
    const $ = readHelpHtml(path.join(HELP_DIR, "pi_rail.html"));
    const docs = extractPropertyDocs($);

    expect(docs.get("Gauge")).toContain("ゲージ幅");
    expect(docs.get("Height")).toContain("レールの高さ");
    expect(docs.get("WheelSoundFile")).toContain(".wav");
    expect(docs.get("JointInterval")).toContain("メートル");
  });

  it("extracts argexp_f class as well", () => {
    const $ = readHelpHtml(path.join(HELP_DIR, "pi_sym_object_3d.html"));
    const docs = extractPropertyDocs($);

    expect(docs.get("Object3D")).toContain("オブジェクト名");
  });
});

describe("extractOverview", () => {
  it("extracts overview text from pi_rail.html", () => {
    const $ = readHelpHtml(path.join(HELP_DIR, "pi_rail.html"));
    const overview = extractOverview($);

    expect(overview).toBe(
      "レールプラグインは、線路のレールを表現するために使用されます。",
    );
  });

  it("extracts overview text from pi_sym_piston_zy.html", () => {
    const $ = readHelpHtml(path.join(HELP_DIR, "pi_sym_piston_zy.html"));
    const overview = extractOverview($);

    expect(overview).toContain("ピストン構造を定義します");
  });

  it("returns null when no overview section exists", async () => {
    // Use a cheerio instance with no overview
    const { load } = await import("cheerio");
    const $ = load("<html><body><h2>Other</h2><p>text</p></body></html>");
    const overview = extractOverview($);

    expect(overview).toBeNull();
  });
});
