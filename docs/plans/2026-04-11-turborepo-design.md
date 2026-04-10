# Turborepo 導入設計

## 目的

- ビルド順序の自動解決: パッケージ間の依存関係に基づいて正しい順序で自動ビルド
- キャッシュによる高速化: 変更がないパッケージのビルドをスキップ

## 現状の課題

- `pnpm -r build` は依存順に実行してくれるがキャッシュ機能がない
- `vscode-extension` の `pretest` / `pregenerate:grammar` で language-server のビルドを手動で呼び出している
- CI の `build-extension.yml` でも language-server のビルドを明示的に実行している

## パッケージ依存関係

```
language-server → vscode-extension → website
                                   ↗
language-server ──────────────────
```

## 変更内容

### 1. `turbo.json`（新規）

```jsonc
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

### 2. ルート `package.json`

scripts を turbo 経由に変更し、`turbo` を devDependencies に追加する。

```jsonc
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

### 3. `packages/vscode-extension/package.json`

`pretest` と `pregenerate:grammar` を削除する。turbo の `dependsOn: ["^build"]` が依存ビルドを担う。

### 4. `.github/workflows/build-extension.yml`

language-server の明示的ビルドステップを削除する。`pnpm --filter railsim2-support package` 内で turbo が自動的に language-server をビルドする。

### 5. `.gitignore`

`.turbo/` を追加する。
