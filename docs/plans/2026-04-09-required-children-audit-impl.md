# Required Children 網羅精査 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** vendor C++ ソースコードに基づいて、誤って required とマークされている children を optional に修正する

**Architecture:** `schema-overrides.ts` に `required: false` を追加 → `pnpm run generate` でスキーマ再生成 → テスト実行で回帰確認

**Tech Stack:** TypeScript, pnpm

---

### Task 1: schema-overrides.ts に required: false を追加（8件）

**Files:**
- Modify: `packages/language-server/scripts/schema-overrides.ts`

**Step 1: Lighting → Set を optional に修正**

Line 119 を変更:
```typescript
// Before:
Set: { multiple: true },

// After:
Set: { required: false, multiple: true },
```

**Step 2: Sun に children override を追加**

Sun のエントリがまだ schemaOverrides にないので新規追加。`Lighting` (line 121) の後に追加:
```typescript
Sun: {
  children: {
    LensFlare: { required: false },
    Whiteout: { required: false },
  },
},
```

**Step 3: Profile → Face を optional に修正**

Line 90 を変更:
```typescript
// Before:
Face: { multiple: true },

// After:
Face: { required: false, multiple: true },
```

**Step 4: Wireframe → Line を optional に修正**

Line 112 を変更:
```typescript
// Before:
Line: { multiple: true },

// After:
Line: { required: false, multiple: true },
```

**Step 5: Headlight → LensFlare を optional に修正**

Line 362 を変更:
```typescript
// Before:
LensFlare: { multiple: true },

// After:
LensFlare: { required: false, multiple: true },
```

**Step 6: PrimaryAssembly に children override を追加**

Line 292 付近、PrimaryAssembly の既存エントリに children を追加:
```typescript
PrimaryAssembly: {
  properties: {
    ConnectRail: { type: "expression", arity: null },
    DisconnectRail: { type: "expression", arity: null },
    BranchRail: { type: "expression", arity: null },
  },
  children: {
    Axle: { required: false },
  },
},
```

**Step 7: Body → Tilt を optional に修正**

Body の children (line 206-209) に Tilt を追加:
```typescript
children: {
  // JointZY multiple is not derivable from BNF (BNF says exactly 2)
  JointZY: { multiple: true },
  // vendor/CNamedObject.cpp: Tilt は if-guard パターン（デフォルト m_TiltMaxAngle = 0.0f）
  Tilt: { required: false },
},
```

---

### Task 2: スキーマ再生成

**Step 1: generate 実行**

Run: `pnpm run generate`
Expected: `semantic.generated.ts` が更新される

**Step 2: 差分確認**

Run: `git diff packages/language-server/src/schema/semantic.generated.ts`
Expected: 8箇所で `required: true` → `required: false` に変更

---

### Task 3: テスト実行

**Step 1: テスト実行**

Run: `pnpm run test`
Expected: 全テスト PASS

**Step 2: テスト失敗時の対処**

既存テストで "Required child object" のアサーションがある場合、対象が optional になったことでテストが壊れる可能性がある。その場合はテストを修正。

---

### Task 4: コミット

**Step 1: コミット**

```bash
git add packages/language-server/scripts/schema-overrides.ts packages/language-server/src/schema/semantic.generated.ts
git commit -m "fix: vendor 実装に基づき 8 件の children を required → optional に修正"
```

---

## UNCERTAIN レポート（判断保留）

以下の 3 件は vendor コードから明確に判断できなかったため修正対象外:

| Parent → Child | 理由 |
|---------------|------|
| Sun → Lighting | CEnvPlugin.cpp 内で Lighting ブロックが Sun の内部か env トップレベルか構造が不明確。throw パターンだが Sun の子かどうか要確認 |
| FrontCabin → Joint3D | FrontCabin 自体は PrimaryAssembly 内で optional（if-guard）。Joint3D が FrontCabin 内で required かは FrontCabin の Read 実装を直接確認する必要あり |
| TailCabin → Joint3D | FrontCabin と同様。TailCabin 自体は optional だが、内部の Joint3D の必須性は TailCabin の Read 実装依存 |
