# Monorepo 分割 Implementation Plan (v3)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** LSP サーバーを VS Code 拡張から分離し、`@lollipop-onl/railsim2-language-server` として単独公開できる monorepo 構成にする。

**Architecture:** pnpm workspaces で `packages/language-server` と `packages/vscode-extension` に分割。language-server は `vscode-languageserver` のみに依存し `--stdio` で起動可能。vscode-extension は esbuild で client と server を別々にバンドルし、`vsce package --no-dependencies` で配布する。

**Tech Stack:** pnpm workspaces, TypeScript project references, esbuild, vscode-languageserver

---

## 現状の構造

```
root/
  src/client/extension.ts           ← VS Code 専用
  src/server/                       ← LSP サーバー（エディタ非依存）
  src/shared/                       ← Pure TS 型定義
  src/schema/                       ← Pure TS スキーマ
  test/                             ← server/shared/schema のテスト
    *.test.ts                       ← language-server 系テスト
    grammar.test.mjs                ← TextMate grammar トークナイズテスト（vscode-textmate 依存）
  scripts/generateGrammar.ts        ← shared/keywords → tmLanguage.json
  scripts/extract-hover-data.ts     ← HTML → hoverData.generated.ts
  docs-site/                        ← ヘルプドキュメントサイト（Vite）
  syntaxes/railsim2.tmLanguage.json ← 生成物
  language-configuration.json       ← VS Code 言語設定
  images/                           ← VS Code 拡張アイコン
  package.json                      ← 単一パッケージ
```

## 目標の構造

```
root/
  packages/
    language-server/                    ← @lollipop-onl/railsim2-language-server
      src/
        server/
          server.ts                     ← startServer() を export + トップレベル呼び出し
          parser.ts, tokenizer.ts, ...
          validator/
        shared/                         ← ast, tokens, diagnostics, keywords
        schema/                         ← semantic, schemaTypes, schemaUtils
      bin/
        railsim2-language-server.cjs    ← CJS ラッパー: require("../out/server/server.js")
      test/                             ← language-server 系テスト
      scripts/
        extract-hover-data.ts
      package.json
      tsconfig.json
    vscode-extension/                   ← vscode-railsim2-grammar
      src/
        extension.ts
      scripts/
        generateGrammar.ts
      syntaxes/railsim2.tmLanguage.json
      language-configuration.json
      images/
      test/
        grammar.test.mjs                ← TextMate grammar テスト
        grammarCoverage.test.ts          ← Grammar カバレッジテスト
      package.json
      tsconfig.json
      .vscodeignore
  docs/plans/                           ← 設計ドキュメント（ルートに残す）
  docs-site/                            ← ヘルプサイト（ルートに残す）
  package.json                          ← private workspace root
  pnpm-workspace.yaml
  tsconfig.json                         ← base config（共有）
```

## 依存関係

```
vscode-extension
  ├── @lollipop-onl/railsim2-language-server (workspace:*)
  ├── vscode-languageclient
  ├── @types/vscode (dev)
  ├── @vscode/vsce (dev)
  ├── esbuild (dev)              ← バンドル用
  ├── vscode-textmate (dev)      ← grammar テスト用
  └── vscode-oniguruma (dev)     ← grammar テスト用

language-server
  ├── vscode-languageserver
  └── vscode-languageserver-textdocument
```

## Codex レビュー反映事項

### v2 で対応済み（レビュー 1 回目）

| 指摘 | 対応 |
|---|---|
| `vsce` が pnpm `workspace:*` を解決できない | esbuild でバンドル + `vsce package --no-dependencies` |
| `bin` が CJS/ESM 不整合 | `.cjs` 拡張子で `require()` を使用 |
| `exports["."]` が副作用モジュール | `"./node"` エントリを分離、root export は置かない |
| TypeScript project references 未実装 | ルート tsconfig に `references` を設定 |
| `grammar.test.mjs` が計画から漏れ | vscode-extension/test/ に移動 |
| ルート依存の棚卸し不足 | docs-site 用依存をルートに残す |

### v3 で対応（レビュー 2 回目）

