import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ABC_AUTO_CHECK_STORAGE_KEY,
  EDITOR_WRAP_STORAGE_KEY,
  KEYBOARD_VISIBILITY_STORAGE_KEY,
  THEME_MODE_STORAGE_KEY,
} from "../shared/settings";
import {
  loadStudioSettings,
  saveStudioAbcAutoCheck,
  saveStudioEditorWrap,
  saveStudioThemeMode,
} from "./settings-store";

function setChromeStorageMock(storage: {
  get: (
    keys: string[],
    callback: (items: Record<string, unknown>) => void,
  ) => void;
  set: (items: Record<string, unknown>) => void | Promise<void>;
}): void {
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      storage: {
        sync: storage,
      },
    },
  });
}

function clearChromeMock(): void {
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: undefined,
  });
}

describe("Studio settings store", () => {
  afterEach(() => {
    window.localStorage.clear();
    clearChromeMock();
    vi.restoreAllMocks();
  });

  it("loads settings from localStorage outside extension runtime", async () => {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, "dark");
    window.localStorage.setItem(KEYBOARD_VISIBILITY_STORAGE_KEY, "hidden");
    window.localStorage.setItem(ABC_AUTO_CHECK_STORAGE_KEY, "disabled");
    window.localStorage.setItem(EDITOR_WRAP_STORAGE_KEY, "enabled");

    await expect(loadStudioSettings()).resolves.toEqual({
      themeMode: "dark",
      layoutMode: "auto",
      keyboardVisibility: "hidden",
      abcAutoCheck: "disabled",
      editorWrap: "enabled",
    });
  });

  it("falls back to defaults for invalid localStorage values", async () => {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, "sepia");
    window.localStorage.setItem(KEYBOARD_VISIBILITY_STORAGE_KEY, "maybe");
    window.localStorage.setItem(ABC_AUTO_CHECK_STORAGE_KEY, "maybe");
    window.localStorage.setItem(EDITOR_WRAP_STORAGE_KEY, "maybe");
    window.localStorage.setItem("layoutMode", "diagonal");

    await expect(loadStudioSettings()).resolves.toEqual({
      themeMode: "auto",
      layoutMode: "auto",
      keyboardVisibility: "visible",
      abcAutoCheck: "enabled",
      editorWrap: "disabled",
    });
  });

  it("loads settings from extension storage when available", async () => {
    const get = vi.fn(
      (_keys: string[], callback: (items: Record<string, unknown>) => void) => {
        callback({
          [THEME_MODE_STORAGE_KEY]: "light",
          layoutMode: "horizontal",
          [KEYBOARD_VISIBILITY_STORAGE_KEY]: "hidden",
          [ABC_AUTO_CHECK_STORAGE_KEY]: "disabled",
          [EDITOR_WRAP_STORAGE_KEY]: "enabled",
        });
      },
    );
    setChromeStorageMock({ get, set: vi.fn() });

    await expect(loadStudioSettings()).resolves.toEqual({
      themeMode: "light",
      layoutMode: "horizontal",
      keyboardVisibility: "hidden",
      abcAutoCheck: "disabled",
      editorWrap: "enabled",
    });
    expect(get).toHaveBeenCalledWith(
      [
        THEME_MODE_STORAGE_KEY,
        "layoutMode",
        KEYBOARD_VISIBILITY_STORAGE_KEY,
        ABC_AUTO_CHECK_STORAGE_KEY,
        EDITOR_WRAP_STORAGE_KEY,
      ],
      expect.any(Function),
    );
  });

  it("saves theme mode to extension storage when available", async () => {
    const set = vi.fn();
    setChromeStorageMock({
      get: vi.fn(),
      set,
    });

    await saveStudioThemeMode("dark");

    expect(set).toHaveBeenCalledWith({ [THEME_MODE_STORAGE_KEY]: "dark" });
    expect(window.localStorage.getItem(THEME_MODE_STORAGE_KEY)).toBeNull();
  });

  it("saves theme mode to localStorage outside extension runtime", async () => {
    await saveStudioThemeMode("dark");

    expect(window.localStorage.getItem(THEME_MODE_STORAGE_KEY)).toBe("dark");
  });

  it("saves ABC auto-check to extension storage when available", async () => {
    const set = vi.fn();
    setChromeStorageMock({
      get: vi.fn(),
      set,
    });

    await saveStudioAbcAutoCheck("disabled");

    expect(set).toHaveBeenCalledWith({
      [ABC_AUTO_CHECK_STORAGE_KEY]: "disabled",
    });
    expect(window.localStorage.getItem(ABC_AUTO_CHECK_STORAGE_KEY)).toBeNull();
  });

  it("saves ABC auto-check to localStorage outside extension runtime", async () => {
    await saveStudioAbcAutoCheck("disabled");

    expect(window.localStorage.getItem(ABC_AUTO_CHECK_STORAGE_KEY)).toBe(
      "disabled",
    );
  });

  it("saves editor wrap to extension storage when available", async () => {
    const set = vi.fn();
    setChromeStorageMock({
      get: vi.fn(),
      set,
    });

    await saveStudioEditorWrap("enabled");

    expect(set).toHaveBeenCalledWith({ [EDITOR_WRAP_STORAGE_KEY]: "enabled" });
    expect(window.localStorage.getItem(EDITOR_WRAP_STORAGE_KEY)).toBeNull();
  });

  it("saves editor wrap to localStorage outside extension runtime", async () => {
    await saveStudioEditorWrap("enabled");

    expect(window.localStorage.getItem(EDITOR_WRAP_STORAGE_KEY)).toBe(
      "enabled",
    );
  });
});
