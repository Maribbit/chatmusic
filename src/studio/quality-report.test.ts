import { describe, expect, it } from "vitest";
import type { AbcQualityReport } from "../shared/abc-quality/diagnostics";
import {
  getQualityStatusText,
  hideQualityPanel,
  renderQualityReport,
} from "./quality-report";

describe("Studio quality report", () => {
  it("renders warning diagnostics into the quality panel", () => {
    const panel = document.createElement("section");
    const report: AbcQualityReport = {
      status: "warning",
      tuneCount: 1,
      diagnostics: [
        {
          source: "abcjs",
          severity: "warning",
          title: "Unknown character ignored",
          message: "Unexpected @ in the tune body.",
          line: 4,
          column: 5,
        },
      ],
    };

    renderQualityReport(panel, report);

    expect(panel.hidden).toBe(false);
    expect(panel.dataset.status).toBe("warning");
    expect(panel.querySelector(".quality-summary")?.textContent).toBe(
      "1 issue found.",
    );
    expect(panel.textContent).toContain("WARNING: Unknown character ignored");
    expect(panel.textContent).toContain("Line 4, column 5");
  });

  it("hides and clears the quality panel", () => {
    const panel = document.createElement("section");
    panel.append("Previous report");

    hideQualityPanel(panel);

    expect(panel.hidden).toBe(true);
    expect(panel.textContent).toBe("");
  });

  it("maps quality statuses to Studio status text", () => {
    const baseReport: AbcQualityReport = {
      status: "ok",
      tuneCount: 1,
      diagnostics: [],
    };

    expect(getQualityStatusText(baseReport)).toBe("ABC check passed");
    expect(getQualityStatusText({ ...baseReport, status: "warning" })).toBe(
      "ABC warnings found",
    );
    expect(getQualityStatusText({ ...baseReport, status: "error" })).toBe(
      "ABC errors found",
    );
  });
});