| 指摘 | 対応 |
|---|---|
| `.vsix` に language server 本体が入らない | esbuild で server を別エントリとしてバンドル（`out/server.js`）。extension.ts は `asAbsolutePath("out/server.js")` で参照 |
| grammar テスト・generate:grammar がビルド成果物に依存するがビルド順未保証 | `pretest` / `pregenerate:grammar` スクリプトで language-server を先にビルド |
| vscode-extension の tsconfig に `composite: true` がない | `composite: true` を追加 |
| `@types/node` がルート依存から脱落 | 各パッケージの devDependencies に配置 |

---

### Task 1: workspace ルート設定

**Files:**
- Create: `pnpm-workspace.yaml`
- Modify: `package.json` (ルートを workspace root に変更)

**Step 1: `pnpm-workspace.yaml` を作成**

```yaml
packages:
  - "packages/*"
```

**Step 2: ルート `package.json` を workspace root 用に書き換え**

```json
{
  "private": true,
  "packageManager": "pnpm@10.33.0",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "generate:hover-data": "pnpm --filter @lollipop-onl/railsim2-language-server generate:hover-data",
    "generate:grammar": "pnpm --filter vscode-railsim2-grammar generate:grammar",
    "docs:build": "vite build --config docs-site/vite.config.ts",
    "docs:dev": "vite --config docs-site/vite.config.ts --open",
    "docs:preview": "vite preview --config docs-site/vite.config.ts"
  },
  "devDependencies": {
    "@tabler/icons": "^3.41.1",
    "iconv-lite": "^0.7.2",
    "postcss-modules": "^6.0.1",
    "tsx": "^4.21.0",
    "typescript": "^6.0.2",
    "vite": "^8.0.7"
  }
}
```

注: `@tabler/icons`, `iconv-lite`, `postcss-modules` は docs-site 用。ルートに残す。
`@types/node` は各パッケージの devDependencies に個別配置する（後続 Task 参照）。

**Step 3: Commit**

```bash
git add pnpm-workspace.yaml package.json
git commit -m "chore: workspace root を pnpm workspaces に切り替え"
```

---

### Task 2: language-server パッケージを作成しソースを移動

**Files:**
- Create: `packages/language-server/package.json`
- Create: `packages/language-server/tsconfig.json`
- Create: `packages/language-server/bin/railsim2-language-server.cjs`
- Move: `src/server/` → `packages/language-server/src/server/`
- Move: `src/shared/` → `packages/language-server/src/shared/`
- Move: `src/schema/` → `packages/language-server/src/schema/`
- Move: `scripts/extract-hover-data.ts` → `packages/language-server/scripts/`
- Move: テスト（grammar 系以外）→ `packages/language-server/test/`

**Step 1: ディレクトリ作成とファイル移動**

```bash
mkdir -p packages/language-server/{src,test,scripts,bin}
mv src/server packages/language-server/src/
mv src/shared packages/language-server/src/
mv src/schema packages/language-server/src/
mv scripts/extract-hover-data.ts packages/language-server/scripts/

# language-server 系テストを移動
mv test/completionProvider.test.ts packages/language-server/test/
mv test/integration.test.ts packages/language-server/test/
mv test/keywords.test.ts packages/language-server/test/
mv test/parser.test.ts packages/language-server/test/
mv test/schemaUtils.test.ts packages/language-server/test/
mv test/schemaValidator.test.ts packages/language-server/test/
mv test/semantic.test.ts packages/language-server/test/
mv test/tokenizer.test.ts packages/language-server/test/
mv test/tokens.test.ts packages/language-server/test/
mv test/unknownKeywordValidator.test.ts packages/language-server/test/
```

**Step 2: `packages/language-server/package.json` を作成**

```json
{
  "name": "@lollipop-onl/railsim2-language-server",
  "version": "0.1.0",
  "description": "Language Server for RailSim II plugin definition files",
  "license": "MIT",
  "exports": {
    "./node": "./out/server/server.js",
    "./keywords": "./out/shared/keywords.js"
  },
  "bin": {
    "railsim2-language-server": "./bin/railsim2-language-server.cjs"
  },
  "files": [
    "out",
    "bin"
  ],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "generate:hover-data": "tsx scripts/extract-hover-data.ts"
  },
  "dependencies": {
    "vscode-languageserver": "^9.0.1",
    "vscode-languageserver-textdocument": "^1.0.12"
  },
  "devDependencies": {
    "@types/node": "^25.5.2",
    "vitest": "^4.1.2"
  }
}
```

