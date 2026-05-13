export const DEFAULT_THEME_MODE = "auto";
export const THEME_MODE_STORAGE_KEY = "themeMode";
export const DEFAULT_CODE_BLOCK_VISIBILITY = "expanded";
export const CODE_BLOCK_VISIBILITY_STORAGE_KEY = "codeBlockVisibility";
export const DEFAULT_KEYBOARD_VISIBILITY = "visible";
export const KEYBOARD_VISIBILITY_STORAGE_KEY = "keyboardVisibility";

export type ThemeMode = "auto" | "light" | "dark";
export type ResolvedTheme = Exclude<ThemeMode, "auto">;
export type CodeBlockVisibility = "expanded" | "collapsed";
export type KeyboardVisibility = "visible" | "hidden";

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "auto" || value === "light" || value === "dark";
}

export function normalizeThemeMode(value: unknown): ThemeMode {
  return isThemeMode(value) ? value : DEFAULT_THEME_MODE;
}

export function isCodeBlockVisibility(
  value: unknown
): value is CodeBlockVisibility {
  return value === "expanded" || value === "collapsed";
}

export function normalizeCodeBlockVisibility(
  value: unknown
): CodeBlockVisibility {
  return isCodeBlockVisibility(value) ? value : DEFAULT_CODE_BLOCK_VISIBILITY;
}

export function isKeyboardVisibility(
  value: unknown
): value is KeyboardVisibility {
  return value === "visible" || value === "hidden";
}

export function normalizeKeyboardVisibility(
  value: unknown
): KeyboardVisibility {
  return isKeyboardVisibility(value) ? value : DEFAULT_KEYBOARD_VISIBILITY;
}