import { afterEach, describe, expect, it, vi } from "vitest";
import { detectElementTheme, resolveTheme } from "./theme";

function createPreWithParentBackground(backgroundColor: string): HTMLPreElement {
  const wrapper = document.createElement("section");
  const pre = document.createElement("pre");

  wrapper.style.backgroundColor = backgroundColor;
  wrapper.append(pre);
  document.body.append(wrapper);

  return pre;
}

function setPreferredDarkMode(matches: boolean): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("resolveTheme", () => {
  it("honors manual light and dark modes", () => {
    const pre = createPreWithParentBackground("rgb(255, 255, 255)");

    expect(resolveTheme(pre, "dark")).toBe("dark");
    expect(resolveTheme(pre, "light")).toBe("light");
  });

  it("detects dark backgrounds in auto mode", () => {
    const pre = createPreWithParentBackground("rgb(31, 31, 31)");

    expect(resolveTheme(pre, "auto")).toBe("dark");
  });

  it("detects light backgrounds in auto mode", () => {
    const pre = createPreWithParentBackground("rgb(250, 250, 250)");

    expect(resolveTheme(pre, "auto")).toBe("light");
  });

  it("composites translucent backgrounds with ancestors", () => {
    const wrapper = document.createElement("section");
    const pre = document.createElement("pre");

    wrapper.style.backgroundColor = "rgb(255, 255, 255)";
    pre.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
    wrapper.append(pre);
    document.body.append(wrapper);

    expect(detectElementTheme(pre)).toBe("light");
  });

  it("falls back to the preferred color scheme without a visible background", () => {
    setPreferredDarkMode(true);

    const pre = document.createElement("pre");
    document.body.append(pre);

    expect(detectElementTheme(pre)).toBe("dark");
  });
});