注: `exports` に root (`"."`) は置かない。`"./node"` は LSP サーバー起動用（副作用あり）、
`"./keywords"` は grammar 生成スクリプト用（副作用なし）。

**Step 3: `packages/language-server/tsconfig.json` を作成**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "src",
    "outDir": "out"
  },
  "include": ["src/**/*"]
}
```

**Step 4: CLI エントリポイント `packages/language-server/bin/railsim2-language-server.cjs` を作成**

```js
#!/usr/bin/env node
require("../out/server/server.js");
```

CJS ラッパーにすることで `"type": "module"` の有無に関わらず動作する。
`server.ts` の `createConnection(ProposedFeatures.all)` は引数なしで
IPC/stdio を自動検出するため、server.ts 側の変更は不要。

**Step 5: テストの import パスを確認**

テストファイルの相対パス構造は維持されるため、大半は変更不要の見込み。
`../src/server/...` → そのまま動く。

**Step 6: Commit**

```bash
git add packages/language-server/
git add -u
git commit -m "refactor: language-server パッケージを packages/ に分離"
```

---

### Task 3: vscode-extension パッケージを作成

**Files:**
- Create: `packages/vscode-extension/package.json`
- Create: `packages/vscode-extension/tsconfig.json`
- Move: `src/client/extension.ts` → `packages/vscode-extension/src/extension.ts`
- Move: `syntaxes/` → `packages/vscode-extension/syntaxes/`
- Move: `language-configuration.json` → `packages/vscode-extension/`
- Move: `images/` → `packages/vscode-extension/images/`
- Move: `.vscodeignore` → `packages/vscode-extension/`
- Move: `scripts/generateGrammar.ts` → `packages/vscode-extension/scripts/`
- Move: `test/grammarCoverage.test.ts` → `packages/vscode-extension/test/`
- Move: `test/grammar.test.mjs` → `packages/vscode-extension/test/`

**Step 1: ディレクトリ作成とファイル移動**

```bash
mkdir -p packages/vscode-extension/{src,scripts,test}
mv src/client/extension.ts packages/vscode-extension/src/
mv syntaxes packages/vscode-extension/
mv language-configuration.json packages/vscode-extension/
mv images packages/vscode-extension/
mv .vscodeignore packages/vscode-extension/
mv scripts/generateGrammar.ts packages/vscode-extension/scripts/

# grammar 系テストを vscode-extension に移動
mv test/grammarCoverage.test.ts packages/vscode-extension/test/
mv test/grammar.test.mjs packages/vscode-extension/test/

