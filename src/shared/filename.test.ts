import { describe, expect, it } from "vitest";
import { getAbcDownloadFilename, getAbcTitle, sanitizeFilenameStem } from "./filename";

describe("filename helpers", () => {
  it("reads the first ABC title", () => {
    expect(getAbcTitle("X:1\nT:Morning Tune\nK:C\nCDEF")).toBe(
      "Morning Tune"
    );
  });

  it("sanitizes unsafe filename characters", () => {
    expect(sanitizeFilenameStem("A/B:C*D?")).toBe("A B C D");
  });

  it("falls back to a stable score filename", () => {
    expect(getAbcDownloadFilename("X:1\nK:C\nCDEF", ".mid")).toBe(
      "chatmusic-score.mid"
    );
  });
});