export type AbcDiagnosticSeverity = "error" | "warning" | "suggestion";

export interface AbcDiagnostic {
  severity: AbcDiagnosticSeverity;
  source: "abcjs" | "chatmusic";
  title: string;
  message: string;
  line?: number;
  column?: number;
  rawMessage?: string;
}

export interface AbcQualityReport {
  status: "ok" | "warning" | "error";
  tuneCount: number;
  diagnostics: AbcDiagnostic[];
}