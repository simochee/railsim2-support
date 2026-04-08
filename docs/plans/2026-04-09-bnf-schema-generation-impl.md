# BNF Schema Generation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** BNF 文法を自動パースして semantic schema を生成し、手動メンテを廃止する

**Architecture:** cheerio で pi_*.html を DOM パース → 中間 IR（シンボルテーブル）構築 → hover emitter + schema emitter で 2 つの generated.ts を出力。override ファイルで vendor 由来の補正をマージ。

**Tech Stack:** TypeScript, cheerio (HTML パーサー), iconv-lite (Shift-JIS), vitest (テスト)

---

### Task 1: cheerio 依存追加 + html-reader モジュール

**Files:**
- Modify: `packages/language-server/package.json` (devDependencies に cheerio 追加)
- Create: `packages/language-server/scripts/lib/html-reader.ts`
- Create: `packages/language-server/test/scripts/html-reader.test.ts`

**Step 1: cheerio をインストール**

```bash
cd packages/language-server && pnpm add -D cheerio
```

**Step 2: Write the failing test**

```typescript
// test/scripts/html-reader.test.ts
import { describe, it, expect } from "vitest";
import { readHelpHtml, extractBnfBlocks, extractPropertyDocs, extractOverview } from "../../scripts/lib/html-reader.js";

describe("html-reader", () => {
  const HELP_DIR = new URL("../../../../vendor/railsim2/Distribution/jp/RailSim2/Help/", import.meta.url).pathname;

  it("extractBnfBlocks: pi_sym_piston_zy.html から BNF を抽出", () => {
    const html = readHelpHtml(`${HELP_DIR}/pi_sym_piston_zy.html`);
    const blocks = extractBnfBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].nontermName).toBe("piston-zy");
    expect(blocks[0].body).toContain("PistonZY");
    expect(blocks[0].refs).toContain("triangle-link-zy");
  });

  it("extractBnfBlocks: pi_station.html からファイルレベル BNF を抽出", () => {
    const html = readHelpHtml(`${HELP_DIR}/pi_station.html`);
    const blocks = extractBnfBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].nontermName).toBe("station-plugin");
    expect(blocks[0].fileName).toBe("Station2.txt");
  });

  it("extractPropertyDocs: argname/argexp ペアを抽出", () => {
    const html = readHelpHtml(`${HELP_DIR}/pi_rail.html`);
    const props = extractPropertyDocs(html);
    expect(props.get("Gauge")).toBeDefined();
  });

  it("extractOverview: 概要セクションを抽出", () => {
    const html = readHelpHtml(`${HELP_DIR}/pi_rail.html`);
    const overview = extractOverview(html);
    expect(overview).toContain("レール");
  });
});
```

**Step 3: Run test to verify it fails**

Run: `pnpm -r test -- --reporter=verbose packages/language-server/test/scripts/html-reader.test.ts`
Expected: FAIL (module not found)

**Step 4: Implement html-reader.ts**

cheerio で DOM パースし、以下を抽出:
- `<pre class="nonterm">` → 非終端シンボル名
- `<pre class="ind">` / `<pre class="ind_j">` → 文法本体 (rawHtml + テキスト)
- `<a class="nonterm">` → シンボル参照リスト
- `<h2>定義ファイル (XXX.txt) 文法</h2>` → ファイル名
- `<p class="argname">` + `<p class="argexp">` → プロパティ説明
- `<h2>概要</h2>` → 概要テキスト

**Step 5: Run test to verify it passes**

**Step 6: Commit**

```bash
git add packages/language-server/package.json pnpm-lock.yaml packages/language-server/scripts/lib/ packages/language-server/test/scripts/
git commit -m "feat: html-reader モジュール — cheerio で BNF ブロック抽出"
```

---

### Task 2: BNF パーサー (bnf-parser.ts)

**Files:**
- Create: `packages/language-server/scripts/lib/bnf-parser.ts`
- Create: `packages/language-server/test/scripts/bnf-parser.test.ts`

**Step 1: Write the failing test**

