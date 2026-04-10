# Turborepo 導入 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turborepo を導入し、パッケージ間のビルド順序自動解決とローカルキャッシュによる高速化を実現する

**Architecture:** pnpm workspace の既存構成を維持しつつ、turbo をタスクランナーとして追加。`turbo.json` でタスク間の依存関係を宣言し、`dependsOn: ["^build"]` で依存パッケージの自動ビルドを実現する。各パッケージの pre スクリプトによる手動依存ビルドは削除する。

**Tech Stack:** Turborepo, pnpm workspace

---

### Task 1: turbo をインストール

**Files:**
- Modify: `package.json` (devDependencies)
- Modify: `pnpm-lock.yaml` (自動更新)

**Step 1: turbo を devDependencies に追加**

Run: `pnpm add -Dw turbo`

**Step 2: インストールを確認**

Run: `pnpm turbo --version`
Expected: バージョン番号が表示される

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add turbo to devDependencies"
```

---

### Task 2: `turbo.json` を作成

**Files:**
- Create: `turbo.json`

**Step 1: `turbo.json` を作成**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["out/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "generate": {},
    "generate:grammar": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "persistent": true,
      "cache": false
    }
  }
}
```

**Step 2: turbo でビルドが正しい順序で実行されることを確認**

Run: `pnpm turbo build --dry`
Expected: language-server → vscode-extension, website の順で実行計画が表示される

**Step 3: 実際にビルドを実行**

Run: `pnpm turbo build`
Expected: 全パッケージが正常にビルドされる

**Step 4: キャッシュが効くことを確認**

Run: `pnpm turbo build`
Expected: 全パッケージが `FULL TURBO` (cache hit) になる

**Step 5: Commit**

```bash
git add turbo.json
git commit -m "feat: add turbo.json with task definitions"
```

---

### Task 3: ルート `package.json` のスクリプトを turbo 経由に変更

**Files:**
- Modify: `package.json:8-18` (scripts)

**Step 1: scripts を変更**

```json
{
  "scripts": {
    "build": "turbo build",
    "test": "turbo test",
    "generate": "pnpm --filter @railsim2-support/language-server generate",
    "generate:grammar": "turbo generate:grammar --filter=railsim2-support",
    "docs:build": "turbo build --filter=@railsim2-support/website",
    "docs:dev": "turbo dev --filter=@railsim2-support/website",
    "docs:preview": "pnpm --filter @railsim2-support/website preview",
    "lint": "oxlint",
    "lint:fix": "oxlint --fix",
    "fmt": "oxfmt packages/",
    "fmt:check": "oxfmt --check packages/"
  }
}
```

**Step 2: 各スクリプトが動作することを確認**

Run: `pnpm build`
Expected: turbo 経由で全パッケージがビルドされる

Run: `pnpm test`
Expected: turbo 経由でテストが実行される

**Step 3: Commit**

```bash
git add package.json
git commit -m "refactor: use turbo for build and test scripts"
```

---

### Task 4: `vscode-extension` の pre スクリプトを削除

**Files:**
- Modify: `packages/vscode-extension/package.json:31-32` (pretest, pregenerate:grammar を削除)

**Step 1: `pretest` と `pregenerate:grammar` を削除**

削除する行:
- `"pretest": "pnpm --filter @railsim2-support/language-server build",`
- `"pregenerate:grammar": "pnpm --filter @railsim2-support/language-server build",`

**Step 2: turbo 経由でテストが通ることを確認**

Run: `pnpm test`
Expected: turbo が language-server を先にビルドし、テストが通る

**Step 3: Commit**

```bash
git add packages/vscode-extension/package.json
git commit -m "refactor: remove pre-scripts, let turbo handle dependency builds"
```

---

### Task 5: CI ワークフロー `build-extension.yml` を簡素化

**Files:**
- Modify: `.github/workflows/build-extension.yml:31-32` (Build language server ステップを削除)

**Step 1: language-server の明示的ビルドステップを削除**

削除する行:
```yaml
      - name: Build language server
        run: pnpm --filter @railsim2-support/language-server build
```

`package` スクリプト内の `pnpm build` が turbo 経由で language-server を自動ビルドするため不要。

**Step 2: Commit**

```bash
git add .github/workflows/build-extension.yml
git commit -m "ci: remove explicit language-server build step"
```

---

### Task 6: `.gitignore` に `.turbo/` を追加

**Files:**
- Modify: `.gitignore`

**Step 1: `.turbo/` を追加**

`.gitignore` の末尾に追加:
```
.turbo/
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add .turbo/ to gitignore"
```

---

### Task 7: 最終動作確認

**Step 1: クリーンビルド**

Run: `rm -rf packages/*/out packages/website/dist .turbo`
Run: `pnpm build`
Expected: 正しい順序でフルビルドされる

**Step 2: キャッシュヒット確認**

Run: `pnpm build`
Expected: 全パッケージが cache hit

**Step 3: テスト実行**

Run: `pnpm test`
Expected: 全テストが通る
