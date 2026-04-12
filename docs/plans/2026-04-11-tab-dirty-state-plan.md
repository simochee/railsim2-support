# Tab Dirty State & Close Confirmation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** エディタタブに変更状態バッジ・確認モーダル・beforeunload を追加する

**Architecture:** Monaco の `getAlternativeVersionId()` で dirty 判定。`dirtyFiles` state でリアクティブに UI を更新。Spectrum の `AlertDialog` + `DialogContainer` で確認モーダル表示。

**Tech Stack:** React, Monaco Editor, Adobe React Spectrum v3, CSS Modules

---

### Task 1: Dirty State 追跡の追加

**Files:**
- Modify: `packages/website/src/components/Editor.tsx`

**Step 1: state と ref を追加**

`Editor.tsx` の state 宣言部（L101 付近）に以下を追加:

```typescript
const savedVersionRef = useRef<Map<string, number>>(new Map());
const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set());
```

**Step 2: サンプルモデル作成時に初期 version を記録**

`handleMount` 内のサンプルモデル作成ループ（L167-172）で、モデル作成後に version を記録:

```typescript
for (const sample of samples) {
  const uri = monaco.Uri.parse(`inmemory://editor/${sample.fileName}`);
  const model = monaco.editor.createModel(sample.content, "railsim2", uri);
  model.updateOptions({ insertSpaces: formatOptionsRef.current.insertSpaces, tabSize: formatOptionsRef.current.tabSize });
  modelsRef.current.set(sample.fileName, model);
  savedVersionRef.current.set(sample.fileName, model.getAlternativeVersionId());
}
```

**Step 3: ローカルファイルオープン時に version を記録**

`handleOpen`（L317-346）と `replaceLocalModel`（L359-372）でモデル作成後に:

```typescript
savedVersionRef.current.set(LOCAL_FILE_KEY, newModel.getAlternativeVersionId());
```

**Step 4: dirty 判定の更新関数を追加**

`handleMount` 内の `onDidChangeModelContent`（L209-214）を拡張。コールバック内で全モデルの dirty 判定を更新:

```typescript
ed.onDidChangeModelContent(() => {
  const model = ed.getModel();
  if (model) {
    changeDocument(conn, model.uri.toString(), versionRef.current++, model.getValue());
  }
  // Update dirty state for active file
  const newDirty = new Set<string>();
  for (const [key, m] of modelsRef.current.entries()) {
    const savedVer = savedVersionRef.current.get(key);
    if (savedVer !== undefined && m.getAlternativeVersionId() !== savedVer) {
      newDirty.add(key);
    }
  }
  setDirtyFiles(newDirty);
});
```

**Step 5: 保存時に version をリセット**

Ctrl+S ハンドラ（L178-186）:

```typescript
ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
  const opened = openedFileRef.current;
  const model = modelsRef.current.get(LOCAL_FILE_KEY);
  if (opened && model) {
    saveFile(opened.handle, model.getValue(), opened.encoding).then(() => {
      savedVersionRef.current.set(LOCAL_FILE_KEY, model.getAlternativeVersionId());
      setDirtyFiles((prev) => {
        const next = new Set(prev);
        next.delete(LOCAL_FILE_KEY);
        return next;
      });
    }).catch((e) => {
      console.warn("Failed to save file:", e);
    });
  }
});
```

`handleSave`（L348-357）にも同様のリセットを追加:

```typescript
const handleSave = useCallback(async () => {
  const opened = openedFileRef.current;
  const model = modelsRef.current.get(LOCAL_FILE_KEY);
  if (!opened || !model) return;
  try {
    await saveFile(opened.handle, model.getValue(), opened.encoding);
    savedVersionRef.current.set(LOCAL_FILE_KEY, model.getAlternativeVersionId());
    setDirtyFiles((prev) => {
      const next = new Set(prev);
      next.delete(LOCAL_FILE_KEY);
      return next;
    });
  } catch (e) {
    console.warn("Failed to save file:", e);
  }
}, []);
```

`handleSaveAs`（L374-399）にも同様のリセットを追加（`switchToModel` の後に）:

```typescript
savedVersionRef.current.set(LOCAL_FILE_KEY, model.getAlternativeVersionId());
setDirtyFiles((prev) => {
  const next = new Set(prev);
  next.delete(LOCAL_FILE_KEY);
  return next;
});
```

ただし SaveAs はアクティブファイルのコンテンツを新しいローカルモデルに書き出すので、`replaceLocalModel` で新モデルが作られた後に version を記録する（replaceLocalModel 内で既に対応済み）。

**Step 6: タブ閉じ時に dirty state をクリーンアップ**

`handleCloseTab`（L257-285）で、閉じたタブの dirty state を削除:

```typescript
// handleCloseTab の末尾（setOpenTabs / setLocalFileName の後）に追加
setDirtyFiles((prev) => {
  if (!prev.has(key)) return prev;
  const next = new Set(prev);
  next.delete(key);
  return next;
});
savedVersionRef.current.delete(key);
```

**Step 7: ブラウザで動作確認**

サンプルファイルを編集して dirtyFiles state が更新されることを React DevTools で確認。

**Step 8: Commit**

```bash
git add packages/website/src/components/Editor.tsx
git commit -m "feat(website): track dirty state for editor tabs using alternative version ID"
```

---

### Task 2: タブの Dirty バッジ UI

**Files:**
- Modify: `packages/website/src/components/Editor.tsx`
- Modify: `packages/website/src/components/Editor.module.css`

**Step 1: CSS に dirty バッジ用スタイルを追加**

`Editor.module.css` に追加:

```css
/* ── Dirty indicator (dot/close toggle) ──────────────── */
.tabIndicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 4px;
  position: relative;
}

