import { useRef, useState, useCallback, useEffect } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import type { ProtocolConnection } from "vscode-languageserver-protocol/browser";
import "@vscode/codicons/dist/codicon.css";
import { VSCodeButton, VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react";
import { setupGrammar } from "../lib/grammar";
import { startLsp, disposeLsp, openDocument, closeDocument, changeDocument, registerProviders, applyDiagnostics, formatDocument, type FormatOptions } from "../lib/lsp";
import { isFileAccessSupported, openFile, saveFile, type OpenedFile } from "../lib/file-access";

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

interface EditorSettings {
  insertSpaces: boolean;
  tabSize: number;
}

function loadSettings(): EditorSettings {
  const defaults: EditorSettings = { insertSpaces: false, tabSize: 4 };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (typeof parsed.insertSpaces !== "boolean") return defaults;
    if (typeof parsed.tabSize !== "number" || !VALID_TAB_SIZES.includes(parsed.tabSize)) return defaults;
    return { insertSpaces: parsed.insertSpaces, tabSize: parsed.tabSize };
  } catch {
    return defaults;
  }
}

function saveSettings(settings: EditorSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors (private browsing, quota exceeded, etc.)
  }
}

export function DemoEditor({ samples, grammar, langConf }: Props) {
  const [initialSettings] = useState(loadSettings);
  const [activeFile, setActiveFile] = useState(samples[0].fileName);
  const [localFileName, setLocalFileName] = useState<string | null>(null);
  const [insertSpaces, setInsertSpaces] = useState(initialSettings.insertSpaces);
  const [tabSize, setTabSize] = useState(initialSettings.tabSize);
  const [showIndentPopover, setShowIndentPopover] = useState(false);
  const indentBtnRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
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

    const firstModel = modelsRef.current.get(samples[0].fileName);
    if (firstModel) ed.setModel(firstModel);
    ed.updateOptions({ insertSpaces: formatOptionsRef.current.insertSpaces, tabSize: formatOptionsRef.current.tabSize });

    // Cmd+S / Ctrl+S で保存
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

  const updateSettings = useCallback((newInsertSpaces: boolean, newTabSize: number) => {
    setInsertSpaces(newInsertSpaces);
    setTabSize(newTabSize);
    const settings: EditorSettings = { insertSpaces: newInsertSpaces, tabSize: newTabSize };
    formatOptionsRef.current = settings;
    saveSettings(settings);
    // Apply to Monaco editor and all models
    const ed = editorRef.current;
    if (ed) {
      ed.updateOptions({ insertSpaces: newInsertSpaces, tabSize: newTabSize });
    }
    for (const model of modelsRef.current.values()) {
      model.updateOptions({ insertSpaces: newInsertSpaces, tabSize: newTabSize });
    }
  }, []);

  const handleInsertSpacesChange = useCallback(
    (e: Event | React.FormEvent<HTMLElement>) => {
      const target = e.target as HTMLElement & { value: string };
      const spaces = target.value === "spaces";
      updateSettings(spaces, tabSize);
    },
    [tabSize, updateSettings],
  );

  const handleTabSizeChange = useCallback(
    (e: Event | React.FormEvent<HTMLElement>) => {
      const target = e.target as HTMLElement & { value: string };
      const size = Number(target.value);
      updateSettings(insertSpaces, size);
    },
    [insertSpaces, updateSettings],
  );

  const handleTabClick = useCallback(
    (key: string) => {
      setActiveFile(key);
      switchToModel(key);
    },
    [switchToModel],
  );

  const handleCloseLocalTab = useCallback(() => {
    const conn = connRef.current;
    const prevModel = modelsRef.current.get(LOCAL_FILE_KEY);
    if (prevModel) {
      if (conn) closeDocument(conn, prevModel.uri.toString());
      prevModel.dispose();
      modelsRef.current.delete(LOCAL_FILE_KEY);
    }
    openedFileRef.current = null;
    setLocalFileName(null);
    const firstKey = samples[0].fileName;
    setActiveFile(firstKey);
    switchToModel(firstKey);
  }, [samples, switchToModel]);

  const handleOpen = useCallback(async () => {
    const monaco = monacoRef.current;
    if (!monaco) return;

    try {
      const opened = await openFile();
      openedFileRef.current = opened;

      // Dispose previous local model if exists
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
      // User cancelled the picker
      if (e instanceof DOMException && e.name === "AbortError") return;
      console.warn("Failed to open file:", e);
    }
  }, [switchToModel]);

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

  // Close popover on click-outside or Escape
  useEffect(() => {
    if (!showIndentPopover) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current && !popoverRef.current.contains(target) &&
        indentBtnRef.current && !indentBtnRef.current.contains(target)
      ) {
        setShowIndentPopover(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowIndentPopover(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showIndentPopover]);

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
  const indentLabel = insertSpaces ? `Spaces: ${tabSize}` : `Tab Size: ${tabSize}`;

  return (
    <>
      <div className="demo-header">
        <span className="indent-btn-wrapper" ref={indentBtnRef}>
          <VSCodeButton
            appearance="secondary"
            onClick={() => setShowIndentPopover((v) => !v)}
          >
            {indentLabel}
          </VSCodeButton>
          {showIndentPopover && (
            <div className="indent-popover" ref={popoverRef}>
              <div className="indent-popover-row">
                <label>Indent:</label>
                <VSCodeDropdown value={insertSpaces ? "spaces" : "tab"} onChange={handleInsertSpacesChange}>
                  <VSCodeOption value="tab">Tab</VSCodeOption>
                  <VSCodeOption value="spaces">Spaces</VSCodeOption>
                </VSCodeDropdown>
              </div>
              <div className="indent-popover-row">
                <label>Size:</label>
                <VSCodeDropdown value={String(tabSize)} onChange={handleTabSizeChange}>
                  <VSCodeOption value="1">1</VSCodeOption>
                  <VSCodeOption value="2">2</VSCodeOption>
                  <VSCodeOption value="4">4</VSCodeOption>
                  <VSCodeOption value="8">8</VSCodeOption>
                </VSCodeDropdown>
              </div>
            </div>
          )}
        </span>
        <VSCodeButton appearance="secondary" onClick={handleFormat}>
          <span className="codicon codicon-list-flat" slot="start" />
          Format
        </VSCodeButton>
        {FILE_ACCESS && (
          <>
            <span className="demo-separator" />
            <VSCodeButton appearance="secondary" onClick={handleOpen}>
              <span className="codicon codicon-folder-opened" slot="start" />
              Open
            </VSCodeButton>
            {isLocalFile && (
              <VSCodeButton appearance="secondary" onClick={handleSave}>
                <span className="codicon codicon-save" slot="start" />
                Save
              </VSCodeButton>
            )}
          </>
        )}
      </div>
      <div className="demo-tabs" role="tablist">
        {samples.map((s) => (
          <div key={s.fileName} className={`demo-tab${activeFile === s.fileName ? " demo-tab-active" : ""}`}>
            <span
              role="tab"
              tabIndex={0}
              aria-selected={activeFile === s.fileName}
              className="demo-tab-label"
              onClick={() => handleTabClick(s.fileName)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleTabClick(s.fileName); }}
            >
              <span className="codicon codicon-file" />
              {s.fileName}
            </span>
          </div>
        ))}
        {localFileName && (
          <div className={`demo-tab${isLocalFile ? " demo-tab-active" : ""}`}>
            <span
              role="tab"
              tabIndex={0}
              aria-selected={isLocalFile}
              className="demo-tab-label"
              onClick={() => handleTabClick(LOCAL_FILE_KEY)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleTabClick(LOCAL_FILE_KEY); }}
            >
              <span className="codicon codicon-file" />
              {localFileName}
            </span>
            <button
              type="button"
              className="demo-tab-close"
              aria-label={`Close ${localFileName}`}
              onClick={handleCloseLocalTab}
            >
              <span className="codicon codicon-close" />
            </button>
          </div>
        )}
      </div>
      <div className="editor-wrapper">
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
    </>
  );
}
