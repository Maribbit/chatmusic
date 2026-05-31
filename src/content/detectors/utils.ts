const ABC_DATA_LANGUAGES = new Set(["abc", "abcjs", "abc-notation"]);
const LANGUAGE_ATTRIBUTES = ["data-language", "data-lang"];
const LANGUAGE_CLASS_PREFIXES = ["language-", "lang-"];

export function isAbcLanguage(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return false;

  if (ABC_DATA_LANGUAGES.has(normalized)) return true;

  return LANGUAGE_CLASS_PREFIXES.some((prefix) => {
    if (!normalized.startsWith(prefix)) return false;
    return ABC_DATA_LANGUAGES.has(normalized.slice(prefix.length));
  });
}

export function elementHasAbcLanguage(element: Element): boolean {
  const classes = element.getAttribute("class")?.split(/\s+/) ?? [];
  if (classes.some(isAbcLanguage)) return true;

  return LANGUAGE_ATTRIBUTES.some((attribute) =>
    isAbcLanguage(element.getAttribute(attribute)),
  );
}

export function hasAbcLanguageTag(element: Element): boolean {
  const candidates: Element[] = [element];
  const preElement = element.matches("pre") ? element : element.closest("pre");
  const codeElement = element.matches("code")
    ? element
    : element.querySelector("code");

  if (preElement && preElement !== element) candidates.push(preElement);
  if (codeElement && codeElement !== element) candidates.push(codeElement);

  return candidates.some(elementHasAbcLanguage);
}

export function hasAbcContentPattern(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 10) return false;

  const hasXHeader = /^X:\s*\d+/m.test(trimmed);
  if (!hasXHeader) return false;

  const hasKHeader = /^K:\s*\S+/m.test(trimmed);
  if (!hasKHeader) return false;

  return (
    /^T:/m.test(trimmed) ||
    /^M:/m.test(trimmed) ||
    /^L:/m.test(trimmed) ||
    /^Q:/m.test(trimmed)
  );
}

export function extractCodeText(element: Element): string {
  const sourceElement = element.matches("pre, code")
    ? element
    : (element.querySelector("pre") ??
      element.querySelector("code") ??
      element);
  const codeElement = sourceElement.matches("code")
    ? sourceElement
    : sourceElement.querySelector("code");

  return (codeElement ?? sourceElement).textContent?.trim() ?? "";
}

export function querySelectorAllIncludingSelf(
  root: Element | Document,
  selector: string,
): Element[] {
  const matches: Element[] = [];

  if (root instanceof Element && root.matches(selector)) {
    matches.push(root);
  }

  matches.push(...Array.from(root.querySelectorAll(selector)));
  return matches;
}