.tabDot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: inherit;
  opacity: 0.8;
}

.tabDot :global(.codicon) {
  font-size: 8px;
}

/* dirty tab: show dot by default, close on hover */
.tabDirty .tabDot {
  display: inline-flex;
}
.tabDirty .tabClose {
  display: none;
}
.tabDirty:hover .tabDot {
  display: none;
}
.tabDirty:hover .tabClose {
  display: inline-flex;
  opacity: 0.6;
}

/* clean tab: hide dot always, show close on hover (existing behavior) */
.tab:not(.tabDirty) .tabDot {
  display: none;
}
```

既存の `.tabClose` の `opacity: 0` を維持し、`.tabDirty` の場合のみ上書きする。

**Step 2: タブ描画を更新**

サンプルタブ（L472-499）とローカルファイルタブ（L501-525）のそれぞれで、`className` に dirty クラスを追加し、閉じるボタン部分にバッジアイコンを追加:

```tsx
// サンプルタブ (openTabs.map 内)
<div key={key} className={`${s.tab}${activeFile === key ? ` ${s.tabActive}` : ""}${dirtyFiles.has(key) ? ` ${s.tabDirty}` : ""}`}>
  <span role="tab" ...>
    <span className="codicon codicon-file" />
    {sample.displayName}
  </span>
  {canClose && (
    <span className={s.tabIndicator}>
      <span className={s.tabDot}>
        <span className="codicon codicon-circle-filled" />
      </span>
      <button type="button" className={s.tabClose} aria-label={`Close ${sample.displayName}`}
        onClick={() => handleCloseTab(key)}>
        <span className="codicon codicon-close" />
      </button>
    </span>
  )}
