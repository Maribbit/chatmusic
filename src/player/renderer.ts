/**
 * ABC notation renderer using abcjs.
 * Creates sheet music SVG and playback controls below detected code blocks.
 */
import abcjsAudioStyles from "abcjs/abcjs-audio.css?inline";
import chatmusicStyles from "./view/styles.css?inline";
import type { ChatMusicCodeToggleElement } from "./components/code-toggle";
import {
  DEFAULT_CODE_BLOCK_VISIBILITY,
  DEFAULT_KEYBOARD_VISIBILITY,
  DEFAULT_THEME_MODE,
  type CodeBlockVisibility,
  type KeyboardVisibility,
  type ThemeMode,
} from "../shared/settings";
import { getExtensionRuntime } from "../shared/extension-runtime";
import { createOpenStudioMessage } from "../shared/messages";
import type { ChatMusicQualityElement } from "./components/quality-panel";
import { createDurationControl } from "./components/duration-control";
import { createKeyboardController } from "./components/keyboard";
import { exportMidi, exportScore } from "./exports/actions";
import { playLocalPianoPitch } from "./playback/soundfont";
import { createTempoControl } from "./components/tempo-control";
import { seekPlaybackToPercent } from "./playback/progress";
import { clearPlaybackHighlight, setupKeyboard } from "./playback/highlight";
import { initSynth } from "./playback/synth";
import { getSeekPercentForElement } from "./playback/timing";
import { copyQualityFeedback, updateQualityPanel } from "./quality";
export { getSourceHighlightRangesForTest } from "./playback/source-highlight";
export type {
  RenderAbcOptions,
  RenderInstance,
  SourceHighlightRange,
} from "./types";
import { applyRenderViewTheme, createRenderView } from "./view/view";
import type {
  AbcElementRef,
  RenderAbcOptions,
  RenderInstance,
  SeekableSynthControl,
} from "./types";
import {
  disposeScoreResizeObserver,
  renderScore,
  setupScoreResizeObserver,
  shouldRerenderScoreForLayout,
} from "./view/score-render";

const instances = new Map<Element, RenderInstance>();
const shadowStyles = `${abcjsAudioStyles}\n${chatmusicStyles}`;

async function seekToAbcElement(
  instance: RenderInstance,
  abcElement: AbcElementRef,
): Promise<void> {
  const percent = getSeekPercentForElement(instance, abcElement);
  if (percent === null || !instance.synthControl) return;

  const synthControl = instance.synthControl as SeekableSynthControl;
  const seek = () => {
    seekPlaybackToPercent(instance, percent);
    return Promise.resolve({ status: "ok" });
  };

  if (synthControl.runWhenReady) {
    await synthControl.runWhenReady(seek);
  } else {
    seek();
  }
}

/**
 * Render ABC notation for a given <pre> element.
 * Creates the container, renders SVG, and sets up playback.
 */
