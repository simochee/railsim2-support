import { useRef, useState, useCallback, useEffect } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import type { ProtocolConnection } from "vscode-languageserver-protocol/browser";
import "@vscode/codicons/dist/codicon.css";
import {
  ActionButton,
  Content,
  defaultTheme,
  Dialog,
  DialogTrigger,
  Divider,
  Flex,
  Heading,
  Item,
  Menu,
  MenuTrigger,
  Picker,
  Provider,
  Section,
  SubmenuTrigger,
  Switch,
  Tooltip,
  TooltipTrigger,
} from "@adobe/react-spectrum";
import { setupGrammar } from "../lib/grammar";
import { startLsp, disposeLsp, openDocument, closeDocument, changeDocument, registerProviders, applyDiagnostics, formatDocument, type FormatOptions } from "../lib/lsp";
import { isFileAccessSupported, openFile, saveFile, type OpenedFile } from "../lib/file-access";
import s from "./DemoEditor.module.css";

interface Sample {
  fileName: string;
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
const LOCAL_FILE_KEY = "__local__";
const SETTINGS_KEY = "railsim2-demo-settings";
const VALID_TAB_SIZES = [1, 2, 4, 8];
const DEFAULT_SAMPLE = "Train2.txt";

interface EditorSettings {
  insertSpaces: boolean;
  tabSize: number;
  fullWidth: boolean;
}

function loadSettings(): EditorSettings {
  const defaults: EditorSettings = { insertSpaces: false, tabSize: 4, fullWidth: false };
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
  const [openTabs, setOpenTabs] = useState<string[]>([defaultFile]);
  const [activeFile, setActiveFile] = useState(defaultFile);
  const [localFileName, setLocalFileName] = useState<string | null>(null);
  const [insertSpaces, setInsertSpaces] = useState(initialSettings.insertSpaces);
  const [tabSize, setTabSize] = useState(initialSettings.tabSize);
  const [fullWidth, setFullWidth] = useState(initialSettings.fullWidth);
  const tabsScrollRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ isDragging: boolean; didDrag: boolean; startX: number; scrollLeft: number }>({ isDragging: false, didDrag: false, startX: 0, scrollLeft: 0 });
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const modelsRef = useRef<Map<string, editor.ITextModel>>(new Map());
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const connRef = useRef<ProtocolConnection | null>(null);
  const disposedRef = useRef(false);
  const openedFileRef = useRef<OpenedFile | null>(null);
  const versionRef = useRef(2);
  const formatOptionsRef = useRef<FormatOptions>({
    tabSize: initialSettings.tabSize,
    insertSpaces: initialSettings.insertSpaces,
  });

  const visibleTabs: string[] = localFileName
    ? [...openTabs, LOCAL_FILE_KEY]
    : openTabs;

