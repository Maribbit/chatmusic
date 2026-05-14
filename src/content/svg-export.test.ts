import { describe, expect, it } from "vitest";
import { getSvgDownloadFilename, serializeScoreSvg } from "./svg-export";

describe("svg export helpers", () => {
  it("uses the ABC title for the download filename", () => {
    expect(getSvgDownloadFilename("X:1\nT:Morning Tune\nK:C\nCDEF")).toBe(
      "Morning Tune.svg"
    );
  });

  it("sanitizes characters that are unsafe in filenames", () => {
    expect(getSvgDownloadFilename("X:1\nT:A/B:C*D?\nK:C\nCDEF")).toBe(
      "A B C D.svg"
    );
  });

  it("falls back when the title is missing", () => {
    expect(getSvgDownloadFilename("X:1\nK:C\nCDEF")).toBe(
      "chatmusic-score.svg"
    );
  });

  it("serializes SVG with an XML declaration and namespace", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 10 10");

    expect(serializeScoreSvg(svg)).toContain(
      '<?xml version="1.0" encoding="UTF-8"?>'
    );
    expect(serializeScoreSvg(svg)).toContain(
      'xmlns="http://www.w3.org/2000/svg"'
    );
  });
});