```typescript
// test/scripts/bnf-parser.test.ts
import { describe, it, expect } from "vitest";
import { parseBnfBody } from "../../scripts/lib/bnf-parser.js";

describe("bnf-parser", () => {
  it("プロパティ定義を解析", () => {
    const rawHtml = 'Gauge = <a class="nonterm" href="pi_sym_float.html">float</a>;';
    const rules = parseBnfBody(rawHtml);
    expect(rules).toContainEqual(
      expect.objectContaining({ kind: "property", name: "Gauge", type: "float" }),
    );
  });

  it("optional プロパティを解析", () => {
    const rawHtml = '<span class="ctrl">(</span> Height = <a class="nonterm">float</a>; <span class="ctrl">)</span><span class="sub">opt</span>';
    const rules = parseBnfBody(rawHtml);
    expect(rules).toContainEqual(
      expect.objectContaining({ kind: "property", name: "Height", optional: true }),
    );
  });

  it("シンボル参照を解析", () => {
    const rawHtml = '<a class="nonterm" href="pi_sym_platform.html">platform</a><span class="sup">*</span>';
    const rules = parseBnfBody(rawHtml);
    expect(rules).toContainEqual(
      expect.objectContaining({ kind: "ref", symbol: "platform", min: 0, max: Infinity }),
    );
  });

  it("インラインブロックを解析", () => {
    const rawHtml = `PistonZY{
    <a class="nonterm">triangle-link-zy</a>
    <a class="nonterm">triangle-link-zy</a>
}`;
    const rules = parseBnfBody(rawHtml);
    expect(rules).toContainEqual(
      expect.objectContaining({ kind: "inline-block", objectName: "PistonZY" }),
    );
  });

  it("union (|) を解析", () => {
    const rawHtml = '<span class="ctrl">(</span> <a class="nonterm">static-rotator</a>\n<span class="ctrl">|</span> <a class="nonterm">windmill</a> <span class="ctrl">)</span>';
    const rules = parseBnfBody(rawHtml);
    const union = rules.find((r) => r.kind === "union");
    expect(union).toBeDefined();
  });

  it("名前付きオブジェクト (Object3D string{...}) を解析", () => {
    const rawHtml = 'Object3D <a class="nonterm">string</a>{\n    <a class="nonterm">named-object-info</a>\n}';
    const rules = parseBnfBody(rawHtml);
    const block = rules.find((r) => r.kind === "inline-block");
    expect(block).toBeDefined();
    if (block?.kind === "inline-block") {
      expect(block.objectName).toBe("Object3D");
      expect(block.nameParam).toBe("string");
    }
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Implement bnf-parser.ts**

BNF の `rawHtml` (innerHTML of `<pre class="ind">`) を受け取り、`GrammarRule[]` を返す。cheerio で HTML 構造を解析してトークン列に変換し、再帰下降パーサーで GrammarRule を生成。

主な解析対象:
- `PropName = type;` → `{ kind: "property" }`
- `(...)opt / (...)opt cond` → optional 修飾
- `symbol*` / `symbol 1+` → cardinality
- `ObjectName { ... }` → `{ kind: "inline-block" }`
- `( A | B | C )` → `{ kind: "union" }`
- bare `symbol` → `{ kind: "ref" }`

**Step 4: Run tests to verify**

**Step 5: Commit**

```bash
git commit -m "feat: bnf-parser — BNF 文法テキストを GrammarRule IR に変換"
```

---

### Task 3: シンボルテーブル (symbol-table.ts)

**Files:**
- Create: `packages/language-server/scripts/lib/symbol-table.ts`
- Create: `packages/language-server/test/scripts/symbol-table.test.ts`

**Step 1: Write the failing test**

```typescript
// test/scripts/symbol-table.test.ts
import { describe, it, expect } from "vitest";
import { SymbolTable } from "../../scripts/lib/symbol-table.js";

