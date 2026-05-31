import { beforeEach, describe, expect, it, vi } from "vitest";

const rendererMocks = vi.hoisted(() => ({
  removeRender: vi.fn(),
  renderAbc: vi.fn(),
}));

vi.mock("../player/renderer", () => ({
  removeRender: rendererMocks.removeRender,
  renderAbc: rendererMocks.renderAbc,
}));

import { createStudioRenderController } from "./rendering";

function createController() {
  const input = document.createElement("textarea");
  const renderMount = document.createElement("section");
  const renderStatus = document.createElement("span");
  const sourceElement = document.createElement("pre");
  const clearSourceHighlight = vi.fn();
  const runAutoCheck = vi.fn();
  const updateSourceHighlight = vi.fn();

  const controller = createStudioRenderController({
    clearSourceHighlight,
    getKeyboardVisibility: () => "visible",
    getThemeMode: () => "dark",
    input,
    renderDelayMs: 10,
    renderMount,
    renderStatus,
    runAutoCheck,
    sourceElement,
    updateSourceHighlight,
  });

  return {
    clearSourceHighlight,
    controller,
    input,
    renderMount,
    renderStatus,
    runAutoCheck,
    sourceElement,
    updateSourceHighlight,
  };
}

describe("Studio render controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rendererMocks.renderAbc.mockReturnValue({
      container: document.createElement("article"),
    });
  });

  it("clears renders and status for empty input", () => {
    const {
      clearSourceHighlight,
      controller,
      renderMount,
      renderStatus,
      sourceElement,
    } = createController();
    renderMount.classList.add("has-render");

    controller.renderCurrentInput();

    expect(clearSourceHighlight).toHaveBeenCalledTimes(1);
    expect(rendererMocks.removeRender).toHaveBeenCalledWith(sourceElement);
    expect(renderMount.classList.contains("has-render")).toBe(false);
    expect(renderStatus.textContent).toBe("Ready");
  });

  it("renders trimmed ABC and offsets playback highlight ranges", () => {
    const {
      controller,
      input,
      renderMount,
      renderStatus,
      runAutoCheck,
      sourceElement,
      updateSourceHighlight,
    } = createController();
    input.value = "\n  X:1\nK:C\nC|  ";

    controller.renderCurrentInput();

    expect(rendererMocks.renderAbc).toHaveBeenCalledWith(
      sourceElement,
      "X:1\nK:C\nC|",
      "dark",
      "collapsed",
      "visible",
      expect.objectContaining({ onSourceHighlight: expect.any(Function) }),
    );
    const options = rendererMocks.renderAbc.mock.calls[0]?.[5];
    options.onSourceHighlight([{ start: 0, end: 3 }]);

    expect(updateSourceHighlight).toHaveBeenCalledWith([{ start: 3, end: 6 }]);
    expect(renderMount.classList.contains("has-render")).toBe(true);
    expect(renderStatus.textContent).toBe("Rendered");
    expect(runAutoCheck).toHaveBeenCalledTimes(1);
  });
});
