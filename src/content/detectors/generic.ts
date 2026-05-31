import type { AbcDetector, DetectionResult } from "./types";
import {
  extractCodeText,
  hasAbcContentPattern,
  hasAbcLanguageTag,
  querySelectorAllIncludingSelf,
} from "./utils";

export function detectGenericAbc(element: Element): DetectionResult | null {
  const abcText = extractCodeText(element);
  if (!abcText) return null;

  if (hasAbcLanguageTag(element)) {
    return { element, abcText, method: "tag", provider: "generic" };
  }

  if (hasAbcContentPattern(abcText)) {
    return { element, abcText, method: "content", provider: "generic" };
  }

  return null;
}

export const genericDetector: AbcDetector = {
  provider: "generic",
  detect: detectGenericAbc,
  scan(root) {
    const results: DetectionResult[] = [];

    for (const preElement of querySelectorAllIncludingSelf(root, "pre")) {
      const result = detectGenericAbc(preElement);
      if (result) results.push(result);
    }

    return results;
  },
};
