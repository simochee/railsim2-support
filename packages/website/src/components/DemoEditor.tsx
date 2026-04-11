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

export function DemoEditor({ samples, grammar, langConf }: Props) {
  const [activeFile, setActiveFile] = useState(samples[0].fileName);
  const [localFileName, setLocalFileName] = useState<string | null>(null);
  const [insertSpaces, setInsertSpaces] = useState(false);
  const [tabSize, setTabSize] = useState(1);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const modelsRef = useRef<Map<string, editor.ITextModel>>(new Map());
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const connRef = useRef<ProtocolConnection | null>(null);
  const disposedRef = useRef(false);
  const openedFileRef = useRef<OpenedFile | null>(null);
  const versionRef = useRef(2);
  const formatOptionsRef = useRef<FormatOptions>({ tabSize: 1, insertSpaces: false });

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
      modelsRef.current.set(sample.fileName, model);
    }

    const firstModel = modelsRef.current.get(samples[0].fileName);
    if (firstModel) ed.setModel(firstModel);

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

  const handleInsertSpacesChange = useCallback(
    (e: Event | React.FormEvent<HTMLElement>) => {
      const target = e.target as HTMLElement & { value: string };
      const spaces = target.value === "spaces";
      setInsertSpaces(spaces);
      setTabSize(spaces ? 2 : 1);
      formatOptionsRef.current = {
        insertSpaces: spaces,
        tabSize: spaces ? 2 : 1,
      };
    },
    [],
  );

  const handleTabSizeChange = useCallback(
    (e: Event | React.FormEvent<HTMLElement>) => {
      const target = e.target as HTMLElement & { value: string };
      const size = Number(target.value);
      setTabSize(size);
      formatOptionsRef.current = { ...formatOptionsRef.current, tabSize: size };
    },
    [],
  );

  const handleFileChange = useCallback(
    (e: Event | React.FormEvent<HTMLElement>) => {
      const target = e.target as HTMLElement & { value: string };
      const key = target.value;
      setActiveFile(key);
      switchToModel(key);
    },
    [switchToModel],
  );

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

  return (
    <>
      <div className="demo-header">
        <label htmlFor="file-select">File:</label>
        <VSCodeDropdown id="file-select" value={activeFile} onChange={handleFileChange}>
          {samples.map((s) => (
            <VSCodeOption key={s.fileName} value={s.fileName}>
              {s.fileName}
            </VSCodeOption>
          ))}
          {localFileName && (
            <VSCodeOption value={LOCAL_FILE_KEY}>
              {localFileName}
            </VSCodeOption>
          )}
        </VSCodeDropdown>
        <span className="demo-separator" />
        <VSCodeDropdown value={insertSpaces ? "spaces" : "tab"} onChange={handleInsertSpacesChange}>
          <VSCodeOption value="tab">Tab</VSCodeOption>
          <VSCodeOption value="spaces">Spaces</VSCodeOption>
        </VSCodeDropdown>
        {insertSpaces && (
          <VSCodeDropdown value={String(tabSize)} onChange={handleTabSizeChange}>
            <VSCodeOption value="2">2</VSCodeOption>
            <VSCodeOption value="4">4</VSCodeOption>
            <VSCodeOption value="8">8</VSCodeOption>
          </VSCodeDropdown>
        )}
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
      <div className="editor-wrapper">
        <Editor
          theme="vs-dark"
          onMount={handleMount}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            scrollBeyondLastLine: true,
            automaticLayout: true,
          }}
        />
      </div>
    </>
  );
}
