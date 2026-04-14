import { describe, it, expect } from "vitest";
import { parse } from "../src/server/parser.js";
import { validateSchema } from "../src/server/validator/schemaValidator.js";
import { validateSwitches } from "../src/server/validator/switchValidator.js";
import { extractPluginType } from "../src/schema/pluginType.js";
import { buildSwitchIndex } from "../src/server/switchSymbols.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// vendor ディレクトリから全 .txt ファイルを再帰的に収集
function collectFiles(dir: string, ext: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

const vendorDir = path.resolve(__dirname, "../../../vendor/railsim2/Distribution");

// 非プラグインファイル（ライセンス文書・言語定義・メモ等）は parse 対象外
const EXCLUDE_PATTERNS = [
  "COPYING.txt",
  "Language.txt",
  "Memo.txt",
];

function isExcluded(relPath: string): boolean {
  return EXCLUDE_PATTERNS.some((p) => relPath.endsWith(p));
}

const allFiles = collectFiles(vendorDir, ".txt");
const files = allFiles.filter((f) => !isExcluded(path.relative(vendorDir, f)));

describe("vendor corpus smoke test", () => {
  it("should find vendor files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const relPath = path.relative(vendorDir, file);
    it(`parse without errors: ${relPath}`, () => {
      const src = fs.readFileSync(file, "utf-8");
      const { diagnostics } = parse(src);
      const errors = diagnostics.filter((d) => d.severity === "error");
      expect(errors).toHaveLength(0);
    });
  }
});

// ---------------------------------------------------------------------------
// Schema validation smoke test
// ---------------------------------------------------------------------------

/** allowlist entry: relPath pattern + message for known errors in vendor corpus */
interface AllowlistEntry {
  pathPattern: string; // substring match against relPath
  message: string;
}

const ERROR_ALLOWLIST: AllowlistEntry[] = [
  // 公式プラグインで DefineAnimation 内に ShiftTexture が重複定義されている
  { pathPattern: "Station/DoubleCrossing/Station2.txt", message: "'DefineAnimation' のプロパティ 'ShiftTexture' が重複しています" },
  { pathPattern: "Station/SingleCrossing/Station2.txt", message: "'DefineAnimation' のプロパティ 'ShiftTexture' が重複しています" },
  { pathPattern: "Struct/DigitalClock/Struct2.txt", message: "'DefineAnimation' のプロパティ 'ShiftTexture' が重複しています" },
];

function isAllowlisted(
  relPath: string,
  diag: { message: string; severity: string },
): boolean {
  return ERROR_ALLOWLIST.some(
    (a) => relPath.includes(a.pathPattern) && diag.message === a.message,
  );
}

describe("vendor schema validation smoke test", () => {
  // *2.txt + RailwayPluginSet/*.txt のみ対象
  const schemaFiles = files.filter((f) => {
    const base = path.basename(f);
    return /2\.txt$/i.test(base) || f.includes("RailwayPluginSet");
  });

  it("should find schema-target files", () => {
    expect(schemaFiles.length).toBeGreaterThan(0);
  });

  for (const file of schemaFiles) {
    const relPath = path.relative(vendorDir, file);
    it(`schema validate: ${relPath}`, () => {
      const src = fs.readFileSync(file, "utf-8");
      const { file: ast } = parse(src);

      const pluginType = extractPluginType(ast);
      if (!pluginType) return; // プラグインタイプ不明ならスキップ

      const switchIndex = buildSwitchIndex(ast);
      const schemaDiags = validateSchema(ast);
      const switchDiags = validateSwitches(ast, switchIndex);
      const allDiags = [...schemaDiags, ...switchDiags];

      // error のみチェック（warning は許容）
      const errors = allDiags.filter((d) => d.severity === "error");
      const unexpected = errors.filter((d) => !isAllowlisted(relPath, d));

      if (unexpected.length > 0) {
        const msgs = unexpected
          .map((d) => `[${d.severity}] ${d.message}`)
          .join("\n  ");
        expect.fail(`Unexpected errors in ${relPath}:\n  ${msgs}`);
      }
    });
  }
});
