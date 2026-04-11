import {
  TextDocuments,
  TextDocumentSyncKind,
  DiagnosticSeverity as LspSeverity,
} from "vscode-languageserver";
import type {
  Connection,
  Diagnostic as LspDiagnostic,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { URI, Utils } from "vscode-uri";
import { parse } from "./parser.js";
import { getCompletions } from "./completionProvider.js";
import { getHover } from "./hoverProvider.js";
import { tokenize } from "./tokenizer.js";
import { validateUnknownKeywords } from "./validator/unknownKeywordValidator.js";
import { validateSchema } from "./validator/schemaValidator.js";
import { buildSwitchIndex } from "./switchSymbols.js";
import { validateSwitches } from "./validator/switchValidator.js";
import { format } from "./formatter.js";
import { getInlayHints } from "./inlayHintProvider.js";
import type { FileNode } from "../shared/ast.js";
import type { SwitchIndex } from "./switchSymbols.js";
import type { Token } from "../shared/tokens.js";
import type { Diagnostic } from "../shared/diagnostics.js";
import type { Range } from "../shared/tokens.js";

// ---------------------------------------------------------------------------
// Parse cache — ドキュメントごとにパース結果を保持
// ---------------------------------------------------------------------------

interface ParseCache {
  version: number;
  file: FileNode;
  tokens: Token[];
  diagnostics: Diagnostic[];
  switchIndex: SwitchIndex;
}

export function startServer(connection: Connection): void {
  const documents = new TextDocuments(TextDocument);
  const parseCache = new Map<string, ParseCache>();

  function getOrParse(doc: TextDocument): ParseCache {
    const cached = parseCache.get(doc.uri);
    if (cached && cached.version === doc.version) return cached;

    const text = doc.getText();
    const fileName = Utils.basename(URI.parse(doc.uri));
    const { file, diagnostics: parseDiags } = parse(text);
    const tokens = tokenize(text);
    const keywordDiags = validateUnknownKeywords(file);
    const schemaDiags = validateSchema(file);
    const switchIndex = buildSwitchIndex(file);
    const switchDiags = validateSwitches(file, switchIndex);

    const entry: ParseCache = {
      version: doc.version,
      file,
      tokens,
      diagnostics: [...parseDiags, ...keywordDiags, ...schemaDiags, ...switchDiags],
      switchIndex,
    };
    parseCache.set(doc.uri, entry);
    return entry;
  }

  connection.onInitialize(() => ({
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['"'],
      },
      hoverProvider: true,
      inlayHintProvider: true,
      documentFormattingProvider: true,
    },
  }));

  documents.onDidOpen((event) => {
    const cached = getOrParse(event.document);
    const lspDiags: LspDiagnostic[] = cached.diagnostics.map((d) => ({
      range: toLspRange(d.range),
      severity: toLspSeverity(d.severity),
      source: "railsim2",
      message: d.message,
    }));
    connection.sendDiagnostics({ uri: event.document.uri, diagnostics: lspDiags });
  });

  documents.onDidChangeContent((change) => {
    const cached = getOrParse(change.document);
    const lspDiags: LspDiagnostic[] = cached.diagnostics.map((d) => ({
      range: toLspRange(d.range),
      severity: toLspSeverity(d.severity),
      source: "railsim2",
      message: d.message,
    }));
    connection.sendDiagnostics({ uri: change.document.uri, diagnostics: lspDiags });
  });

  connection.onCompletion((params) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];

    const fileName = Utils.basename(URI.parse(params.textDocument.uri));
    const cached = getOrParse(doc);
    return getCompletions(cached.file, cached.tokens, params.position, fileName, cached.switchIndex);
  });

  documents.onDidClose((event) => {
    parseCache.delete(event.document.uri);
  });

  connection.onDocumentFormatting((params) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];

    const text = doc.getText();
    const formatted = format(text, {
      indentChar: params.options.insertSpaces ? " " : "\t",
      indentSize: params.options.insertSpaces ? params.options.tabSize : 1,
    });

    if (formatted === text) return [];

    const lastLine = doc.lineCount > 0 ? doc.lineCount - 1 : 0;
    const lastChar = doc.getText().length - doc.offsetAt({ line: lastLine, character: 0 });

    return [
      {
        range: {
          start: { line: 0, character: 0 },
          end: { line: lastLine, character: lastChar },
        },
        newText: formatted,
      },
    ];
  });

  connection.languages.inlayHint.on((params) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];
    const cached = getOrParse(doc);
    return getInlayHints(cached.file, cached.switchIndex, params.range);
  });

  connection.onHover((params) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;
    const cached = getOrParse(doc);
    return getHover(cached.file, params.position);
  });

  documents.listen(connection);
  connection.listen();
}

// ---------------------------------------------------------------------------
// Helpers (exported for tests)
// ---------------------------------------------------------------------------

export function validateTextDocument(text: string): Diagnostic[] {
  const { file, diagnostics: parseDiags } = parse(text);
  const keywordDiags = validateUnknownKeywords(file);
  const schemaDiags = validateSchema(file);
  const switchIndex = buildSwitchIndex(file);
  const switchDiags = validateSwitches(file, switchIndex);
  return [...parseDiags, ...keywordDiags, ...schemaDiags, ...switchDiags];
}

export function toLspRange(range: Range) {
  return {
    start: { line: range.start.line, character: range.start.character },
    end: { line: range.end.line, character: range.end.character },
  };
}

export function toLspSeverity(severity: string): LspSeverity {
  switch (severity) {
    case "error":
      return LspSeverity.Error;
    case "warning":
      return LspSeverity.Warning;
    case "info":
      return LspSeverity.Information;
    default:
      return LspSeverity.Error;
  }
}
