import {
  ABC_AUTO_CHECK_STORAGE_KEY,
  DEFAULT_ABC_AUTO_CHECK,
  DEFAULT_KEYBOARD_VISIBILITY,
  DEFAULT_THEME_MODE,
  KEYBOARD_VISIBILITY_STORAGE_KEY,
  THEME_MODE_STORAGE_KEY,
  normalizeAbcAutoCheck,
  normalizeKeyboardVisibility,
  normalizeThemeMode,
  type AbcAutoCheck,
  type KeyboardVisibility,
  type ThemeMode,
} from "../shared/settings";
import {
  getExtensionSyncStorage,
  type ExtensionStorageArea,
} from "../shared/extension-runtime";

export interface StudioSettings {
  themeMode: ThemeMode;
  keyboardVisibility: KeyboardVisibility;
  abcAutoCheck: AbcAutoCheck;
}

export async function loadStudioSettings(): Promise<StudioSettings> {
  const extensionStorage = getExtensionSyncStorage();

  if (extensionStorage) return loadExtensionStudioSettings(extensionStorage);

  return {
    themeMode: normalizeThemeMode(
      window.localStorage.getItem(THEME_MODE_STORAGE_KEY) ?? DEFAULT_THEME_MODE
    ),
    keyboardVisibility: normalizeKeyboardVisibility(
      window.localStorage.getItem(KEYBOARD_VISIBILITY_STORAGE_KEY) ??
        DEFAULT_KEYBOARD_VISIBILITY
    ),
    abcAutoCheck: normalizeAbcAutoCheck(
      window.localStorage.getItem(ABC_AUTO_CHECK_STORAGE_KEY) ??
        DEFAULT_ABC_AUTO_CHECK
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

export async function saveStudioAbcAutoCheck(
  abcAutoCheck: AbcAutoCheck
): Promise<void> {
  const extensionStorage = getExtensionSyncStorage();

  if (extensionStorage) {
    await extensionStorage.set({ [ABC_AUTO_CHECK_STORAGE_KEY]: abcAutoCheck });
    return;
  }

  window.localStorage.setItem(ABC_AUTO_CHECK_STORAGE_KEY, abcAutoCheck);
}

function loadExtensionStudioSettings(
  extensionStorage: ExtensionStorageArea
): Promise<StudioSettings> {
  return new Promise((resolve) => {
    extensionStorage.get(
      [
        THEME_MODE_STORAGE_KEY,
        KEYBOARD_VISIBILITY_STORAGE_KEY,
        ABC_AUTO_CHECK_STORAGE_KEY,
      ],
      (result) => {
        resolve({
          themeMode: normalizeThemeMode(
            result[THEME_MODE_STORAGE_KEY] ?? DEFAULT_THEME_MODE
          ),
          keyboardVisibility: normalizeKeyboardVisibility(
            result[KEYBOARD_VISIBILITY_STORAGE_KEY] ??
              DEFAULT_KEYBOARD_VISIBILITY
          ),
          abcAutoCheck: normalizeAbcAutoCheck(
            result[ABC_AUTO_CHECK_STORAGE_KEY] ?? DEFAULT_ABC_AUTO_CHECK
          ),
        });
      }
    );
  });
}