  const unopenedSamples = samples.filter((sm) => !openTabs.includes(sm.fileName));
  const hasAddActions = unopenedSamples.length > 0 || FILE_ACCESS;

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
    }

    const defaultModel = modelsRef.current.get(defaultFile);
    if (defaultModel) ed.setModel(defaultModel);
    ed.updateOptions({ insertSpaces: formatOptionsRef.current.insertSpaces, tabSize: formatOptionsRef.current.tabSize });

    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const opened = openedFileRef.current;
      const model = modelsRef.current.get(LOCAL_FILE_KEY);
      if (opened && model) {
        saveFile(opened.handle, model.getValue(), opened.encoding).catch((e) => {
          console.warn("Failed to save file:", e);
        });
      }
    });

    setupGrammar(monaco, ed, grammar).catch((e) => {
      console.warn("Failed to setup TextMate grammar:", e);
    });

    startLsp().then((conn) => {
      if (disposedRef.current) return;
      connRef.current = conn;
      const currentModel = ed.getModel();
      if (currentModel) {
        openDocument(conn, currentModel.uri.toString(), "railsim2", currentModel.getValue());
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
    setInsertSpaces(newInsertSpaces);
    setTabSize(newTabSize);
    setFullWidth(newFullWidth);
    const settings: EditorSettings = { insertSpaces: newInsertSpaces, tabSize: newTabSize, fullWidth: newFullWidth };
    formatOptionsRef.current = { insertSpaces: newInsertSpaces, tabSize: newTabSize };
    saveSettings(settings);
    const ed = editorRef.current;
    if (ed) {
      ed.updateOptions({ insertSpaces: newInsertSpaces, tabSize: newTabSize });
    }
    for (const model of modelsRef.current.values()) {
      model.updateOptions({ insertSpaces: newInsertSpaces, tabSize: newTabSize });
    }
  }, [insertSpaces, tabSize, fullWidth]);

  const handleTabClick = useCallback(
    (key: string) => {
      if (dragState.current.didDrag) return;
      setActiveFile(key);
      switchToModel(key);
    },
    [switchToModel],
  );

  const handleCloseTab = useCallback((key: string) => {
    const currentVisible = localFileName
      ? [...openTabs, LOCAL_FILE_KEY]
      : [...openTabs];
    if (currentVisible.length <= 1) return;

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
  }, [activeFile, localFileName, openTabs, switchToModel]);

  const handleTabsMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = tabsScrollRef.current;
    if (!el) return;
    dragState.current = { isDragging: true, didDrag: false, startX: e.pageX, scrollLeft: el.scrollLeft };
    el.classList.add(s.tabsDragging);
  }, []);

  const handleTabsMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragState.current.isDragging) return;
    const el = tabsScrollRef.current;
    if (!el) return;
    const dx = e.pageX - dragState.current.startX;
    if (Math.abs(dx) > 3) {
      dragState.current.didDrag = true;
    }
    e.preventDefault();
    el.scrollLeft = dragState.current.scrollLeft - dx;
  }, []);

  const handleTabsMouseUp = useCallback(() => {
    dragState.current.isDragging = false;
    tabsScrollRef.current?.classList.remove(s.tabsDragging);
  }, []);

  const handleAddSample = useCallback((fileName: string) => {
    setOpenTabs((prev) => prev.includes(fileName) ? prev : [...prev, fileName]);
    setActiveFile(fileName);
    switchToModel(fileName);
  }, [switchToModel]);

  const handleOpen = useCallback(async () => {
    const monaco = monacoRef.current;
    if (!monaco) return;

    try {
      const opened = await openFile();
      openedFileRef.current = opened;

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

      setLocalFileName(opened.fileName);
      setActiveFile(LOCAL_FILE_KEY);
      switchToModel(LOCAL_FILE_KEY);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      console.warn("Failed to open file:", e);
    }
  }, [switchToModel]);

  const handleMenuAction = useCallback((key: React.Key) => {
    const keyStr = String(key);
    if (keyStr === "open-local") {
      handleOpen();
      return;
    }
    handleAddSample(keyStr);
  }, [handleAddSample, handleOpen]);

  const handleSave = useCallback(async () => {
    const opened = openedFileRef.current;
    const model = modelsRef.current.get(LOCAL_FILE_KEY);
    if (!opened || !model) return;
    try {
      await saveFile(opened.handle, model.getValue(), opened.encoding);
    } catch (e) {
      console.warn("Failed to save file:", e);
    }
  }, []);

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

  const isLocalFile = activeFile === LOCAL_FILE_KEY;
  const canClose = visibleTabs.length > 1;

  return (
    <Provider theme={defaultTheme} colorScheme="dark">
      <div className={fullWidth ? s.fullWidth : undefined}>
      <div className={s.tabsWrapper}>
        {hasAddActions && (
          <div className={s.addBtnArea}>
            <MenuTrigger>
              <ActionButton isQuiet aria-label="Open file">
                <span className="codicon codicon-add" />
              </ActionButton>
              <Menu onAction={handleMenuAction}>
                <Section title="ファイルを開く">
                  {unopenedSamples.length > 0 ? (
                    <SubmenuTrigger>
                      <Item key="samples">サンプル</Item>
                      <Menu onAction={handleMenuAction}>
                        {unopenedSamples.map((sample) => (
                          <Item key={sample.fileName}>{sample.fileName}</Item>
                        ))}
                      </Menu>
                    </SubmenuTrigger>
                  ) : null}
                  {FILE_ACCESS ? (
                    <Item key="open-local">ローカルファイルを開く...</Item>
                  ) : null}
                </Section>
              </Menu>
            </MenuTrigger>
          </div>
        )}
        <div
          ref={tabsScrollRef}
          className={s.tabsScroll}
          role="tablist"
          onMouseDown={handleTabsMouseDown}
          onMouseMove={handleTabsMouseMove}
          onMouseUp={handleTabsMouseUp}
          onMouseLeave={handleTabsMouseUp}
        >
          {openTabs.map((key) => {
            const sample = samples.find((sm) => sm.fileName === key);
            if (!sample) return null;
            return (
              <div key={key} className={`${s.tab}${activeFile === key ? ` ${s.tabActive}` : ""}`}>
                <span
                  role="tab"
                  tabIndex={0}
                  aria-selected={activeFile === key}
                  className={s.tabLabel}
                  onClick={() => handleTabClick(key)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleTabClick(key); }}
                >
                  <span className="codicon codicon-file" />
                  {sample.fileName}
                </span>
                {canClose && (
                  <button
                    type="button"
                    className={s.tabClose}
                    aria-label={`Close ${sample.fileName}`}
                    onClick={() => handleCloseTab(key)}
                  >
                    <span className="codicon codicon-close" />
                  </button>
                )}
              </div>
            );
          })}
          {localFileName && (
            <div className={`${s.tab}${isLocalFile ? ` ${s.tabActive}` : ""}`}>
              <span
                role="tab"
                tabIndex={0}
                aria-selected={isLocalFile}
                className={s.tabLabel}
                onClick={() => handleTabClick(LOCAL_FILE_KEY)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleTabClick(LOCAL_FILE_KEY); }}
              >
                <span className="codicon codicon-file" />
                {localFileName}
              </span>
              {canClose && (
                <button
                  type="button"
                  className={s.tabClose}
                  aria-label={`Close ${localFileName}`}
                  onClick={() => handleCloseTab(LOCAL_FILE_KEY)}
                >
                  <span className="codicon codicon-close" />
                </button>
              )}
            </div>
          )}
        </div>
        <div className={s.tabsActions}>
          {FILE_ACCESS && isLocalFile && (
            <TooltipTrigger placement="bottom">
              <ActionButton isQuiet onPress={handleSave} aria-label="保存">
                <span className="codicon codicon-save" />
              </ActionButton>
              <Tooltip>保存</Tooltip>
            </TooltipTrigger>
          )}
          <TooltipTrigger placement="bottom">
            <ActionButton isQuiet onPress={handleFormat} aria-label="フォーマット">
              <span className="codicon codicon-list-flat" />
            </ActionButton>
            <Tooltip>フォーマット</Tooltip>
          </TooltipTrigger>
          <DialogTrigger isDismissable>
            <TooltipTrigger placement="bottom">
              <ActionButton isQuiet aria-label="エディター設定">
                <span className="codicon codicon-settings-gear" />
              </ActionButton>
              <Tooltip>エディター設定</Tooltip>
            </TooltipTrigger>
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
          </DialogTrigger>
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
          }}
        />
      </div>
      </div>
    </Provider>
  );
}