# 空ディレクトリの削除
rmdir test scripts src/client src
```

**Step 2: `packages/vscode-extension/package.json` を作成**

```json
{
  "name": "vscode-railsim2-grammar",
  "displayName": "RailSim2 Plugin Grammar",
  "description": "Syntax highlighting and language support for RailSim2 plugin definition",
  "version": "0.0.1",
  "publisher": "simochee",
  "main": "./out/extension.js",
  "license": "MIT",
  "icon": "images/icon.png",
  "homepage": "https://github.com/lollipop-onl/vscode-railsim-grammer",
  "repository": {
    "type": "git",
    "url": "git+ssh://git@github.com/lollipop-onl/vscode-railsim-grammer.git"
  },
  "bugs": {
    "url": "https://github.com/lollipop-onl/vscode-railsim-grammer/issues",
    "email": "lollipop@simochee.net"
  },
  "engines": {
    "vscode": "^1.75.0"
  },
  "categories": ["Programming Languages"],
  "activationEvents": [],
  "capabilities": {
    "virtualWorkspaces": true
  },
  "contributes": {
    "languages": [
      {
        "id": "railsim2",
        "aliases": ["RailSim2", "railsim2", "rs2"],
        "filenames": [
          "Rail2.txt", "Tie2.txt", "Girder2.txt", "Pier2.txt",
          "Line2.txt", "Pole2.txt", "Train2.txt", "Station2.txt",
          "Struct2.txt", "Surface2.txt", "Env2.txt", "Skin2.txt"
        ],
        "configuration": "./language-configuration.json"
      }
    ],
    "grammars": [
      {
        "language": "railsim2",
        "scopeName": "source.rs2",
        "path": "./syntaxes/railsim2.tmLanguage.json"
      }
    ]
  },
  "scripts": {
    "build": "node scripts/build.mjs",
    "pretest": "pnpm --filter @lollipop-onl/railsim2-language-server build",
    "test": "vitest run",
    "pregenerate:grammar": "pnpm --filter @lollipop-onl/railsim2-language-server build",
    "generate:grammar": "tsx scripts/generateGrammar.ts",
    "package": "pnpm build && vsce package --no-dependencies",
    "publish": "pnpm build && vsce publish --no-dependencies"
  },
  "dependencies": {
    "@lollipop-onl/railsim2-language-server": "workspace:*",
    "vscode-languageclient": "^9.0.1"
  },
  "devDependencies": {
    "@types/node": "^25.5.2",
    "@types/vscode": "^1.110.0",
    "@vscode/vsce": "^3.0.0",
    "esbuild": "^0.25.0",
    "vitest": "^4.1.2",
    "vscode-oniguruma": "^2.0.1",
    "vscode-textmate": "^9.3.2"
  }
}
```

注:
- `build` は 2 エントリの esbuild を実行するスクリプト（`scripts/build.mjs`、後述）
- エントリ 1: `extension.ts` → `out/extension.js`（client、`--external:vscode`）
- エントリ 2: `@lollipop-onl/railsim2-language-server/node` → `out/server.js`（server、スタンドアロン）
- `vsce package --no-dependencies` で `node_modules` を含めない（バンドル済み）
- `pretest` / `pregenerate:grammar` で language-server を先にビルドし、exports 経由の import を保証
- `vscode-textmate`, `vscode-oniguruma` は grammar テスト用 devDependency

**Step 3: `packages/vscode-extension/tsconfig.json` を作成**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "src",
    "outDir": "out"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../language-server" }
  ]
}
```

注: ルート tsconfig から reference されるため `composite: true` が必要。
ただしビルドは esbuild で行うため、この tsconfig は型チェック・IDE 用。

**Step 4: `scripts/build.mjs` を作成（esbuild 2 エントリ）**

```js
import * as esbuild from "esbuild";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Client: extension.ts → out/extension.js
await esbuild.build({
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "out/extension.js",
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  sourcemap: true,
});

// Server: language-server の server.ts → out/server.js
await esbuild.build({
  entryPoints: [require.resolve("@lollipop-onl/railsim2-language-server/node")],
  bundle: true,
  outfile: "out/server.js",
  format: "cjs",
  platform: "node",
  sourcemap: true,
});
```

注: `.mjs` は ESM なので `require` は未定義。
`createRequire(import.meta.url)` で CJS の `require.resolve` を利用可能にする。

これにより `.vsix` に `out/extension.js`（client）と `out/server.js`（server）の
両方がバンドルされて含まれる。

**Step 5: `extension.ts` のサーバーモジュールパスを修正**

```ts
// Before:
const serverModule = context.asAbsolutePath(path.join("out", "server", "server.js"));

// After:
const serverModule = context.asAbsolutePath(path.join("out", "server.js"));
```

注: esbuild が language-server をバンドルした `out/server.js` を参照する。
`require.resolve()` ではなく `asAbsolutePath()` を使うことで、
`.vsix` にバンドルされたファイルを正しく参照できる。

**Step 6: `generateGrammar.ts` の import パスを修正**

注: `pregenerate:grammar` スクリプトにより language-server が先にビルドされるため、
exports 経由の import（`out/` を指す）が解決できる。

```ts
// Before:
import { OBJECT_NAMES, CONTROL_KEYWORDS, PROPERTY_NAMES, CONSTANTS } from "../src/shared/keywords.js";

// After:
import { OBJECT_NAMES, CONTROL_KEYWORDS, PROPERTY_NAMES, CONSTANTS } from "@lollipop-onl/railsim2-language-server/keywords";
```

