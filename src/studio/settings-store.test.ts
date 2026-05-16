import { afterEach, describe, expect, it, vi } from "vitest";
import {
  KEYBOARD_VISIBILITY_STORAGE_KEY,
  THEME_MODE_STORAGE_KEY,
} from "../shared/settings";
import { loadStudioSettings, saveStudioThemeMode } from "./settings-store";

function setChromeStorageMock(storage: {
  get: (keys: string[], callback: (items: Record<string, unknown>) => void) => void;
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

    await expect(loadStudioSettings()).resolves.toEqual({
      themeMode: "dark",
      keyboardVisibility: "hidden",
    });
  });

  it("falls back to defaults for invalid localStorage values", async () => {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, "sepia");
    window.localStorage.setItem(KEYBOARD_VISIBILITY_STORAGE_KEY, "maybe");

    await expect(loadStudioSettings()).resolves.toEqual({
      themeMode: "auto",
      keyboardVisibility: "visible",
    });
  });

  it("loads settings from extension storage when available", async () => {
    const get = vi.fn(
      (_keys: string[], callback: (items: Record<string, unknown>) => void) => {
      callback({
        [THEME_MODE_STORAGE_KEY]: "light",
        [KEYBOARD_VISIBILITY_STORAGE_KEY]: "hidden",
      });
    });
    setChromeStorageMock({ get, set: vi.fn() });

    await expect(loadStudioSettings()).resolves.toEqual({
      themeMode: "light",
      keyboardVisibility: "hidden",
    });
    expect(get).toHaveBeenCalledWith(
      [THEME_MODE_STORAGE_KEY, KEYBOARD_VISIBILITY_STORAGE_KEY],
      expect.any(Function)
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
});