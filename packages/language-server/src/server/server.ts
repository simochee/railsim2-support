import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
  Diagnostic as LspDiagnostic,
  DiagnosticSeverity as LspSeverity,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as path from "node:path";
import { parse } from "./parser.js";
import { getCompletions } from "./completionProvider.js";
import { getHover } from "./hoverProvider.js";
import { tokenize } from "./tokenizer.js";
import { validateUnknownKeywords } from "./validator/unknownKeywordValidator.js";
import { validateSchema } from "./validator/schemaValidator.js";
import type { FileNode } from "../shared/ast.js";
import type { Token } from "../shared/tokens.js";
import type { Diagnostic } from "../shared/diagnostics.js";
import type { Range } from "../shared/tokens.js";

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// ---------------------------------------------------------------------------
// Parse cache — ドキュメントごとにパース結果を保持
// ---------------------------------------------------------------------------

interface ParseCache {
  version: number;
  file: FileNode;
  tokens: Token[];
  diagnostics: Diagnostic[];
}

const parseCache = new Map<string, ParseCache>();

function getOrParse(doc: TextDocument): ParseCache {
  const cached = parseCache.get(doc.uri);
  if (cached && cached.version === doc.version) return cached;

  const text = doc.getText();
  const fileName = path.basename(new URL(doc.uri).pathname);
  const { file, diagnostics: parseDiags } = parse(text);
  const tokens = tokenize(text);
  const keywordDiags = validateUnknownKeywords(file);
  const schemaDiags = validateSchema(file, fileName);

  const entry: ParseCache = {
    version: doc.version,
    file,
    tokens,
    diagnostics: [...parseDiags, ...keywordDiags, ...schemaDiags],
  };
  parseCache.set(doc.uri, entry);
  return entry;
}

// ---------------------------------------------------------------------------

connection.onInitialize(() => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Full,
    completionProvider: {
      resolveProvider: false,
    },
    hoverProvider: true,
  },
}));

export function validateTextDocument(text: string, fileName?: string): Diagnostic[] {
  const { file, diagnostics: parseDiags } = parse(text);
  const keywordDiags = validateUnknownKeywords(file);
  const schemaDiags = validateSchema(file, fileName);
  return [...parseDiags, ...keywordDiags, ...schemaDiags];
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

  const fileName = path.basename(new URL(params.textDocument.uri).pathname);
  const cached = getOrParse(doc);
  return getCompletions(cached.file, cached.tokens, params.position, fileName);
});

documents.onDidClose((event) => {
  parseCache.delete(event.document.uri);
});

connection.onHover((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;

  const text = doc.getText();
  const { file } = parse(text);

  return getHover(file, params.position);
});

documents.listen(connection);
connection.listen();
