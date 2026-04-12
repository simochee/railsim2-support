import { describe, it, expect } from "vitest";
import { parse } from "../src/server/parser.js";
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

describe("vendor corpus smoke test", () => {
  const allFiles = collectFiles(vendorDir, ".txt");
  const files = allFiles.filter((f) => !isExcluded(path.relative(vendorDir, f)));

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
