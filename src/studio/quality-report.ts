import type {
  AbcDiagnostic,
  AbcQualityReport,
} from "../shared/abc-quality/diagnostics";
import { validateAbcSource } from "../shared/abc-quality/validate";

export function checkStudioAbcSource(
  abcText: string,
  renderStatus: HTMLElement,
  qualityPanel: HTMLElement,
  autoCheckEnabled: boolean,
): AbcQualityReport {
  const report = validateAbcSource(abcText);
  renderStatus.textContent = getQualityStatusText(report);

  if (autoCheckEnabled && report.status !== "ok") {
    renderQualityReport(qualityPanel, report);
  } else {
    hideQualityPanel(qualityPanel);
  }

  return report;
}

export function renderQualityReport(
  qualityPanel: HTMLElement,
  report: AbcQualityReport,
): void {
  qualityPanel.hidden = false;
  qualityPanel.dataset.status = report.status;
  qualityPanel.replaceChildren(createQualitySummary(report));

  if (report.diagnostics.length === 0) return;

  const list = document.createElement("ul");
  list.className = "quality-list";
  for (const diagnostic of report.diagnostics) {
    list.append(createDiagnosticItem(diagnostic));
  }
  qualityPanel.append(list);
}

export function hideQualityPanel(qualityPanel: HTMLElement): void {
  qualityPanel.hidden = true;
  qualityPanel.replaceChildren();
}

export function getQualityStatusText(report: AbcQualityReport): string {
  if (report.status === "ok") return "ABC check passed";
  if (report.status === "warning") return "ABC warnings found";
  return "ABC errors found";
}

function createQualitySummary(report: AbcQualityReport): HTMLElement {
  const summary = document.createElement("p");
  summary.className = "quality-summary";

  if (report.status === "ok") {
    summary.textContent = `No abcjs parser warnings (${report.tuneCount} tune${report.tuneCount === 1 ? "" : "s"}).`;
  } else {
    summary.textContent = `${report.diagnostics.length} issue${report.diagnostics.length === 1 ? "" : "s"} found.`;
  }

  return summary;
}

function createDiagnosticItem(diagnostic: AbcDiagnostic): HTMLElement {
  const item = document.createElement("li");
  item.className = "quality-item";

  const title = document.createElement("span");
  title.className = "quality-title";
  title.textContent = `${diagnostic.severity.toUpperCase()}: ${diagnostic.title}`;

  const message = document.createElement("span");
  message.textContent = diagnostic.message;

  item.append(title, message);

  const location = formatDiagnosticLocation(diagnostic);
  if (location) {
    const locationElement = document.createElement("span");
    locationElement.className = "quality-location";
    locationElement.textContent = location;
    item.append(locationElement);
  }

  return item;
}

function formatDiagnosticLocation(diagnostic: AbcDiagnostic): string | null {
  if (diagnostic.line === undefined) return null;
  if (diagnostic.column === undefined) return `Line ${diagnostic.line}`;
  return `Line ${diagnostic.line}, column ${diagnostic.column}`;
}