**Step 7: `generateGrammar.ts` の出力パスを修正**

```ts
// Before:
const ROOT = resolve(__dirname, "..");
const OUTPUT_PATH = join(ROOT, "syntaxes/railsim2.tmLanguage.json");

// After: （スクリプトは packages/vscode-extension/scripts/ にあるので __dirname の相対位置が変わる）
const PACKAGE_ROOT = resolve(__dirname, "..");
const OUTPUT_PATH = join(PACKAGE_ROOT, "syntaxes/railsim2.tmLanguage.json");
```

注: `__dirname` の位置が変わるので確認が必要だが、`resolve(__dirname, "..")` で
パッケージルートを指すのは同じなので変更不要の可能性が高い。

**Step 8: grammar テストのパス修正**

注: `pretest` スクリプトにより language-server が先にビルドされるため、
exports 経由の import が解決できる。

`grammarCoverage.test.ts`:
```ts
// Before:
import { semanticSchema } from "../src/schema/semantic.js";
import { OBJECT_NAMES, ... } from "../src/shared/keywords.js";
const GRAMMAR_PATH = join(ROOT, "syntaxes/railsim2.tmLanguage.json");

// After:
import { semanticSchema } from "@lollipop-onl/railsim2-language-server/schema";
import { OBJECT_NAMES, ... } from "@lollipop-onl/railsim2-language-server/keywords";
const GRAMMAR_PATH = join(ROOT, "syntaxes/railsim2.tmLanguage.json");
```

注: `"./schema"` export は Task 4 で追加する。

`grammar.test.mjs`:
```js
// Before:
const GRAMMAR_PATH = join(ROOT, "syntaxes/railsim2.tmLanguage.json");
// ROOT = resolve(import.meta.dirname, "..");

// After: （test/ → packages/vscode-extension/test/ に移動するので同じ相対位置）
// パッケージルートからの相対パスは変わらないので変更不要の見込み
```

**Step 9: `.vscodeignore` を更新**

```
.vscode/**
.vscode-test/**
.git/**
.gitignore
node_modules/**
test/**
scripts/**
src/**
*.vsix
*.ts
```

**Step 10: Commit**

```bash
git add packages/vscode-extension/
git add -u
git commit -m "refactor: vscode-extension パッケージを packages/ に分離"
```

---

### Task 4: language-server の exports 追加整備

**Files:**
- Modify: `packages/language-server/package.json` (exports に schema を追加)

**Step 1: `grammarCoverage.test.ts` が必要とする `semanticSchema` 用の export を追加**

```json
{
  "exports": {
    "./node": "./out/server/server.js",
    "./keywords": "./out/shared/keywords.js",
    "./schema": "./out/schema/semantic.js"
  }
}
```

**Step 2: `grammarCoverage.test.ts` の import を更新**

```ts
import { semanticSchema } from "@lollipop-onl/railsim2-language-server/schema";
import { OBJECT_NAMES, CONTROL_KEYWORDS, PROPERTY_NAMES, CONSTANTS } from "@lollipop-onl/railsim2-language-server/keywords";
```

**Step 3: Commit**

```bash
git add packages/
git commit -m "feat: language-server の exports を整備"
```

---

### Task 5: TypeScript project references 設定

**Files:**
- Modify: `tsconfig.json` (ルート: references 追加)
- Modify: `packages/language-server/tsconfig.json` (composite: true 確認)
- Modify: `packages/vscode-extension/tsconfig.json` (references 確認)

