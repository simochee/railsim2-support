import {
  createProtocolConnection,
  BrowserMessageReader,
  BrowserMessageWriter,
  InitializeRequest,
  InitializedNotification,
  DidOpenTextDocumentNotification,
  DidCloseTextDocumentNotification,
  DidChangeTextDocumentNotification,
  CompletionRequest,
  HoverRequest,
  InlayHintRequest,
  DocumentFormattingRequest,
  PublishDiagnosticsNotification,
  type ProtocolConnection,
  type PublishDiagnosticsParams,
  type CompletionItem as LspCompletionItem,
  type InlayHint as LspInlayHint,
  type Diagnostic as LspDiagnostic,
  CompletionItemKind as LspCompletionItemKind,
  InlayHintKind as LspInlayHintKind,
  DiagnosticSeverity as LspDiagnosticSeverity,
} from "vscode-languageserver-protocol/browser";
import type * as Monaco from "monaco-editor";

let connection: ProtocolConnection | null = null;
let worker: Worker | null = null;
let initPromise: Promise<ProtocolConnection> | null = null;

export async function startLsp(): Promise<ProtocolConnection> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      worker = new Worker("/server.browser.js");
      const reader = new BrowserMessageReader(worker);
      const writer = new BrowserMessageWriter(worker);
      connection = createProtocolConnection(reader, writer);

      connection.listen();

      await connection.sendRequest(InitializeRequest.type, {
        processId: null,
        capabilities: {
          textDocument: {
            completion: { completionItem: { snippetSupport: false } },
            hover: { contentFormat: ["plaintext", "markdown"] },
            inlayHint: {},
            publishDiagnostics: {},
          },
        },
        rootUri: null,
      });

      connection.sendNotification(InitializedNotification.type, {});
      return connection;
    } catch (e) {
      connection?.dispose();
      worker?.terminate();
      connection = null;
      worker = null;
      initPromise = null;
      throw e;
    }
  })();

  return initPromise;
}

export function disposeLsp(): void {
  connection?.dispose();
  worker?.terminate();
  connection = null;
  worker = null;
  initPromise = null;
}

export function openDocument(conn: ProtocolConnection, uri: string, languageId: string, text: string): void {
  conn.sendNotification(DidOpenTextDocumentNotification.type, {
    textDocument: { uri, languageId, version: 1, text },
  });
}

export function closeDocument(conn: ProtocolConnection, uri: string): void {
  conn.sendNotification(DidCloseTextDocumentNotification.type, {
    textDocument: { uri },
  });
}

export function changeDocument(conn: ProtocolConnection, uri: string, version: number, text: string): void {
  conn.sendNotification(DidChangeTextDocumentNotification.type, {
    textDocument: { uri, version },
    contentChanges: [{ text }],
  });
}

export function registerProviders(
  monaco: typeof Monaco,
  conn: ProtocolConnection,
  onDiagnostics: (params: PublishDiagnosticsParams) => void,
): Monaco.IDisposable[] {
  const disposables: Monaco.IDisposable[] = [];

  disposables.push(
    monaco.languages.registerCompletionItemProvider("railsim2", {
      triggerCharacters: ['"'],
      provideCompletionItems: async (model, position) => {
        try {
          const result = await conn.sendRequest(CompletionRequest.type, {
            textDocument: { uri: model.uri.toString() },
            position: { line: position.lineNumber - 1, character: position.column - 1 },
          });
          if (!result) return { suggestions: [] };

          const items = Array.isArray(result) ? result : result.items;
          return {
            suggestions: items.map((item: LspCompletionItem) => ({
              label: item.label,
              kind: mapCompletionItemKind(monaco, item.kind),
              insertText: item.insertText ?? item.label,
              detail: item.detail,
              documentation: item.documentation,
              range: undefined!,
            })),
          };
        } catch {
          return { suggestions: [] };
        }
      },
    }),
  );

  disposables.push(
    monaco.languages.registerHoverProvider("railsim2", {
      provideHover: async (model, position) => {
        try {
          const result = await conn.sendRequest(HoverRequest.type, {
            textDocument: { uri: model.uri.toString() },
            position: { line: position.lineNumber - 1, character: position.column - 1 },
          });
          if (!result) return null;

          const contents = Array.isArray(result.contents)
            ? result.contents.map((c) => typeof c === "string" ? { value: c } : c)
            : typeof result.contents === "string"
              ? [{ value: result.contents }]
              : [result.contents];

          return {
            contents,
            range: result.range
              ? new monaco.Range(
                  result.range.start.line + 1,
                  result.range.start.character + 1,
                  result.range.end.line + 1,
                  result.range.end.character + 1,
                )
              : undefined,
          };
        } catch {
          return null;
        }
      },
    }),
  );

  disposables.push(
    monaco.languages.registerInlayHintsProvider("railsim2", {
      provideInlayHints: async (model, range) => {
        try {
          const result = await conn.sendRequest(InlayHintRequest.type, {
            textDocument: { uri: model.uri.toString() },
            range: {
              start: { line: range.startLineNumber - 1, character: range.startColumn - 1 },
              end: { line: range.endLineNumber - 1, character: range.endColumn - 1 },
            },
          });
          if (!result) return { hints: [], dispose: () => {} };

          return {
            hints: result.map((hint: LspInlayHint) => ({
              label: typeof hint.label === "string" ? hint.label : hint.label.map((p) => p.value).join(""),
              position: new monaco.Position(hint.position.line + 1, hint.position.character + 1),
              kind: hint.kind === LspInlayHintKind.Parameter
                ? monaco.languages.InlayHintKind.Parameter
                : hint.kind === LspInlayHintKind.Type
                  ? monaco.languages.InlayHintKind.Type
                  : monaco.languages.InlayHintKind.Parameter,
              paddingLeft: hint.paddingLeft,
              paddingRight: hint.paddingRight,
            })),
            dispose: () => {},
          };
        } catch {
          return { hints: [], dispose: () => {} };
        }
      },
    }),
  );

  conn.onNotification(PublishDiagnosticsNotification.type, onDiagnostics);

  return disposables;
}

