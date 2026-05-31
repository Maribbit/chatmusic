export const DEFAULT_THEME_MODE = "auto";
export const THEME_MODE_STORAGE_KEY = "themeMode";
export const DEFAULT_CODE_BLOCK_VISIBILITY = "expanded";
export const CODE_BLOCK_VISIBILITY_STORAGE_KEY = "codeBlockVisibility";
export const DEFAULT_KEYBOARD_VISIBILITY = "visible";
export const KEYBOARD_VISIBILITY_STORAGE_KEY = "keyboardVisibility";
export const DEFAULT_ABC_AUTO_CHECK = "enabled";
export const ABC_AUTO_CHECK_STORAGE_KEY = "abcAutoCheck";
export const DEFAULT_LAYOUT_MODE = "auto";
export const LAYOUT_MODE_STORAGE_KEY = "layoutMode";
export const DEFAULT_EDITOR_WRAP = "disabled";
export const EDITOR_WRAP_STORAGE_KEY = "editorWrap";

export type ThemeMode = "auto" | "light" | "dark";
export type ResolvedTheme = Exclude<ThemeMode, "auto">;
export type LayoutMode = "auto" | "horizontal" | "vertical";
export type ResolvedLayout = Exclude<LayoutMode, "auto">;
export type CodeBlockVisibility = "expanded" | "collapsed";
export type KeyboardVisibility = "visible" | "hidden";
export type AbcAutoCheck = "enabled" | "disabled";
export type EditorWrap = "enabled" | "disabled";

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "auto" || value === "light" || value === "dark";
}

export function normalizeThemeMode(value: unknown): ThemeMode {
  return isThemeMode(value) ? value : DEFAULT_THEME_MODE;
}

export function isLayoutMode(value: unknown): value is LayoutMode {
  return value === "auto" || value === "horizontal" || value === "vertical";
}

export function normalizeLayoutMode(value: unknown): LayoutMode {
  return isLayoutMode(value) ? value : DEFAULT_LAYOUT_MODE;
}

export function isCodeBlockVisibility(
  value: unknown,
): value is CodeBlockVisibility {
  return value === "expanded" || value === "collapsed";
}

export function normalizeCodeBlockVisibility(
  value: unknown,
): CodeBlockVisibility {
  return isCodeBlockVisibility(value) ? value : DEFAULT_CODE_BLOCK_VISIBILITY;
}

export function isKeyboardVisibility(
  value: unknown,
): value is KeyboardVisibility {
  return value === "visible" || value === "hidden";
}

export function normalizeKeyboardVisibility(
  value: unknown,
): KeyboardVisibility {
  return isKeyboardVisibility(value) ? value : DEFAULT_KEYBOARD_VISIBILITY;
}

export function isAbcAutoCheck(value: unknown): value is AbcAutoCheck {
  return value === "enabled" || value === "disabled";
}

export function normalizeAbcAutoCheck(value: unknown): AbcAutoCheck {
  return isAbcAutoCheck(value) ? value : DEFAULT_ABC_AUTO_CHECK;
}

export function isEditorWrap(value: unknown): value is EditorWrap {
  return value === "enabled" || value === "disabled";
}

export function normalizeEditorWrap(value: unknown): EditorWrap {
  return isEditorWrap(value) ? value : DEFAULT_EDITOR_WRAP;
}
