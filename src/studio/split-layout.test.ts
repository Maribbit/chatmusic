import { afterEach, describe, expect, it } from "vitest";
import type { LayoutMode } from "../shared/settings";
import { createStudioSplitLayout } from "./split-layout";

function setRect(element: HTMLElement, rect: Partial<DOMRect>): void {
  element.getBoundingClientRect = () =>
    ({
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
      ...rect,
    }) as DOMRect;
}

function createLayout(
  options: {
    layoutMode?: LayoutMode;
    stackedMatches?: boolean;
  } = {},
) {
  const studioShell = document.createElement("section");
  const editorPane = document.createElement("section");
  const resizer = document.createElement("div");
  let layoutMode = options.layoutMode ?? "auto";

  setRect(studioShell, { height: 720, width: 1000 });
  setRect(editorPane, { height: 300, width: 400, top: 100 });
  setRect(resizer, { height: 8 });

  const splitLayout = createStudioSplitLayout({
    editorPane,
    resizer,
    stackedLayoutQuery: { matches: options.stackedMatches ?? false },
    studioShell,
    getLayoutMode: () => layoutMode,
  });

  return {
    editorPane,
    resizer,
    splitLayout,
    studioShell,
    setLayoutMode: (nextLayoutMode: LayoutMode) => {
      layoutMode = nextLayoutMode;
    },
  };
}

describe("Studio split layout", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("restores persisted desktop and mobile split sizes", () => {
    const { splitLayout, studioShell } = createLayout();
    window.localStorage.setItem("chatmusicStudioDesktopSplit", "420px");
    window.localStorage.setItem("chatmusicStudioMobileSplit", "260px");

    splitLayout.restoreSizes();

    expect(studioShell.style.getPropertyValue("--studio-editor-size")).toBe(
      "420px",
    );
    expect(
      studioShell.style.getPropertyValue("--studio-editor-mobile-size"),
    ).toBe("260px");
  });

  it("updates resizer orientation from layout mode and media query state", () => {
    const { resizer, splitLayout, setLayoutMode } = createLayout({
      stackedMatches: true,
    });

    splitLayout.updateOrientation();
    expect(resizer.getAttribute("aria-orientation")).toBe("horizontal");

    setLayoutMode("horizontal");
    splitLayout.updateOrientation();
    expect(resizer.getAttribute("aria-orientation")).toBe("vertical");

    setLayoutMode("vertical");
    splitLayout.updateOrientation();
    expect(resizer.getAttribute("aria-orientation")).toBe("horizontal");
  });

  it("resizes the desktop split with keyboard arrows and clamps to bounds", () => {
    const { editorPane, splitLayout, studioShell } = createLayout({
      layoutMode: "horizontal",
    });
    setRect(editorPane, { width: 670 });

    splitLayout.handleKeydown(
      new KeyboardEvent("keydown", { key: "ArrowRight" }),
    );

    expect(studioShell.style.getPropertyValue("--studio-editor-size")).toBe(
      "680px",
    );
    expect(window.localStorage.getItem("chatmusicStudioDesktopSplit")).toBe(
      "680px",
    );
  });
});
