import { useRef, useState, useCallback, useEffect } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import type { ProtocolConnection } from "vscode-languageserver-protocol/browser";
import "@vscode/codicons/dist/codicon.css";
import {
  ActionButton,
  AlertDialog,
  Content,
  defaultTheme,
  Dialog,
  DialogContainer,
  Divider,
  Flex,
  Heading,
  Item,
  Keyboard,
  Menu,
  MenuTrigger,
  Picker,
  Provider,
  Section,
  SubmenuTrigger,
  Switch,
  Text,
  Tooltip,
  TooltipTrigger,
} from "@adobe/react-spectrum";
import { setupGrammar } from "../lib/grammar";
import { startLsp, disposeLsp, openDocument, closeDocument, changeDocument, registerProviders, applyDiagnostics, formatDocument, formatModel, type FormatOptions } from "../lib/lsp";
import { isFileAccessSupported, openFile, saveFile, saveFileAs, type OpenedFile } from "../lib/file-access";
import { suggestFileName } from "../lib/plugin-type";
import s from "./DemoEditor.module.css";

interface Sample {
  fileName: string;
  displayName: string;
  content: string;
}

interface Props {
  samples: Sample[];
  grammar: object;
  langConf: {
    comments: { lineComment: string; blockComment: [string, string] };
    brackets: [string, string][];
    autoClosingPairs: [string, string][];
    surroundingPairs: [string, string][];
  };
}

const FILE_ACCESS = typeof window !== "undefined" && isFileAccessSupported();
const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
const MOD = IS_MAC ? "⌘" : "Ctrl+";
const SHIFT = IS_MAC ? "⇧" : "Shift+";
const ALT = IS_MAC ? "⌥" : "Alt+";
const LOCAL_FILE_KEY = "__local__";
const SETTINGS_KEY = "railsim2-demo-settings";
const VALID_TAB_SIZES = [1, 2, 4, 8];
const DEFAULT_SAMPLE = "Train2.txt";

type OutputEncoding = "SJIS" | "UTF8";

interface EditorSettings {
  insertSpaces: boolean;
  tabSize: number;
  fullWidth: boolean;
  formatOnSave: boolean;
  outputEncoding: OutputEncoding;
}

const VALID_ENCODINGS: OutputEncoding[] = ["SJIS", "UTF8"];

function loadSettings(): EditorSettings {
  const defaults: EditorSettings = { insertSpaces: false, tabSize: 4, fullWidth: false, formatOnSave: false, outputEncoding: "SJIS" };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (typeof parsed.insertSpaces !== "boolean") return defaults;
    if (typeof parsed.tabSize !== "number" || !VALID_TAB_SIZES.includes(parsed.tabSize)) return defaults;
    return {
      insertSpaces: parsed.insertSpaces,
      tabSize: parsed.tabSize,
      fullWidth: typeof parsed.fullWidth === "boolean" ? parsed.fullWidth : defaults.fullWidth,
      formatOnSave: typeof parsed.formatOnSave === "boolean" ? parsed.formatOnSave : defaults.formatOnSave,
      outputEncoding: VALID_ENCODINGS.includes(parsed.outputEncoding) ? parsed.outputEncoding : defaults.outputEncoding,
    };
  } catch {
    return defaults;
  }
}

