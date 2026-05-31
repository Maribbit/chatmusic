import type { AbcDetector, DetectionResult } from "../types";
import {
  extractCodeText,
  isAbcLanguage,
  querySelectorAllIncludingSelf,
} from "../utils";

const DEEPSEEK_CODE_BLOCK_SELECTOR = ".md-code-block";
const DEEPSEEK_BANNER_SELECTOR =
  ".md-code-block-banner, .md-code-block-banner-wrap";

function hasDeepSeekAbcLanguageBanner(block: Element): boolean {
  const banner = block.querySelector(DEEPSEEK_BANNER_SELECTOR);
  if (!banner) return false;

  return Array.from(banner.querySelectorAll("span")).some((span) =>
    isAbcLanguage(span.textContent),
  );
}

export const deepSeekDetector: AbcDetector = {
  provider: "deepseek",
  scan(root) {
    const results: DetectionResult[] = [];

    for (const block of querySelectorAllIncludingSelf(
      root,
      DEEPSEEK_CODE_BLOCK_SELECTOR,
    )) {
      if (!hasDeepSeekAbcLanguageBanner(block)) continue;

      const preElement = block.querySelector("pre");
      if (!preElement) continue;

      const abcText = extractCodeText(preElement);
      if (!abcText) continue;

      results.push({
        element: block,
        abcText,
        method: "tag",
        provider: "deepseek",
      });
    }

    return results;
  },
};
