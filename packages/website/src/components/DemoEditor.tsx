import { useRef, useState, useCallback, useEffect } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import type { ProtocolConnection } from "vscode-languageserver-protocol/browser";
import { setupGrammar } from "../lib/grammar";
import { startLsp, disposeLsp, openDocument, closeDocument, changeDocument, registerProviders, applyDiagnostics, formatDocument } from "../lib/lsp";

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

export function DemoEditor({ samples, grammar, langConf }: Props) {
  const [activeFile, setActiveFile] = useState(samples[0].fileName);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const modelsRef = useRef<Map<string, editor.ITextModel>>(new Map());
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const connRef = useRef<ProtocolConnection | null>(null);
  const disposedRef = useRef(false);

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

      let version = 2;
      ed.onDidChangeModelContent(() => {
        const model = ed.getModel();
        if (model) {
          changeDocument(conn, model.uri.toString(), version++, model.getValue());
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
      formatDocument(conn, monaco, ed);
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const fileName = e.target.value;
      setActiveFile(fileName);
      const conn = connRef.current;
      const oldModel = editorRef.current?.getModel();
      if (oldModel && conn) {
        closeDocument(conn, oldModel.uri.toString());
      }
      const model = modelsRef.current.get(fileName);
      if (model && editorRef.current) {
        editorRef.current.setModel(model);
      }
      if (model && conn) {
        openDocument(conn, model.uri.toString(), "railsim2", model.getValue());
      }
    },
    [],
  );

  useEffect(() => {
    return () => {
      disposedRef.current = true;
      connRef.current = null;
      disposeLsp();
      for (const model of modelsRef.current.values()) {
        model.dispose();
      }
      modelsRef.current.clear();
    };
  }, []);

  return (
    <>
      <div className="demo-header">
        <label htmlFor="file-select">File:</label>
        <select
          id="file-select"
          value={activeFile}
          onChange={handleFileChange}
        >
          {samples.map((s) => (
            <option key={s.fileName} value={s.fileName}>
              {s.fileName}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="demo-format-btn"
          onClick={handleFormat}
        >
          Format
        </button>
      </div>
      <div className="editor-wrapper">
        <Editor
          theme="vs-dark"
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </>
  );
}
