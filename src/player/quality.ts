import {
  formatAbcQualityReportForAi,
  validateAbcSource,
} from "../shared/abc-quality/validate";
import type { RenderInstance } from "./types";

export function copyQualityFeedback(instance: RenderInstance): void {
  const report = validateAbcSource(instance.abcText);
  const feedback = formatAbcQualityReportForAi(report);

  navigator.clipboard.writeText(feedback).catch((error: unknown) => {
    console.warn("[ChatMusic] Copy ABC feedback failed:", error);
  });
}

export function updateQualityPanel(instance: RenderInstance): void {
  const report = validateAbcSource(instance.abcText);
  instance.qualityElement.setDiagnostics(
    report.status === "ok" ? [] : report.diagnostics,
  );
}