export function renderAbc(
  preElement: Element,
  abcText: string,
  themeMode: ThemeMode = DEFAULT_THEME_MODE,
  codeBlockVisibility: CodeBlockVisibility = DEFAULT_CODE_BLOCK_VISIBILITY,
  keyboardVisibility: KeyboardVisibility = DEFAULT_KEYBOARD_VISIBILITY,
  options: RenderAbcOptions = {},
): RenderInstance {
  // If already rendered, update instead of creating new
  const existing = instances.get(preElement);
  if (existing) {
    existing.onSourceHighlight = options.onSourceHighlight;
    applyTheme(existing, themeMode);
    applyKeyboardVisibility(existing, keyboardVisibility);
    if (existing.abcText === abcText) return existing;
    return updateRender(existing, abcText, themeMode);
  }

  let instance: RenderInstance | null = null;
  const runtime = getExtensionRuntime();
  const elements = createRenderView(preElement, themeMode, shadowStyles, {
    onCopyQualityFeedback: () => {
      if (instance) copyQualityFeedback(instance);
    },
    onExportScore: () => {
      if (instance) exportScore(instance);
    },
    onExportMidi: () => {
      if (instance) exportMidi(instance);
    },
    onOpenStudio: runtime?.sendMessage
      ? () => {
          if (instance) {
            void runtime.sendMessage?.(
              createOpenStudioMessage(instance.abcText),
            );
          }
        }
      : undefined,
    onToggleCode: () => {
      if (instance) setCodeCollapsed(instance, !instance.isCodeCollapsed);
    },
  });
  const keyboard = createKeyboardController(
    elements.keyboardElement,
    elements.keyboardToggleElement,
    keyboardVisibility === "visible",
    playKeyboardPitch,
  );
  const durationControl = createDurationControl();
  const tempoControl = createTempoControl(
    elements.tempoElement,
    (warpPercent) => durationControl.setWarp(warpPercent),
  );

  // Render sheet music SVG
  const scoreRender = renderScore(
    elements.scoreElement,
    abcText,
    (abcElement) => {
      if (instance) void seekToAbcElement(instance, abcElement);
    },
  );

  instance = {
    container: elements.container,
    scoreElement: elements.scoreElement,
    keyboard,
    audioElement: elements.audioElement,
    qualityElement: elements.qualityElement as ChatMusicQualityElement,
    tempoControl,
    durationControl,
    codeToggleElement: elements.codeToggleElement as ChatMusicCodeToggleElement,
    preElement,
    preElementOriginalDisplay: null,
    isCodeCollapsed: false,
    abcText,
    themeMode,
    visualObj: scoreRender.visualObj,
    renderedStaffWidth: scoreRender.staffWidth,
    synthControl: null,
    activePlaybackElements: [],
    scoreResizeObserver: null,
    scoreResizeTimer: undefined,
    pendingPlaybackSeekPercent: null,
    pendingPlaybackSeekPromise: null,
    progressDragCleanup: null,
    onSourceHighlight: options.onSourceHighlight,
    cleanup: () => {
      if (instance) {
        disposeScoreResizeObserver(instance);
        instance.progressDragCleanup?.();
        instance.progressDragCleanup = null;
      }
      keyboard.dispose();
      elements.cleanup();
    },
  };

  updateQualityPanel(instance);
  applyCodeBlockVisibility(instance, codeBlockVisibility);
  applyKeyboardVisibility(instance, keyboardVisibility);
  setupKeyboard(instance);
  instances.set(preElement, instance);
  setupScoreResizeObserver(instance, () => rerenderScoreForLayout(instance));

  // Initialize synth (async, non-blocking)
  initSynth(instance);

  return instance;
}

function playKeyboardPitch(pitch: number): void {
  playLocalPianoPitch(pitch).catch((err: unknown) => {
    console.warn("[ChatMusic] Keyboard pitch playback failed:", err);
  });
}

function applyKeyboardVisibility(
  instance: RenderInstance,
  keyboardVisibility: KeyboardVisibility,
): void {
  instance.keyboard.setVisible(keyboardVisibility === "visible");
}

export function updateKeyboardVisibility(
  keyboardVisibility: KeyboardVisibility,
): void {
  for (const instance of instances.values()) {
    applyKeyboardVisibility(instance, keyboardVisibility);
  }
}

function applyCodeBlockVisibility(
  instance: RenderInstance,
  codeBlockVisibility: CodeBlockVisibility,
): void {
  setCodeCollapsed(instance, codeBlockVisibility === "collapsed");
}

function setCodeCollapsed(
  instance: RenderInstance,
  isCollapsed: boolean,
): void {
  if (!(instance.preElement instanceof HTMLElement)) return;

  if (instance.preElementOriginalDisplay === null) {
    instance.preElementOriginalDisplay = instance.preElement.style.display;
  }

  instance.isCodeCollapsed = isCollapsed;
  instance.preElement.style.display = isCollapsed
    ? "none"
    : instance.preElementOriginalDisplay;
  instance.codeToggleElement.setCollapsed(isCollapsed);
}

