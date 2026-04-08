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
import { tokenize } from "./tokenizer.js";
import { validateUnknownKeywords } from "./validator/unknownKeywordValidator.js";
import { validateSchema } from "./validator/schemaValidator.js";
import type { Diagnostic } from "../shared/diagnostics.js";
import type { Range } from "../shared/tokens.js";

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

connection.onInitialize(() => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Full,
    completionProvider: {
      resolveProvider: false,
    },
  },
}));

export function toLspRange(range: Range) {
  return {
    start: { line: range.start.line, character: range.start.character },
    end: { line: range.end.line, character: range.end.character },
  };
}

export function toLspSeverity(severity: string): LspSeverity {
  switch (severity) {
    case "error": return LspSeverity.Error;
    case "warning": return LspSeverity.Warning;
    case "info": return LspSeverity.Information;
    default: return LspSeverity.Error;
  }
}

export function validateTextDocument(text: string, fileName?: string): Diagnostic[] {
  const { file, diagnostics: parseDiags } = parse(text);
  const keywordDiags = validateUnknownKeywords(file);
  const schemaDiags = validateSchema(file, fileName);
  return [...parseDiags, ...keywordDiags, ...schemaDiags];
}

documents.onDidChangeContent((change) => {
  const text = change.document.getText();
  const fileName = path.basename(new URL(change.document.uri).pathname);
  const diags = validateTextDocument(text, fileName);
  const lspDiags: LspDiagnostic[] = diags.map((d) => ({
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

  const text = doc.getText();
  const fileName = path.basename(new URL(params.textDocument.uri).pathname);
  const { file } = parse(text);
  const tokens = tokenize(text);

  return getCompletions(file, tokens, params.position, fileName);
});

documents.listen(connection);
connection.listen();