describe("symbol-table", () => {
  const HELP_DIR = new URL("../../../../vendor/railsim2/Distribution/jp/RailSim2/Help/", import.meta.url).pathname;

  it("全 pi_*.html からシンボルを構築できる", () => {
    const table = SymbolTable.fromHelpDir(HELP_DIR);
    expect(table.get("piston-zy")).toBeDefined();
    const station = table.get("station-plugin");
    expect(station?.fileName).toBe("Station2.txt");
    expect(table.size).toBeGreaterThan(50);
  });

  it("resolve で再帰展開が動作する", () => {
    const table = SymbolTable.fromHelpDir(HELP_DIR);
    const result = table.resolve("piston-zy");
    expect(result.children).toHaveProperty("Link");
  });

  it("cycle を検出してエラーにならない", () => {
    const table = SymbolTable.fromHelpDir(HELP_DIR);
    expect(() => table.resolve("customizer")).not.toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Implement symbol-table.ts**

- 全 `pi_*.html` を走査して `readHelpHtml` + `extractBnfBlocks` + `parseBnfBody`
- シンボル名 → `GrammarSymbol` のマップを構築
- `resolve(symbolName)` メソッド: 再帰展開して `{ properties, children }` を返す
  - visited set で cycle 検出
  - `(symbolName, parentContext)` で memoize

**Step 4: Run tests to verify**

**Step 5: Commit**

```bash
git commit -m "feat: symbol-table — BNF シンボル再帰展開 + cycle 検出"
```

---

### Task 4: schema emitter (schema-emitter.ts) + override

**Files:**
- Create: `packages/language-server/scripts/lib/schema-emitter.ts`
- Create: `packages/language-server/scripts/schema-overrides.ts`
- Create: `packages/language-server/test/scripts/schema-emitter.test.ts`

**Step 1: Write the failing test**

```typescript
// test/scripts/schema-emitter.test.ts
import { describe, it, expect } from "vitest";
import { SymbolTable } from "../../scripts/lib/symbol-table.js";
import { emitSemanticSchema } from "../../scripts/lib/schema-emitter.js";

describe("schema-emitter", () => {
  const HELP_DIR = new URL("../../../../vendor/railsim2/Distribution/jp/RailSim2/Help/", import.meta.url).pathname;

  it("semanticSchema の TypeScript コードを生成する", () => {
    const table = SymbolTable.fromHelpDir(HELP_DIR);
    const code = emitSemanticSchema(table);
    expect(code).toContain("export const semanticSchema");
    expect(code).toContain("export const fileSchemas");
    expect(code).toContain("RailInfo");
    expect(code).toContain("PistonZY");
  });

  it("fileSchemas に全12ファイルが含まれる", () => {
    const table = SymbolTable.fromHelpDir(HELP_DIR);
    const code = emitSemanticSchema(table);
    for (const f of ["Rail2.txt", "Tie2.txt", "Girder2.txt", "Pier2.txt", "Line2.txt",
                      "Pole2.txt", "Train2.txt", "Station2.txt", "Struct2.txt",
                      "Surface2.txt", "Env2.txt", "Skin2.txt"]) {
      expect(code).toContain(`"${f}"`);
    }
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Implement schema-emitter.ts and schema-overrides.ts**

- シンボルテーブルの全ファイルレベルシンボル → `fileSchemas` 生成
- 各オブジェクトの展開結果 → `semanticSchema` 生成
- コンテキスト依存 schemaKey の自動検出
- `schema-overrides.ts` のマージ適用
- TypeScript コード文字列の出力

**Step 4: Run tests to verify**

**Step 5: Commit**

```bash
git commit -m "feat: schema-emitter — シンボルテーブルから semantic.generated.ts 生成"
```

---

### Task 5: hover emitter リファクタ (hover-emitter.ts)

**Files:**
- Create: `packages/language-server/scripts/lib/hover-emitter.ts`
- Modify: `packages/language-server/scripts/extract-hover-data.ts` (統合エントリポイントに書き換え)

**Step 1: 既存 hover 生成ロジックを hover-emitter.ts に抽出**

既存 `extract-hover-data.ts` の hover 生成部分を `hover-emitter.ts` に移動。`html-reader` の共通関数を使う。

**Step 2: extract-hover-data.ts を統合エントリポイントに書き換え**

```typescript
// extract-hover-data.ts (新)
import { SymbolTable } from "./lib/symbol-table.js";
import { emitSemanticSchema } from "./lib/schema-emitter.js";
import { emitHoverData } from "./lib/hover-emitter.js";

const HELP_DIR = "...";
const table = SymbolTable.fromHelpDir(HELP_DIR);

emitHoverData(table, HOVER_OUTPUT);
emitSemanticSchema(table, SCHEMA_OUTPUT);
```

**Step 3: 既存の hoverData.generated.ts と差分比較して同等出力を確認**

**Step 4: Commit**

```bash
git commit -m "refactor: extract-hover-data を hover-emitter + schema-emitter に分離統合"
```

---

### Task 6: 生成結果の統合 + 旧 semantic.ts 置き換え

**Files:**
- Delete: `packages/language-server/src/schema/semantic.ts`
- Create: `packages/language-server/src/schema/semantic.generated.ts` (生成スクリプト出力)
- Modify: all files importing from `semantic.ts` → `semantic.generated.ts`

**Step 1: 生成スクリプトを実行して semantic.generated.ts を出力**

```bash
pnpm generate:hover-data
```

**Step 2: import パスを全て semantic.generated.ts に変更**

**Step 3: 旧 semantic.ts を削除**

**Step 4: tsc ビルド + 全テストが通ることを確認**

```bash
pnpm -r build && pnpm -r test
```

**Step 5: Commit**

```bash
git commit -m "feat: semantic.ts を自動生成に完全移行"
```

---

### Task 7: vendor 検証テスト + override 調整

**Files:**
- Create: `packages/language-server/test/vendor-validation.test.ts`
- Modify: `packages/language-server/scripts/schema-overrides.ts` (必要に応じて追加)

**Step 1: Write vendor validation test**

vendor/railsim2 の全 40 プラグインファイルに対してスキーマバリデーションを実行し、スキーマエラー 0 を確認するテスト。

**Step 2: Run test — エラーがあれば schema-overrides.ts に追加して再生成**

**Step 3: Commit**

```bash
git commit -m "test: vendor 全40ファイルのスキーマバリデーション 0 エラーを確認"
```

---

### Task 8: package.json scripts 更新

**Files:**
- Modify: `packages/language-server/package.json`
- Modify: `package.json` (root)

**Step 1: generate スクリプトを統一**

`generate:hover-data` を `generate` に改名。hover + schema 同時生成であることを明確化。

**Step 2: Commit**

```bash
git commit -m "chore: generate スクリプト統一"
```
