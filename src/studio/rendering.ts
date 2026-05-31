import {
  renderAbc,
  removeRender,
  type RenderInstance,
  type SourceHighlightRange,
} from "../player/renderer";
import type { KeyboardVisibility, ThemeMode } from "../shared/settings";
import { offsetSourceHighlightRanges } from "./source-highlight";

interface StudioRenderControllerOptions {
  clearSourceHighlight: () => void;
  getKeyboardVisibility: () => KeyboardVisibility;
  getThemeMode: () => ThemeMode;
  input: HTMLTextAreaElement;
  renderDelayMs: number;
  renderMount: HTMLElement;
  renderStatus: HTMLElement;
  runAutoCheck: () => void;
  sourceElement: HTMLElement;
  updateSourceHighlight: (ranges: SourceHighlightRange[]) => void;
}

export interface StudioRenderController {
  getCurrentInstance: () => RenderInstance | null;
  renderCurrentInput: () => void;
  scheduleRender: () => void;
}

export function createStudioRenderController({
  clearSourceHighlight,
  getKeyboardVisibility,
  getThemeMode,
  input,
  renderDelayMs,
  renderMount,
  renderStatus,
  runAutoCheck,
  sourceElement,
  updateSourceHighlight,
}: StudioRenderControllerOptions): StudioRenderController {
  let renderTimer: number | undefined;
  let currentInstance: RenderInstance | null = null;

  const renderCurrentInput = () => {
    if (renderTimer !== undefined) {
      window.clearTimeout(renderTimer);
      renderTimer = undefined;
    }

    const abcText = input.value.trim();
    const sourceOffset = abcText ? input.value.indexOf(abcText) : 0;
    clearSourceHighlight();
    sourceElement.textContent = abcText;

    if (!abcText) {
      removeRender(sourceElement);
      currentInstance = null;
      renderMount.classList.remove("has-render");
      renderStatus.textContent = "Ready";
      return;
    }

    try {
      currentInstance = renderAbc(
        sourceElement,
        abcText,
        getThemeMode(),
        "collapsed",
        getKeyboardVisibility(),
        {
          onSourceHighlight: (ranges) => {
            updateSourceHighlight(
              offsetSourceHighlightRanges(ranges, sourceOffset),
            );
          },
        },
      );
      currentInstance.container.dataset.chatmusicLayout = "studio";
      renderMount.classList.add("has-render");
      renderStatus.textContent = "Rendered";
      runAutoCheck();
    } catch (error) {
      console.error("[ChatMusic Studio] Render failed:", error);
      renderStatus.textContent = "Render failed";
    }
  };

  const scheduleRender = () => {
    if (renderTimer !== undefined) window.clearTimeout(renderTimer);
    renderStatus.textContent = "Editing...";
    renderTimer = window.setTimeout(renderCurrentInput, renderDelayMs);
  };

  return {
    getCurrentInstance: () => currentInstance,
    renderCurrentInput,
    scheduleRender,
  };
}
