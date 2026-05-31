import {
  ABC_AUTO_CHECK_STORAGE_KEY,
  DEFAULT_ABC_AUTO_CHECK,
  DEFAULT_EDITOR_WRAP,
  DEFAULT_KEYBOARD_VISIBILITY,
  DEFAULT_THEME_MODE,
  DEFAULT_LAYOUT_MODE,
  EDITOR_WRAP_STORAGE_KEY,
  KEYBOARD_VISIBILITY_STORAGE_KEY,
  THEME_MODE_STORAGE_KEY,
  LAYOUT_MODE_STORAGE_KEY,
  normalizeAbcAutoCheck,
  normalizeEditorWrap,
  normalizeKeyboardVisibility,
  normalizeThemeMode,
  normalizeLayoutMode,
  type AbcAutoCheck,
  type EditorWrap,
  type KeyboardVisibility,
  type ThemeMode,
  type LayoutMode,
} from "../shared/settings";
import {
  getExtensionSyncStorage,
  type ExtensionStorageArea,
} from "../shared/extension-runtime";

export interface StudioSettings {
  themeMode: ThemeMode;
  layoutMode: LayoutMode;
  keyboardVisibility: KeyboardVisibility;
  abcAutoCheck: AbcAutoCheck;
  editorWrap: EditorWrap;
}

export async function loadStudioSettings(): Promise<StudioSettings> {
  const extensionStorage = getExtensionSyncStorage();

  if (extensionStorage) return loadExtensionStudioSettings(extensionStorage);

  return {
    themeMode: normalizeThemeMode(
      window.localStorage.getItem(THEME_MODE_STORAGE_KEY) ?? DEFAULT_THEME_MODE,
    ),
    layoutMode: normalizeLayoutMode(
      window.localStorage.getItem(LAYOUT_MODE_STORAGE_KEY) ??
        DEFAULT_LAYOUT_MODE,
    ),
    keyboardVisibility: normalizeKeyboardVisibility(
      window.localStorage.getItem(KEYBOARD_VISIBILITY_STORAGE_KEY) ??
        DEFAULT_KEYBOARD_VISIBILITY,
    ),
    abcAutoCheck: normalizeAbcAutoCheck(
      window.localStorage.getItem(ABC_AUTO_CHECK_STORAGE_KEY) ??
        DEFAULT_ABC_AUTO_CHECK,
    ),
    editorWrap: normalizeEditorWrap(
      window.localStorage.getItem(EDITOR_WRAP_STORAGE_KEY) ??
        DEFAULT_EDITOR_WRAP,
    ),
  };
}

export async function saveStudioThemeMode(themeMode: ThemeMode): Promise<void> {
  const extensionStorage = getExtensionSyncStorage();

  if (extensionStorage) {
    await extensionStorage.set({ [THEME_MODE_STORAGE_KEY]: themeMode });
    return;
  }

  window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
}

export async function saveStudioLayoutMode(
  layoutMode: LayoutMode,
): Promise<void> {
  const extensionStorage = getExtensionSyncStorage();

  if (extensionStorage) {
    await extensionStorage.set({ [LAYOUT_MODE_STORAGE_KEY]: layoutMode });
    return;
  }

  window.localStorage.setItem(LAYOUT_MODE_STORAGE_KEY, layoutMode);
}

export async function saveStudioAbcAutoCheck(
  abcAutoCheck: AbcAutoCheck,
): Promise<void> {
  const extensionStorage = getExtensionSyncStorage();

  if (extensionStorage) {
    await extensionStorage.set({ [ABC_AUTO_CHECK_STORAGE_KEY]: abcAutoCheck });
    return;
  }

  window.localStorage.setItem(ABC_AUTO_CHECK_STORAGE_KEY, abcAutoCheck);
}

export async function saveStudioEditorWrap(
  editorWrap: EditorWrap,
): Promise<void> {
  const extensionStorage = getExtensionSyncStorage();

  if (extensionStorage) {
    await extensionStorage.set({ [EDITOR_WRAP_STORAGE_KEY]: editorWrap });
    return;
  }

  window.localStorage.setItem(EDITOR_WRAP_STORAGE_KEY, editorWrap);
}

function loadExtensionStudioSettings(
  extensionStorage: ExtensionStorageArea,
): Promise<StudioSettings> {
  return new Promise((resolve) => {
    extensionStorage.get(
      [
        THEME_MODE_STORAGE_KEY,
        LAYOUT_MODE_STORAGE_KEY,
        KEYBOARD_VISIBILITY_STORAGE_KEY,
        ABC_AUTO_CHECK_STORAGE_KEY,
        EDITOR_WRAP_STORAGE_KEY,
      ],
      (result) => {
        resolve({
          themeMode: normalizeThemeMode(
            result[THEME_MODE_STORAGE_KEY] ?? DEFAULT_THEME_MODE,
          ),
          layoutMode: normalizeLayoutMode(
            result[LAYOUT_MODE_STORAGE_KEY] ?? DEFAULT_LAYOUT_MODE,
          ),
          keyboardVisibility: normalizeKeyboardVisibility(
            result[KEYBOARD_VISIBILITY_STORAGE_KEY] ??
              DEFAULT_KEYBOARD_VISIBILITY,
          ),
          abcAutoCheck: normalizeAbcAutoCheck(
            result[ABC_AUTO_CHECK_STORAGE_KEY] ?? DEFAULT_ABC_AUTO_CHECK,
          ),
          editorWrap: normalizeEditorWrap(
            result[EDITOR_WRAP_STORAGE_KEY] ?? DEFAULT_EDITOR_WRAP,
          ),
        });
      },
    );
  });
}
