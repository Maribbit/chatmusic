import { describe, expect, it } from "vitest";
import { sanitizeAbcjsWarning, validateAbcSource } from "./validate";

describe("ABC quality validation", () => {
  it("reports empty source as an error", () => {
    const report = validateAbcSource("   ");

    expect(report.status).toBe("error");
    expect(report.diagnostics[0]).toMatchObject({
      severity: "error",
      title: "Empty ABC source",
    });
  });

  it("reports clean ABC without parser warnings", () => {
    const report = validateAbcSource("X:1\nT:Clean\nK:C\nC D E |]");

    expect(report.status).toBe("ok");
    expect(report.tuneCount).toBe(1);
    expect(report.diagnostics).toEqual([]);
  });

  it("converts abcjs warnings into diagnostics with line and column", () => {
    const report = validateAbcSource("X:1\nT:Bad\nK:C\nC D @ |");

    expect(report.status).toBe("warning");
    expect(report.diagnostics[0]).toMatchObject({
      severity: "warning",
      source: "abcjs",
      title: "Unknown character ignored",
      line: 4,
      column: 5,
    });
  });

  it("sanitizes abcjs warning HTML", () => {
    expect(
      sanitizeAbcjsWarning(
        'Music Line:1:2: Bad <span style="font-weight:bold;">&lt;x&gt;</span>'
      )
    ).toBe("Music Line:1:2: Bad <x>");
  });
});