function saveSettings(settings: EditorSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

function resolveDefaultSample(samples: Sample[]): string {
  return samples.some((s) => s.fileName === DEFAULT_SAMPLE)
    ? DEFAULT_SAMPLE
    : samples[0]?.fileName ?? "";
}

export function DemoEditor({ samples, grammar, langConf }: Props) {
  const [initialSettings] = useState(loadSettings);
  const defaultFile = resolveDefaultSample(samples);
  const [activeFile, setActiveFile] = useState(defaultFile);
  const [localFileName, setLocalFileName] = useState<string | null>(null);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [insertSpaces, setInsertSpaces] = useState(initialSettings.insertSpaces);
  const [tabSize, setTabSize] = useState(initialSettings.tabSize);
  const [fullWidth, setFullWidth] = useState(initialSettings.fullWidth);
  const [formatOnSave, setFormatOnSave] = useState(initialSettings.formatOnSave);
  const [outputEncoding, setOutputEncoding] = useState<OutputEncoding>(initialSettings.outputEncoding);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const modelsRef = useRef<Map<string, editor.ITextModel>>(new Map());
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const connRef = useRef<ProtocolConnection | null>(null);
  const disposedRef = useRef(false);
  const openedFileRef = useRef<OpenedFile | null>(null);
  const versionRef = useRef(2);
  const savedVersionRef = useRef<Map<string, number>>(new Map());
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set());
  const pendingActionRef = useRef<(() => void) | null>(null);
  const formatOptionsRef = useRef<FormatOptions>({
    tabSize: initialSettings.tabSize,
    insertSpaces: initialSettings.insertSpaces,
  });
  const formatOnSaveRef = useRef(initialSettings.formatOnSave);
  const outputEncodingRef = useRef<OutputEncoding>(initialSettings.outputEncoding);
  const handleNewRef = useRef<() => void>(() => {});
  const handleOpenRef = useRef<() => void>(() => {});
  const handleSaveAsRef = useRef<() => void>(() => {});

  const isLocalFile = activeFile === LOCAL_FILE_KEY;
  const isDirty = dirtyFiles.has(activeFile);

  const currentFileName = isLocalFile
    ? (localFileName ?? "無題")
    : (samples.find((sm) => sm.fileName === activeFile)?.displayName ?? activeFile);

  const menuDisabledKeys: string[] = [];
  if (!FILE_ACCESS) {
    menuDisabledKeys.push("open-local", "save", "save-as");
  } else {
    if (!isLocalFile) menuDisabledKeys.push("save");
  }

  const switchToModel = useCallback((key: string) => {
    const conn = connRef.current;
    const ed = editorRef.current;
    const oldModel = ed?.getModel();
    if (oldModel && conn) {
      closeDocument(conn, oldModel.uri.toString());
    }
    const model = modelsRef.current.get(key);
    if (model && ed) {
      ed.setModel(model);
      versionRef.current = 2;
    }
    if (model && conn) {
      openDocument(conn, model.uri.toString(), "railsim2", model.getValue());
    }
  }, []);

  const handleMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;

    monaco.languages.register({ id: "railsim2" });
    monaco.languages.setLanguageConfiguration("railsim2", {
      comments: {
        lineComment: langConf.comments.lineComment,
        blockComment: langConf.comments.blockComment,
      },
      brackets: langConf.brackets,
      autoClosingPairs: langConf.autoClosingPairs.map(
        ([open, close]: [string, string]) => ({ open, close }),
      ),
      surroundingPairs: langConf.surroundingPairs.map(
        ([open, close]: [string, string]) => ({ open, close }),
      ),
    });

    for (const sample of samples) {
      const uri = monaco.Uri.parse(`inmemory://demo/${sample.fileName}`);
      const model = monaco.editor.createModel(sample.content, "railsim2", uri);
      model.updateOptions({ insertSpaces: formatOptionsRef.current.insertSpaces, tabSize: formatOptionsRef.current.tabSize });
      modelsRef.current.set(sample.fileName, model);
      savedVersionRef.current.set(sample.fileName, model.getAlternativeVersionId());
    }

    ed.setModel(null);
    ed.updateOptions({ insertSpaces: formatOptionsRef.current.insertSpaces, tabSize: formatOptionsRef.current.tabSize });

    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const opened = openedFileRef.current;
      const localModel = modelsRef.current.get(LOCAL_FILE_KEY);
      if (opened && localModel) {
        const doSave = () => {
          saveFile(opened.handle, localModel.getValue(), outputEncodingRef.current).then(() => {
            savedVersionRef.current.set(LOCAL_FILE_KEY, localModel.getAlternativeVersionId());
            setDirtyFiles((prev) => {
              const next = new Set(prev);
              next.delete(LOCAL_FILE_KEY);
              return next;
            });
          }).catch((e) => {
            console.warn("Failed to save file:", e);
          });
        };

        const conn = connRef.current;
        if (formatOnSaveRef.current && conn) {
          formatDocument(conn, monaco, ed, formatOptionsRef.current).then(doSave);
        } else {
          doSave();
        }
        return;
      }
      if (FILE_ACCESS) handleSaveAsRef.current();
    });

    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, () => {
      if (FILE_ACCESS) handleSaveAsRef.current();
    });

    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyO, () => {
      if (FILE_ACCESS) handleOpenRef.current();
    });

    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN, () => {
      handleNewRef.current();
    });

    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Comma, () => {
      setShowSettings(true);
    });

    ed.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
      const conn = connRef.current;
      if (conn) {
        formatDocument(conn, monaco, ed, formatOptionsRef.current);
      }
    });

    setupGrammar(monaco, ed, grammar).catch((e) => {
      console.warn("Failed to setup TextMate grammar:", e);
    });

    startLsp().then(async (conn) => {
      if (disposedRef.current) return;
      connRef.current = conn;

      // Format default sample before displaying
      const defaultModel = modelsRef.current.get(defaultFile);
      if (defaultModel) {
        openDocument(conn, defaultModel.uri.toString(), "railsim2", defaultModel.getValue());
        await formatModel(conn, monaco, defaultModel, formatOptionsRef.current);
        changeDocument(conn, defaultModel.uri.toString(), versionRef.current++, defaultModel.getValue());
        ed.setModel(defaultModel);
        savedVersionRef.current.set(defaultFile, defaultModel.getAlternativeVersionId());
      }

      registerProviders(monaco, conn, (params) => {
        const targetModel = monaco.editor.getModels().find(
          (m) => m.uri.toString() === params.uri,
        );
        if (targetModel) {
          applyDiagnostics(monaco, targetModel, params.diagnostics);
        }
      });

      ed.onDidChangeModelContent(() => {
        const model = ed.getModel();
        if (model) {
          changeDocument(conn, model.uri.toString(), versionRef.current++, model.getValue());
        }
        // Update dirty state only for the active model
        if (!model) return;
        let activeKey: string | undefined;
        for (const [key, m] of modelsRef.current.entries()) {
          if (m === model) { activeKey = key; break; }
        }
        if (!activeKey) return;
        const savedVer = savedVersionRef.current.get(activeKey);
        const isDirty = savedVer !== undefined && model.getAlternativeVersionId() !== savedVer;
        setDirtyFiles((prev) => {
          const wasDirty = prev.has(activeKey);
          if (isDirty === wasDirty) return prev;
          const next = new Set(prev);
          isDirty ? next.add(activeKey) : next.delete(activeKey);
          return next;
        });
      });
    }).catch((e) => {
      console.warn("Failed to start Language Server:", e);
    });
  };

  const handleFormat = useCallback(() => {
    const conn = connRef.current;
    const ed = editorRef.current;
    const monaco = monacoRef.current;
    if (conn && ed && monaco) {
      formatDocument(conn, monaco, ed, formatOptionsRef.current);
    }
  }, []);

  const updateSettings = useCallback((patch: Partial<EditorSettings>) => {
    const newInsertSpaces = patch.insertSpaces ?? insertSpaces;
    const newTabSize = patch.tabSize ?? tabSize;
    const newFullWidth = patch.fullWidth ?? fullWidth;
    const newFormatOnSave = patch.formatOnSave ?? formatOnSave;
    const newOutputEncoding = patch.outputEncoding ?? outputEncoding;
    setInsertSpaces(newInsertSpaces);
    setTabSize(newTabSize);
    setFullWidth(newFullWidth);
    setFormatOnSave(newFormatOnSave);
    setOutputEncoding(newOutputEncoding);
    const settings: EditorSettings = { insertSpaces: newInsertSpaces, tabSize: newTabSize, fullWidth: newFullWidth, formatOnSave: newFormatOnSave, outputEncoding: newOutputEncoding };
    formatOptionsRef.current = { insertSpaces: newInsertSpaces, tabSize: newTabSize };
    formatOnSaveRef.current = newFormatOnSave;
    outputEncodingRef.current = newOutputEncoding;
    saveSettings(settings);
    const ed = editorRef.current;
    if (ed) {
      ed.updateOptions({ insertSpaces: newInsertSpaces, tabSize: newTabSize });
    }
    for (const model of modelsRef.current.values()) {
      model.updateOptions({ insertSpaces: newInsertSpaces, tabSize: newTabSize });
    }
  }, [insertSpaces, tabSize, fullWidth, formatOnSave, outputEncoding]);

  const withDirtyCheck = useCallback((action: () => void) => {
    if (dirtyFiles.has(activeFile)) {
      pendingActionRef.current = action;
      setShowSwitchConfirm(true);
      return;
    }
    action();
  }, [activeFile, dirtyFiles]);

  const handleConfirmSwitch = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    setShowSwitchConfirm(false);
    action?.();
  }, []);

  const handleSwitchToSample = useCallback((fileName: string) => {
    if (fileName === activeFile) return;
    withDirtyCheck(async () => {
      const conn = connRef.current;
      const ed = editorRef.current;
      const monaco = monacoRef.current;
      const model = modelsRef.current.get(fileName);
      if (!model || !ed) return;

      // Close old document in LSP
      const oldModel = ed.getModel();
      if (oldModel && conn) {
        closeDocument(conn, oldModel.uri.toString());
      }

      // Format model off-screen, then display
      if (conn && monaco) {
        openDocument(conn, model.uri.toString(), "railsim2", model.getValue());
        await formatModel(conn, monaco, model, formatOptionsRef.current);
        changeDocument(conn, model.uri.toString(), versionRef.current++, model.getValue());
      }

      ed.setModel(model);
      versionRef.current = 2;
      savedVersionRef.current.set(fileName, model.getAlternativeVersionId());
      setActiveFile(fileName);
    });
  }, [activeFile, withDirtyCheck]);

  const applyOpenedFile = useCallback((opened: OpenedFile) => {
    const monaco = monacoRef.current;
    if (!monaco) return;

    openedFileRef.current = opened;
    updateSettings({ outputEncoding: opened.encoding });

    const prevModel = modelsRef.current.get(LOCAL_FILE_KEY);
    if (prevModel) {
      const conn = connRef.current;
      if (conn) closeDocument(conn, prevModel.uri.toString());
      prevModel.dispose();
    }

    const uri = monaco.Uri.file(`/local/${opened.fileName}`);
    const existing = monaco.editor.getModel(uri);
    if (existing) existing.dispose();
    const model = monaco.editor.createModel(opened.content, "railsim2", uri);
    model.updateOptions({ insertSpaces: formatOptionsRef.current.insertSpaces, tabSize: formatOptionsRef.current.tabSize });
    modelsRef.current.set(LOCAL_FILE_KEY, model);
    savedVersionRef.current.set(LOCAL_FILE_KEY, model.getAlternativeVersionId());

    setLocalFileName(opened.fileName);
    setActiveFile(LOCAL_FILE_KEY);
    switchToModel(LOCAL_FILE_KEY);
    setDirtyFiles((prev) => {
      if (!prev.has(LOCAL_FILE_KEY)) return prev;
      const next = new Set(prev);
      next.delete(LOCAL_FILE_KEY);
      return next;
    });
  }, [switchToModel, updateSettings]);

  const handleOpen = useCallback(async () => {
    let opened: OpenedFile;
    try {
      opened = await openFile();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      console.warn("Failed to open file:", e);
      return;
    }

    if (dirtyFiles.has(activeFile)) {
      pendingActionRef.current = () => applyOpenedFile(opened);
      setShowSwitchConfirm(true);
    } else {
      applyOpenedFile(opened);
    }
  }, [activeFile, dirtyFiles, applyOpenedFile]);

  const handleSave = useCallback(async () => {
    const opened = openedFileRef.current;
    const model = modelsRef.current.get(LOCAL_FILE_KEY);
    if (!opened || !model) return;
    try {
      if (formatOnSave) {
        const conn = connRef.current;
        const ed = editorRef.current;
        const monaco = monacoRef.current;
        if (conn && ed && monaco) {
          await formatDocument(conn, monaco, ed, formatOptionsRef.current);
        }
      }
      await saveFile(opened.handle, model.getValue(), outputEncoding);
      savedVersionRef.current.set(LOCAL_FILE_KEY, model.getAlternativeVersionId());
      setDirtyFiles((prev) => {
        const next = new Set(prev);
        next.delete(LOCAL_FILE_KEY);
        return next;
      });
    } catch (e) {
      console.warn("Failed to save file:", e);
    }
  }, [formatOnSave, outputEncoding]);

  const replaceLocalModel = useCallback((monaco: typeof import("monaco-editor"), fileName: string, content: string) => {
    const prevLocal = modelsRef.current.get(LOCAL_FILE_KEY);
    if (prevLocal) {
      const conn = connRef.current;
      if (conn) closeDocument(conn, prevLocal.uri.toString());
      prevLocal.dispose();
    }
    const uri = monaco.Uri.file(`/local/${fileName}`);
    const existing = monaco.editor.getModel(uri);
    if (existing) existing.dispose();
    const newModel = monaco.editor.createModel(content, "railsim2", uri);
    newModel.updateOptions({ insertSpaces: formatOptionsRef.current.insertSpaces, tabSize: formatOptionsRef.current.tabSize });
    modelsRef.current.set(LOCAL_FILE_KEY, newModel);
    savedVersionRef.current.set(LOCAL_FILE_KEY, newModel.getAlternativeVersionId());
  }, []);

  const handleNew = useCallback(() => {
    withDirtyCheck(() => {
      const monaco = monacoRef.current;
      if (!monaco) return;

      replaceLocalModel(monaco, "untitled", "");
      openedFileRef.current = null;
      setLocalFileName(null);
      setActiveFile(LOCAL_FILE_KEY);
      switchToModel(LOCAL_FILE_KEY);
      setDirtyFiles((prev) => {
        if (!prev.has(LOCAL_FILE_KEY)) return prev;
        const next = new Set(prev);
        next.delete(LOCAL_FILE_KEY);
        return next;
      });
    });
  }, [withDirtyCheck, replaceLocalModel, switchToModel]);

  const handleSaveAs = useCallback(async () => {
    const monaco = monacoRef.current;
    if (!monaco) return;

    const model = modelsRef.current.get(activeFile);
    if (!model) return;

    const content = model.getValue();
    const suggestedName = suggestFileName(activeFile, isLocalFile, localFileName, content);
    try {
      const saved = await saveFileAs(content, outputEncoding, suggestedName);

      replaceLocalModel(monaco, saved.fileName, content);
      openedFileRef.current = { content, fileName: saved.fileName, handle: saved.handle, encoding: outputEncoding };
      setLocalFileName(saved.fileName);
      setActiveFile(LOCAL_FILE_KEY);
      switchToModel(LOCAL_FILE_KEY);

      const newLocalModel = modelsRef.current.get(LOCAL_FILE_KEY);
      if (newLocalModel) {
        savedVersionRef.current.set(LOCAL_FILE_KEY, newLocalModel.getAlternativeVersionId());
      }
      setDirtyFiles((prev) => {
        const next = new Set(prev);
        next.delete(LOCAL_FILE_KEY);
        return next;
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      console.warn("Failed to save file:", e);
    }
  }, [activeFile, localFileName, outputEncoding, replaceLocalModel, switchToModel]);

  handleNewRef.current = handleNew;
  handleOpenRef.current = handleOpen;
  handleSaveAsRef.current = handleSaveAs;

  const handleMenuAction = useCallback((key: React.Key) => {
    const keyStr = String(key);
    switch (keyStr) {
      case "new":
        handleNew();
        return;
      case "open-local":
        handleOpen();
        return;
      case "save":
        handleSave();
        return;
      case "save-as":
        handleSaveAs();
        return;
      case "settings":
        setShowSettings(true);
        return;
      case "samples":
        return;
      default:
        handleSwitchToSample(keyStr);
    }
  }, [handleNew, handleSwitchToSample, handleOpen, handleSave, handleSaveAs]);

  useEffect(() => {
    return () => {
      disposedRef.current = true;
      connRef.current = null;
      openedFileRef.current = null;
      disposeLsp();
      for (const model of modelsRef.current.values()) {
        model.dispose();
      }
      modelsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (dirtyFiles.size === 0) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirtyFiles.size]);

  return (
    <Provider theme={defaultTheme} colorScheme="dark">
      <div className={`${s.root}${fullWidth ? ` ${s.fullWidth}` : ""}`}>
      <div className={s.toolbar}>
        <div className={s.toolbarStart}>
          <MenuTrigger>
            <ActionButton isQuiet aria-label="ファイルメニュー">
              <span className="codicon codicon-menu" />
            </ActionButton>
            <Menu onAction={handleMenuAction} disabledKeys={menuDisabledKeys}>
              <Section>
                <Item key="new" textValue="新規作成"><Text>新規作成</Text><Keyboard>{`${MOD}N`}</Keyboard></Item>
              </Section>
              <Section>
                <SubmenuTrigger>
                  <Item key="samples">サンプルを開く</Item>
                  <Menu onAction={handleMenuAction}>
                    {samples.map((sample) => (
                      <Item key={sample.fileName}>{sample.displayName}</Item>
                    ))}
                  </Menu>
                </SubmenuTrigger>
                <Item key="open-local" textValue="ファイルを開く..."><Text>ファイルを開く...</Text><Keyboard>{`${MOD}O`}</Keyboard></Item>
              </Section>
              <Section>
                <Item key="save" textValue="上書き保存"><Text>上書き保存</Text><Keyboard>{`${MOD}S`}</Keyboard></Item>
                <Item key="save-as" textValue="名前を付けて保存..."><Text>名前を付けて保存...</Text><Keyboard>{`${SHIFT}${MOD}S`}</Keyboard></Item>
              </Section>
              <Section>
                <Item key="settings" textValue="設定..."><Text>設定...</Text><Keyboard>{`${MOD},`}</Keyboard></Item>
              </Section>
            </Menu>
          </MenuTrigger>
          <span className={s.fileName}>
            <span className="codicon codicon-file" />
            {currentFileName}
            {isDirty && <span className={s.dirtyDot}><span className="codicon codicon-circle-filled" /></span>}
          </span>
        </div>
        <div className={s.toolbarEnd}>
          <TooltipTrigger placement="bottom">
            <ActionButton isQuiet onPress={handleFormat} aria-label="フォーマット">
              <span className="codicon codicon-sparkle" />
            </ActionButton>
            <Tooltip>{`フォーマット (${SHIFT}${ALT}F)`}</Tooltip>
          </TooltipTrigger>
        </div>
      </div>
      <div className={s.editorWrapper}>
        <Editor
          theme="vs-dark"
          onMount={handleMount}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            detectIndentation: false,
            quickSuggestions: { other: "on", comments: "off", strings: "on" },
          }}
        />
      </div>
      </div>
      <DialogContainer onDismiss={() => setShowSwitchConfirm(false)}>
        {showSwitchConfirm && (
          <AlertDialog
            title="未保存の変更"
            variant="destructive"
            primaryActionLabel="保存せずに続行"
            cancelLabel="キャンセル"
            onPrimaryAction={handleConfirmSwitch}
            onCancel={() => { pendingActionRef.current = null; }}
          >
            {`「${currentFileName}」の変更はまだ保存されていません。保存せずに続行しますか？`}
          </AlertDialog>
        )}
      </DialogContainer>
      <DialogContainer type="modal" isDismissable onDismiss={() => setShowSettings(false)}>
        {showSettings && (
          <Dialog size="S">
            <Heading>設定</Heading>
            <Divider />
            <Content>
              <Flex direction="column" gap="size-200">
                <Flex justifyContent="space-between" alignItems="center">
                  <span>インデント</span>
                  <Picker
                    aria-label="インデント"
                    selectedKey={insertSpaces ? "spaces" : "tab"}
                    onSelectionChange={(key) => updateSettings({ insertSpaces: key === "spaces" })}
                    width="size-1700"
                  >
                    <Item key="tab">タブ</Item>
                    <Item key="spaces">スペース</Item>
                  </Picker>
                </Flex>
                <Flex justifyContent="space-between" alignItems="center">
                  <span>インデントサイズ</span>
                  <Picker
                    aria-label="インデントサイズ"
                    selectedKey={String(tabSize)}
                    onSelectionChange={(key) => updateSettings({ tabSize: Number(key) })}
                    width="size-1700"
                  >
                    <Item key="1">1</Item>
                    <Item key="2">2</Item>
                    <Item key="4">4</Item>
                    <Item key="8">8</Item>
                  </Picker>
                </Flex>
                <Flex justifyContent="space-between" alignItems="center">
                  <span>エンコーディング</span>
                  <Picker
                    aria-label="エンコーディング"
                    selectedKey={outputEncoding}
                    onSelectionChange={(key) => updateSettings({ outputEncoding: key as OutputEncoding })}
                    width="size-1700"
                  >
                    <Item key="SJIS">Shift_JIS</Item>
                    <Item key="UTF8">UTF-8</Item>
                  </Picker>
                </Flex>
                <Flex justifyContent="space-between" alignItems="center">
                  <span>保存時にフォーマット</span>
                  <Switch
                    aria-label="保存時にフォーマット"
                    isSelected={formatOnSave}
                    onChange={(value) => updateSettings({ formatOnSave: value })}
                  />
                </Flex>
                <Flex justifyContent="space-between" alignItems="center">
                  <span>横幅を広げる</span>
                  <Switch
                    aria-label="横幅を広げる"
                    isSelected={fullWidth}
                    onChange={(value) => updateSettings({ fullWidth: value })}
                  />
                </Flex>
              </Flex>
            </Content>
          </Dialog>
        )}
      </DialogContainer>
    </Provider>
  );
}