export function updateCodeBlockVisibility(
  codeBlockVisibility: CodeBlockVisibility,
): void {
  for (const instance of instances.values()) {
    applyCodeBlockVisibility(instance, codeBlockVisibility);
  }
}

/**
 * Update an existing render with new ABC text.
 */
function updateRender(
  instance: RenderInstance,
  abcText: string,
  themeMode: ThemeMode,
): RenderInstance {
  applyTheme(instance, themeMode);
  clearPlaybackHighlight(instance);

  // Re-render SVG
  const scoreRender = renderScore(
    instance.scoreElement,
    abcText,
    (abcElement) => {
      void seekToAbcElement(instance, abcElement);
    },
  );

  instance.abcText = abcText;
  instance.visualObj = scoreRender.visualObj;
  instance.renderedStaffWidth = scoreRender.staffWidth;
  setupKeyboard(instance);
  updateQualityPanel(instance);

  // Re-initialize synth with new tune
  if (instance.synthControl) {
    instance.synthControl.pause();
    instance.synthControl = null;
  }
  initSynth(instance);

  return instance;
}

function rerenderScoreForLayout(instance: RenderInstance): void {
  if (!shouldRerenderScoreForLayout(instance)) return;

  clearPlaybackHighlight(instance);
  const scoreRender = renderScore(
    instance.scoreElement,
    instance.abcText,
    (abcElement) => {
      void seekToAbcElement(instance, abcElement);
    },
  );
  instance.visualObj = scoreRender.visualObj;
  instance.renderedStaffWidth = scoreRender.staffWidth;
  setupKeyboard(instance);

  if (instance.synthControl) {
    instance.synthControl.pause();
    instance.synthControl = null;
    initSynth(instance);
  }
}

function applyTheme(instance: RenderInstance, themeMode: ThemeMode): void {
  instance.themeMode = themeMode;
  applyRenderViewTheme(instance.container, instance.preElement, themeMode);
}

export function updateRenderThemes(themeMode: ThemeMode): void {
  for (const instance of instances.values()) {
    applyTheme(instance, themeMode);
  }
}

/**
 * Remove a render instance and its DOM elements.
 */
export function removeRender(preElement: Element): void {
  const instance = instances.get(preElement);
  if (instance) {
    disposeRender(preElement, instance, preElement.isConnected);
  }
}

export function removeDisconnectedRenders(): void {
  for (const [preElement, instance] of instances) {
    if (!preElement.isConnected || !instance.container.isConnected) {
      disposeRender(preElement, instance, preElement.isConnected);
    }
  }
}

export function removeOrphanRenders(): void {
  const activeContainers = new Set(
    [...instances.values()].map((instance) => instance.container),
  );

  for (const container of document.querySelectorAll(".chatmusic-host")) {
    if (
      !(container instanceof HTMLElement) ||
      activeContainers.has(container)
    ) {
      continue;
    }

    const sourceElement = container.previousElementSibling;
    if (
      sourceElement instanceof HTMLElement &&
      sourceElement.style.display === "none"
    ) {
      sourceElement.style.display = "";
    }
    container.remove();
  }
}

export function removeAllRenders(): void {
  for (const [preElement, instance] of instances) {
    disposeRender(preElement, instance, preElement.isConnected);
  }
  removeOrphanRenders();
}

function disposeRender(
  preElement: Element,
  instance: RenderInstance,
  restoreCodeDisplay: boolean,
): void {
  if (instance.synthControl) {
    instance.synthControl.pause();
    instance.synthControl = null;
  }
  clearPlaybackHighlight(instance);
  if (restoreCodeDisplay) setCodeCollapsed(instance, false);
  instance.cleanup();
  instance.container.remove();
  instances.delete(preElement);
}

/**
 * Check if a <pre> element already has a ChatMusic render.
 */
export function hasRender(preElement: Element): boolean {
  return instances.has(preElement);
}
