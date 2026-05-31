import type { SourceHighlightRange } from "../player/renderer";

export function normalizeSourceHighlightRanges(
  ranges: SourceHighlightRange[],
  sourceLength: number,
): SourceHighlightRange[] {
  const boundedRanges = ranges
    .map((range) => ({
      start: clamp(range.start, 0, sourceLength),
      end: clamp(range.end, 0, sourceLength),
    }))
    .filter((range) => range.end > range.start)
    .sort(
      (first, second) => first.start - second.start || first.end - second.end,
    );
  const mergedRanges: SourceHighlightRange[] = [];

  for (const range of boundedRanges) {
    const previousRange = mergedRanges[mergedRanges.length - 1];
    if (previousRange && range.start <= previousRange.end) {
      previousRange.end = Math.max(previousRange.end, range.end);
    } else {
      mergedRanges.push({ ...range });
    }
  }

  return mergedRanges;
}

export function createSourceHighlightFragment(
  sourceText: string,
  ranges: SourceHighlightRange[],
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  let position = 0;

  for (const range of ranges) {
    if (range.start > position) {
      fragment.append(
        document.createTextNode(sourceText.slice(position, range.start)),
      );
    }

    const highlight = document.createElement("mark");
    highlight.className = "abc-highlight-token";
    highlight.textContent = sourceText.slice(range.start, range.end);
    fragment.append(highlight);
    position = range.end;
  }

  if (position < sourceText.length) {
    fragment.append(document.createTextNode(sourceText.slice(position)));
  }

  return fragment;
}

export function offsetSourceHighlightRanges(
  ranges: SourceHighlightRange[],
  offset: number,
): SourceHighlightRange[] {
  return ranges.map((range) => ({
    start: range.start + offset,
    end: range.end + offset,
  }));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
