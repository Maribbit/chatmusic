import { describe, expect, it, vi } from "vitest";
import { ChatMusicQualityElement, QUALITY_COPY_EVENT } from "./quality-panel";

describe("quality panel", () => {
  it("renders parser diagnostics and hides itself when clear", async () => {
    const element = document.createElement(
      "chatmusic-quality",
    ) as ChatMusicQualityElement;
    document.body.append(element);

    element.setDiagnostics([
      {
        source: "abcjs",
        severity: "warning",
        title: "Unknown character ignored",
        message: "Unexpected @ in the tune body.",
        line: 4,
        column: 5,
      },
    ]);
    await element.updateComplete;

    expect(element.hidden).toBe(false);
    expect(element.querySelector(".chatmusic-quality-summary")?.textContent)
      .toContain("1 ABC parser issue found.");
    expect(element.textContent).toContain("WARNING: Unknown character ignored");
    expect(element.textContent).toContain("Line 4, column 5");

    element.setDiagnostics([]);
    await element.updateComplete;

    expect(element.hidden).toBe(true);
    expect(element.textContent?.trim()).toBe("");
  });

  it("emits copy requests from its feedback button", async () => {
    const element = document.createElement(
      "chatmusic-quality",
    ) as ChatMusicQualityElement;
    const onCopy = vi.fn();
    document.body.append(element);
    element.addEventListener(QUALITY_COPY_EVENT, onCopy);

    element.setDiagnostics([
      {
        source: "chatmusic",
        severity: "warning",
        title: "Missing key",
        message: "A K: field is required.",
      },
    ]);
    await element.updateComplete;

    element
      .querySelector(".chatmusic-quality-copy-button")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onCopy).toHaveBeenCalledTimes(1);
  });
});