function mapCompletionItemKind(
  monaco: typeof Monaco,
  kind?: LspCompletionItemKind,
): Monaco.languages.CompletionItemKind {
  const map: Record<number, Monaco.languages.CompletionItemKind> = {
    [LspCompletionItemKind.Property]: monaco.languages.CompletionItemKind.Property,
    [LspCompletionItemKind.Keyword]: monaco.languages.CompletionItemKind.Keyword,
    [LspCompletionItemKind.Value]: monaco.languages.CompletionItemKind.Value,
    [LspCompletionItemKind.Snippet]: monaco.languages.CompletionItemKind.Snippet,
    [LspCompletionItemKind.Text]: monaco.languages.CompletionItemKind.Text,
    [LspCompletionItemKind.Variable]: monaco.languages.CompletionItemKind.Variable,
    [LspCompletionItemKind.Constant]: monaco.languages.CompletionItemKind.Constant,
    [LspCompletionItemKind.EnumMember]: monaco.languages.CompletionItemKind.EnumMember,
    [LspCompletionItemKind.Class]: monaco.languages.CompletionItemKind.Class,
  };
  return map[kind ?? 0] ?? monaco.languages.CompletionItemKind.Text;
}

export function mapDiagnosticSeverity(
  monaco: typeof Monaco,
  severity?: LspDiagnosticSeverity,
): Monaco.MarkerSeverity {
  switch (severity) {
    case LspDiagnosticSeverity.Error: return monaco.MarkerSeverity.Error;
    case LspDiagnosticSeverity.Warning: return monaco.MarkerSeverity.Warning;
    case LspDiagnosticSeverity.Information: return monaco.MarkerSeverity.Info;
    case LspDiagnosticSeverity.Hint: return monaco.MarkerSeverity.Hint;
    default: return monaco.MarkerSeverity.Info;
  }
}

export function applyDiagnostics(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel,
  diagnostics: LspDiagnostic[],
): void {
  const markers = diagnostics.map((d) => ({
    severity: mapDiagnosticSeverity(monaco, d.severity),
    message: d.message,
    startLineNumber: d.range.start.line + 1,
    startColumn: d.range.start.character + 1,
    endLineNumber: d.range.end.line + 1,
    endColumn: d.range.end.character + 1,
  }));
  monaco.editor.setModelMarkers(model, "railsim2-lsp", markers);
}

export interface FormatOptions {
  tabSize: number;
  insertSpaces: boolean;
}

export async function formatDocument(
  conn: ProtocolConnection,
  monaco: typeof Monaco,
  editor: Monaco.editor.ICodeEditor,
  options: FormatOptions,
): Promise<void> {
  const model = editor.getModel();
  if (!model) return;

  try {
    const edits = await conn.sendRequest(DocumentFormattingRequest.type, {
      textDocument: { uri: model.uri.toString() },
      options,
    });
    if (!edits || edits.length === 0) return;

    const monacoEdits = edits.map((edit) => ({
      range: new monaco.Range(
        edit.range.start.line + 1,
        edit.range.start.character + 1,
        edit.range.end.line + 1,
        edit.range.end.character + 1,
      ),
      text: edit.newText,
    }));
    editor.executeEdits("railsim2-format", monacoEdits);
  } catch {
    console.warn("Failed to format document");
  }
}