**Step 1: ルート `tsconfig.json` を更新**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  },
  "exclude": ["node_modules", "out", "packages"],
  "references": [
    { "path": "packages/language-server" },
    { "path": "packages/vscode-extension" }
  ]
}
```

**Step 2: language-server の `composite: true` を確認**

Task 2 で既に設定済み。

**Step 3: vscode-extension の `composite: true` と `references` を確認**

Task 3 で既に設定済み。`composite: true` はルートから reference されるために必要。
`references: [{ "path": "../language-server" }]` により `tsc --build` で
language-server → vscode-extension の順にビルドされる。

注: vscode-extension の実際のビルドは esbuild で行うが、`composite` と `references` は
型チェック（`tsc --noEmit`）と IDE の IntelliSense のために必要。
ルートの `build` スクリプトは `pnpm -r build` のままにして各パッケージの
`build` スクリプトに任せる（language-server: `tsc`、vscode-extension: `esbuild`）。

**Step 5: Commit**

```bash
git add tsconfig.json packages/*/tsconfig.json
git commit -m "chore: TypeScript project references を設定"
```

---

### Task 6: 不要ファイル整理 + install + ビルド確認

**Files:**
- Delete: `tsconfig.server.json`
- Delete: `tsconfig.client.json`

**Step 1: 不要な tsconfig を削除**

```bash
rm tsconfig.server.json tsconfig.client.json
```

**Step 2: install & ビルド確認**

```bash
pnpm install
pnpm build
```

Expected: 両パッケージのビルドが成功する。
language-server は `tsc` でビルド、vscode-extension は `esbuild` でバンドル。

**Step 3: テスト確認**

```bash
pnpm test
```

Expected: 全テスト PASS。

**Step 4: CLI 起動確認**

```bash
echo '{}' | node packages/language-server/bin/railsim2-language-server.cjs --stdio
```

Expected: LSP サーバーが stdio で起動し、JSON-RPC レスポンスを返す（またはタイムアウトで終了）。

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: 不要な tsconfig 削除 + monorepo ビルド確認"
```

---

### Task 7: .vscode/launch.json の調整

**Files:**
- Modify: `.vscode/launch.json`

**Step 1: launch.json を確認し、パスを更新**

`extensionDevelopmentPath` を `packages/vscode-extension` に変更。

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}/packages/vscode-extension"
      ]
    }
  ]
}
```

**Step 2: Commit**

```bash
git add .vscode/
git commit -m "chore: launch.json を monorepo 構成に合わせて調整"
```

---

### Task 8: esbuild バンドル設定の動作確認

**Files:**
- Modify: `packages/vscode-extension/scripts/build.mjs` (必要に応じて esbuild オプション調整)

**Step 1: language-server ビルド → esbuild バンドルの動作確認**

```bash
pnpm --filter @lollipop-onl/railsim2-language-server build
cd packages/vscode-extension && pnpm build
```

Expected:
- `out/extension.js` が生成される（client バンドル、`vscode` は external）
- `out/server.js` が生成される（server バンドル、language-server の全依存を含む）

**Step 2: server.js がスタンドアロンで動くことを確認**

```bash
echo '{}' | node packages/vscode-extension/out/server.js --stdio
```

Expected: LSP サーバーが stdio で起動する。

**Step 3: vsce package の動作確認**

```bash
cd packages/vscode-extension && pnpm package
```

Expected: `.vsix` ファイルが生成される。`--no-dependencies` により
`node_modules` は含まれず、バンドル済み JS のみ。

**Step 4: .vsix の中身を確認**

```bash
unzip -l packages/vscode-extension/*.vsix | head -30
```

Expected:
- `extension/out/extension.js` — client バンドル
- `extension/out/server.js` — server バンドル
- `extension/syntaxes/`, `extension/language-configuration.json`, `extension/images/`
- `node_modules/` は含まれない

**Step 5: Commit（変更がある場合のみ）**

```bash
git add packages/vscode-extension/
git commit -m "fix: esbuild バンドル設定を調整"
```

---

## 完了後の確認チェックリスト

- [ ] `pnpm install` が成功する
- [ ] `pnpm build` で全パッケージのビルドが成功する
- [ ] `pnpm test` で全テストが PASS する
- [ ] `node packages/language-server/bin/railsim2-language-server.cjs --stdio` で LSP サーバーが起動する
- [ ] `node packages/vscode-extension/out/server.js --stdio` でバンドル済み server が起動する
- [ ] `pnpm generate:grammar` が動作する（pregenerate:grammar で language-server が自動ビルド）
- [ ] `pnpm generate:hover-data` が動作する
- [ ] `cd packages/vscode-extension && pnpm package` で .vsix が生成される
- [ ] .vsix に `out/extension.js` と `out/server.js` が含まれる
- [ ] .vsix に `node_modules/` が含まれない
- [ ] VS Code でデバッグ起動して拡張が動作する
