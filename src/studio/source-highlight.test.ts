import { describe, expect, it } from "vitest";
import {
  createSourceHighlightFragment,
  normalizeSourceHighlightRanges,
  offsetSourceHighlightRanges,
} from "./source-highlight";

describe("Studio source highlighting", () => {
  it("bounds, sorts, and merges overlapping highlight ranges", () => {
    expect(
      normalizeSourceHighlightRanges(
        [
          { start: 8, end: 12 },
          { start: -4, end: 2 },
          { start: 1, end: 5 },
          { start: 5, end: 7 },
          { start: 3, end: 3 },
        ],
        10,
      ),
    ).toEqual([
      { start: 0, end: 7 },
      { start: 8, end: 10 },
    ]);
  });

  it("creates marked source fragments without losing plain text", () => {
    const fragment = createSourceHighlightFragment("C D E F", [
      { start: 2, end: 3 },
      { start: 6, end: 7 },
    ]);
    const host = document.createElement("div");
    host.append(fragment);

    expect(host.textContent).toBe("C D E F");
    expect(
      [...host.querySelectorAll("mark")].map((mark) => mark.textContent),
    ).toEqual(["D", "F"]);
  });

  it("offsets player highlight ranges back into the editor source", () => {
    expect(offsetSourceHighlightRanges([{ start: 1, end: 4 }], 3)).toEqual([
      { start: 4, end: 7 },
    ]);
  });
});
