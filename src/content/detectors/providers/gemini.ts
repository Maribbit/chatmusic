import type { AbcDetector, DetectionResult } from "../types";
import {
  extractCodeText,
  hasAbcContentPattern,
  querySelectorAllIncludingSelf,
} from "../utils";

const GEMINI_CODE_BLOCK_SELECTOR = "code-block";
const GEMINI_CODE_CONTENT_SELECTOR = 'code[data-test-id="code-content"]';

export const geminiDetector: AbcDetector = {
  provider: "gemini",
  scan(root) {
    const results: DetectionResult[] = [];

    for (const block of querySelectorAllIncludingSelf(
      root,
      GEMINI_CODE_BLOCK_SELECTOR,
    )) {
      const codeElement = block.querySelector(GEMINI_CODE_CONTENT_SELECTOR);
      if (!codeElement) continue;

      const abcText = extractCodeText(codeElement);
      if (!hasAbcContentPattern(abcText)) continue;

      results.push({
        element: block,
        abcText,
        method: "content",
        provider: "gemini",
      });
    }

    return results;
  },
};