</div>
```

ローカルファイルタブも同様のパターンで更新。

**Step 3: ブラウザで動作確認**

- サンプルファイルを編集 → dot が表示される
- タブにホバー → dot が消えて ✕ が表示される
- 別タブに切り替え → 編集済みタブに dot が見える

**Step 4: Commit**

```bash
git add packages/website/src/components/Editor.tsx packages/website/src/components/Editor.module.css
git commit -m "feat(website): show dirty indicator badge on editor tabs"
```

---

### Task 3: 閉じる確認モーダル

**Files:**
- Modify: `packages/website/src/components/Editor.tsx`

**Step 1: state を追加**

```typescript
const [closingTab, setClosingTab] = useState<string | null>(null);
```

**Step 2: handleCloseTab を変更**

dirty なタブを閉じようとした場合、即座に閉じずにモーダルを表示:

```typescript
const handleCloseTab = useCallback((key: string) => {
  const currentVisible = localFileName
    ? [...openTabs, LOCAL_FILE_KEY]
    : [...openTabs];
  if (currentVisible.length <= 1) return;

  if (dirtyFiles.has(key)) {
    setClosingTab(key);
    return;
  }

  performCloseTab(key);
}, [activeFile, localFileName, openTabs, switchToModel, dirtyFiles]);
```

**Step 3: 実際の閉じる処理を別関数に抽出**

```typescript
const performCloseTab = useCallback((key: string) => {
  // 既存の handleCloseTab のロジック（dirty チェック以外）
  const currentVisible = localFileName
    ? [...openTabs, LOCAL_FILE_KEY]
    : [...openTabs];

  if (activeFile === key) {
    const idx = currentVisible.indexOf(key);
    const nextKey = currentVisible[idx + 1] ?? currentVisible[idx - 1];
    if (nextKey) {
      switchToModel(nextKey);
      setActiveFile(nextKey);
    }
  }

  if (key === LOCAL_FILE_KEY) {
    const conn = connRef.current;
    const prevModel = modelsRef.current.get(LOCAL_FILE_KEY);
    if (prevModel) {
      if (conn) closeDocument(conn, prevModel.uri.toString());
      prevModel.dispose();
      modelsRef.current.delete(LOCAL_FILE_KEY);
    }
    openedFileRef.current = null;
    setLocalFileName(null);
  } else {
    setOpenTabs((prev) => prev.filter((t) => t !== key));
  }

  setDirtyFiles((prev) => {
    if (!prev.has(key)) return prev;
    const next = new Set(prev);
    next.delete(key);
    return next;
  });
  savedVersionRef.current.delete(key);
}, [activeFile, localFileName, openTabs, switchToModel]);
```

**Step 4: Spectrum AlertDialog + DialogContainer を追加**

import に `AlertDialog`, `DialogContainer` を追加。

JSX の `</Provider>` 直前に:

```tsx
<DialogContainer onDismiss={() => setClosingTab(null)}>
  {closingTab && (
    <AlertDialog
      title="未保存の変更"
      variant="destructive"
      primaryActionLabel="保存せずに閉じる"
      cancelLabel="キャンセル"
      onPrimaryAction={() => {
        performCloseTab(closingTab);
        setClosingTab(null);
      }}
      onCancel={() => setClosingTab(null)}
    >
      {`「${closingTab === LOCAL_FILE_KEY ? localFileName : samples.find((sm) => sm.fileName === closingTab)?.displayName ?? closingTab}」の変更はまだ保存されていません。保存せずに閉じますか？`}
    </AlertDialog>
  )}
</DialogContainer>
```

**Step 5: ブラウザで動作確認**

- dirty タブの ✕ をクリック → モーダル表示
- 「キャンセル」→ モーダル閉じ、タブそのまま
- 「保存せずに閉じる」→ タブが閉じる
- clean タブの ✕ → 即座に閉じる（モーダルなし）

**Step 6: Commit**

```bash
git add packages/website/src/components/Editor.tsx
git commit -m "feat(website): add confirmation modal when closing dirty editor tabs"
```

---

### Task 4: beforeunload ガード

**Files:**
- Modify: `packages/website/src/components/Editor.tsx`

**Step 1: useEffect を追加**

cleanup effect（L420-431）の近くに:

```typescript
useEffect(() => {
  if (dirtyFiles.size === 0) return;

  const handler = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = "";
  };
  window.addEventListener("beforeunload", handler);
  return () => window.removeEventListener("beforeunload", handler);
}, [dirtyFiles.size]);
```

**Step 2: ブラウザで動作確認**

- ファイルを編集 → ページリロード → ブラウザ標準確認ダイアログ表示
- 変更なし → ページリロード → 確認なしでリロード

**Step 3: Commit**

```bash
git add packages/website/src/components/Editor.tsx
git commit -m "feat(website): add beforeunload guard when editor has unsaved changes"
```
