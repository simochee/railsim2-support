# Tab Dirty State & Close Confirmation Design

## Overview

エディタのタブに変更状態（dirty state）の表示と、未保存変更がある場合の確認フローを追加する。

## Dirty State 検出

Monaco Editor の `model.getAlternativeVersionId()` を使用。

- `savedVersionMap: Map<string, number>` — 各ファイルの「保存済み」version ID を保持
- サンプルファイル: モデル作成時の version ID が初期値
- ローカルファイル: 開いた時・保存した時に version ID を更新
- dirty 判定: `model.getAlternativeVersionId() !== savedVersionMap.get(key)`

## UI 変更

### タブのバッジ / 閉じるボタン（VS Code パターン）

| 状態 | 通常表示 | ホバー時 |
|------|---------|---------|
| dirty + 非アクティブ | ● (dot) | ✕ (close) |
| dirty + アクティブ | ● (dot) | ✕ (close) |
| clean + 非アクティブ | なし | ✕ (close) |
| clean + アクティブ | なし | ✕ (close) |

実装: `.tabClose` 内のアイコンを条件分岐で `codicon-circle-filled` / `codicon-close` に切り替え。
ホバー時は CSS で dot を隠して close を表示。

### 閉じる確認モーダル（Spectrum AlertDialog）

dirty なタブを閉じようとした時に表示。

- タイトル: 「未保存の変更」
- メッセージ: 「"{ファイル名}" の変更はまだ保存されていません。保存せずに閉じますか？」
- ボタン:
  - 「キャンセル」— secondary, モーダルを閉じる
  - 「保存せずに閉じる」— negative/destructive, タブを閉じる

### beforeunload

dirty なファイルが 1 つ以上ある場合、`window.beforeunload` でブラウザ標準の確認ダイアログを表示。

## State 管理

```typescript
// dirty state tracking
const savedVersionRef = useRef<Map<string, number>>(new Map());
const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set());

// 確認モーダル
const [closingTab, setClosingTab] = useState<string | null>(null);
```

`onDidChangeModelContent` 内で dirty 判定を更新し、`dirtyFiles` state を更新する。

## 影響範囲

- `Editor.tsx` — state 追加、タブ描画変更、モーダル追加、beforeunload effect 追加
- `Editor.module.css` — dirty badge スタイル追加、ホバー切り替えスタイル
