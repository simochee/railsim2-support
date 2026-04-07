import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
  Diagnostic as LspDiagnostic,
  DiagnosticSeverity as LspSeverity,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { parse } from "./parser.js";
import { validateUnknownKeywords } from "./validator/unknownKeywordValidator.js";
import type { Diagnostic } from "../shared/diagnostics.js";
import type { Range } from "../shared/tokens.js";

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

connection.onInitialize(() => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Full,
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

export function validateTextDocument(text: string): Diagnostic[] {
  const { file, diagnostics: parseDiags } = parse(text);
  const keywordDiags = validateUnknownKeywords(file);
  return [...parseDiags, ...keywordDiags];
}

documents.onDidChangeContent((change) => {
  const text = change.document.getText();
  const diags = validateTextDocument(text);
  const lspDiags: LspDiagnostic[] = diags.map((d) => ({
    range: toLspRange(d.range),
    severity: toLspSeverity(d.severity),
    source: "railsim2",
    message: d.message,
  }));
  connection.sendDiagnostics({ uri: change.document.uri, diagnostics: lspDiags });
});

documents.listen(connection);
connection.listen();
