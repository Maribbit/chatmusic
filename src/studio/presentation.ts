import {
  DEFAULT_THEME_MODE,
  normalizeEditorWrap,
  normalizeThemeMode,
  type EditorWrap,
  type LayoutMode,
  type ThemeMode,
} from "../shared/settings";

export function applyStudioEditorWrap(
  editorFrame: HTMLElement,
  input: HTMLTextAreaElement,
  editorWrap: EditorWrap,
  syncSourceHighlightScroll: () => void,
): EditorWrap {
  const normalizedEditorWrap = normalizeEditorWrap(editorWrap);
  editorFrame.dataset.editorWrap = normalizedEditorWrap;
  input.wrap = normalizedEditorWrap === "enabled" ? "soft" : "off";
  if (normalizedEditorWrap === "enabled") input.scrollLeft = 0;
  syncSourceHighlightScroll();
  return normalizedEditorWrap;
}

export function getSelectedStudioThemeMode(
  themeModeForm: HTMLFormElement,
): ThemeMode {
  return normalizeThemeMode(
    themeModeForm.themeMode.value || DEFAULT_THEME_MODE,
  );
}

export function applyStudioTheme(
  themeMode: ThemeMode,
  prefersDark: boolean,
  documentElement: HTMLElement = document.documentElement,
): void {
  const resolvedTheme =
    themeMode === "auto" ? (prefersDark ? "dark" : "light") : themeMode;

  documentElement.dataset.theme = resolvedTheme;
  documentElement.dataset.themeMode = themeMode;
}

export function applyStudioLayoutMode(
  studioShell: HTMLElement,
  layoutMode: LayoutMode,
): void {
  if (layoutMode === "horizontal") {
    studioShell.classList.add("layout-split");
    studioShell.classList.remove("layout-stacked");
  } else if (layoutMode === "vertical") {
    studioShell.classList.add("layout-stacked");
    studioShell.classList.remove("layout-split");
  } else {
    studioShell.classList.remove("layout-split", "layout-stacked");
  }
}
