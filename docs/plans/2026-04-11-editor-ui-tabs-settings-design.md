# Editor UI: File Tabs & Indentation Settings Dialog

## Overview

Replace the file dropdown with a VS Code-style tab bar, and replace inline indentation dropdowns with a status bar button + popover dialog. Persist settings in localStorage.

## Layout

```
| Spaces: 2 | Format | Open | Save |          toolbar (right-aligned actions)
[Rail2.txt] [Tie2.txt] [...] [localfile.txt x]  tab bar
-----------------------------------------------------
| Monaco Editor                                     |
```

## Feature 1: Indentation Settings Popover

- Status bar button in toolbar shows current setting: "Tab Size: 4" or "Spaces: 2"
- Clicking opens an anchored popover (not a full modal or command palette)
- Popover contents: indent type (Tab/Spaces) and tab size (1, 2, 4, 8)
- `tabSize` applies to both Tab and Spaces modes
- Switching between Tab/Spaces does NOT auto-reset tabSize
- Close on click-outside or Escape

## Feature 2: localStorage Persistence

- Key: `railsim2-editor-settings`
- Shape: `{ insertSpaces: boolean, tabSize: number }`
- Read on mount with validation: `insertSpaces` must be boolean, `tabSize` must be in [1, 2, 4, 8]
- Falls back to `{ insertSpaces: false, tabSize: 4 }` on invalid data
- Write on every settings change
- `formatOptionsRef` synchronized on initialization

## Feature 3: File Tab Bar

- Each sample file rendered as a tab
- Local file (if opened) gets an additional tab with close button (x)
- Active tab highlighted
- Horizontal overflow: scrollable
- Sample tabs are not closable
- Closing local file tab: dispose model, clear openedFileRef/localFileName, switch to first sample
- No dirty tracking in this iteration

## Files to Modify

- `packages/website/src/components/Editor.tsx` - All three features
- `packages/website/src/pages/editor.astro` - CSS for tab bar, popover, updated layout
