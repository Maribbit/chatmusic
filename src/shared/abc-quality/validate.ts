import abcjs from "abcjs";
import type { AbcDiagnostic, AbcQualityReport } from "./diagnostics";

const ABCJS_LINE_WARNING_PATTERN = /^(.*?Line):(\d+):(\d+):\s*(.*)$/;

export function validateAbcSource(source: string): AbcQualityReport {
  if (!source.trim()) {
    return createReport(0, [
      {
        severity: "error",
        source: "chatmusic",
        title: "Empty ABC source",
        message: "Add or import ABC notation before checking it.",
      },
    ]);
  }

  try {
    const tunes = abcjs.parseOnly(source, {
      generate_warnings: true,
    } as unknown as abcjs.AbcVisualParams) as abcjs.TuneObject[];
    const diagnostics = tunes.flatMap((tune) =>
      (tune.warnings ?? []).map(createAbcjsDiagnostic)
    );

    if (tunes.length === 0) {
      diagnostics.push({
        severity: "error",
        source: "abcjs",
        title: "No tune parsed",
        message: "abcjs did not find a complete tune in this source.",
      });
    }

    return createReport(tunes.length, diagnostics);
  } catch (error) {
    return createReport(0, [
      {
        severity: "error",
        source: "abcjs",
        title: "abcjs parse failed",
        message: getErrorMessage(error),
      },
    ]);
  }
}

function createReport(
  tuneCount: number,
  diagnostics: AbcDiagnostic[]
): AbcQualityReport {
  const hasError = diagnostics.some((diagnostic) => diagnostic.severity === "error");
  const hasWarning = diagnostics.some(
    (diagnostic) => diagnostic.severity === "warning"
  );

  return {
    status: hasError ? "error" : hasWarning ? "warning" : "ok",
    tuneCount,
    diagnostics,
  };
}

function createAbcjsDiagnostic(rawMessage: string): AbcDiagnostic {
  const message = sanitizeAbcjsWarning(rawMessage);
  const match = ABCJS_LINE_WARNING_PATTERN.exec(message);

  if (!match) {
    return {
      severity: "warning",
      source: "abcjs",
      title: "abcjs parser warning",
      message,
      rawMessage,
    };
  }

  const [, scope, line, column, detail] = match;

  return {
    severity: "warning",
    source: "abcjs",
    title: getDiagnosticTitle(detail),
    message: `${scope}: ${detail}`,
    line: Number(line),
    column: Number(column),
    rawMessage,
  };
}

export function sanitizeAbcjsWarning(rawMessage: string): string {
  return decodeHtmlEntities(rawMessage.replace(/<[^>]*>/g, "")).replace(
    /\s+/g,
    " "
  ).trim();
}

export function formatAbcQualityReportForAi(report: AbcQualityReport): string {
  if (report.status === "ok") {
    return `abcjs parsed this ABC source without parser warnings (${report.tuneCount} tune${report.tuneCount === 1 ? "" : "s"}).`;
  }

  const lines = [
    "Please help fix this ABC notation. abcjs reported the following parser feedback:",
    "",
  ];

  for (const diagnostic of report.diagnostics) {
    const location = formatDiagnosticLocation(diagnostic);
    lines.push(
      `- ${diagnostic.severity.toUpperCase()}: ${diagnostic.title}${location ? ` (${location})` : ""}`
    );
    lines.push(`  ${diagnostic.message}`);
  }

  return lines.join("\n");
}

function formatDiagnosticLocation(diagnostic: AbcDiagnostic): string | null {
  if (diagnostic.line === undefined) return null;
  if (diagnostic.column === undefined) return `line ${diagnostic.line}`;
  return `line ${diagnostic.line}, column ${diagnostic.column}`;
}

function getDiagnosticTitle(message: string): string {
  return message.split(":")[0]?.trim() || "abcjs parser warning";
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown parse error.";
}