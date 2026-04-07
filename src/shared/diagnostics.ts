import type { Range } from "./tokens.js";
import type { FileNode } from "./ast.js";

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface Diagnostic {
  message: string;
  range: Range;
  severity: DiagnosticSeverity;
}

export interface ParseResult {
  file: FileNode;
  diagnostics: Diagnostic[];
}
