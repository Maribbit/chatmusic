/**
 * ABC notation detection logic.
 * Detects ABC music notation in <pre>/<code> blocks by:
 * 1. Language tag (class="language-abc" or similar)
 * 2. Content pattern matching (X: header + K: key signature)
 */

const ABC_LANGUAGE_CLASSES = [
  "language-abc",
  "language-abcjs",
  "language-abc-notation",
  "lang-abc",
];

const ABC_DATA_LANGUAGES = ["abc", "abcjs", "abc-notation"];

/**
 * Check if a code element is tagged as ABC notation via class or data attributes.
 */
function hasAbcLanguageTag(element: Element): boolean {
  // Check the element itself and its children for language class
  const codeEl =
    element.tagName === "CODE"
      ? element
      : element.querySelector("code");

  if (codeEl) {
    const classList = codeEl.className.toLowerCase();
    if (ABC_LANGUAGE_CLASSES.some((cls) => classList.includes(cls))) {
      return true;
    }

    // Check data-language attribute (used by some markdown renderers)
    const dataLang = codeEl.getAttribute("data-language")?.toLowerCase();
    if (dataLang && ABC_DATA_LANGUAGES.includes(dataLang)) {
      return true;
    }
  }

  // Check parent <pre> for data-language
  const preEl =
    element.tagName === "PRE" ? element : element.closest("pre");
  if (preEl) {
    const dataLang = preEl.getAttribute("data-language")?.toLowerCase();
    if (dataLang && ABC_DATA_LANGUAGES.includes(dataLang)) {
      return true;
    }
  }

  return false;
}

/**
 * Detect ABC notation by content pattern analysis.
 * Requires:
 * - X: (tune index) on its own line
 * - K: (key signature) on its own line
 * These two are mandatory headers in valid ABC notation.
 */
function hasAbcContentPattern(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 10) return false;

  // Must have X: tune index (mandatory ABC header)
  const hasXHeader = /^X:\s*\d+/m.test(trimmed);
  if (!hasXHeader) return false;

  // Must have K: key signature (last mandatory header before notes)
  const hasKHeader = /^K:\s*\S+/m.test(trimmed);
  if (!hasKHeader) return false;

  // Additional confidence: should have at least one more common header
  const hasExtraHeader =
    /^T:/m.test(trimmed) || // Title
    /^M:/m.test(trimmed) || // Meter
    /^L:/m.test(trimmed) || // Note length
    /^Q:/m.test(trimmed); // Tempo

  return hasExtraHeader;
}

/**
 * Extract ABC notation text from a <pre> or <code> element.
 */
function extractAbcText(element: Element): string {
  const codeEl = element.querySelector("code");
  return (codeEl || element).textContent?.trim() ?? "";
}

export interface DetectionResult {
  element: Element; // The <pre> element
  abcText: string; // The extracted ABC notation
  method: "tag" | "content"; // How it was detected
}

/**
 * Check a single <pre> element for ABC notation.
 * Returns a DetectionResult if ABC is found, null otherwise.
 */
export function detectAbc(preElement: Element): DetectionResult | null {
  const abcText = extractAbcText(preElement);
  if (!abcText) return null;

  if (hasAbcLanguageTag(preElement)) {
    return { element: preElement, abcText, method: "tag" };
  }

  if (hasAbcContentPattern(abcText)) {
    return { element: preElement, abcText, method: "content" };
  }

  return null;
}

/**
 * Scan a DOM subtree for all <pre> elements containing ABC notation.
 */
export function scanForAbc(root: Element | Document): DetectionResult[] {
  const results: DetectionResult[] = [];
  const preElements = root.querySelectorAll("pre");

  for (const pre of preElements) {
    const result = detectAbc(pre);
    if (result) {
      results.push(result);
    }
  }

  return results;
}
