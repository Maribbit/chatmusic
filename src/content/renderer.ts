/**
 * ABC notation renderer using abcjs.
 * Creates sheet music SVG and playback controls below detected code blocks.
 */
import abcjs from "abcjs";
import abcjsAudioStyles from "abcjs/abcjs-audio.css?inline";
import chatmusicStyles from "./styles.css?inline";
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
import { createDurationControl, type DurationControl } from "./duration-control";
import { getTuneDurationSeconds } from "./duration";
import {
  createKeyboardController,
  type KeyboardController,
  type MidiPitch,
} from "./keyboard";
import {
  downloadSvg,
  getScoreSvg,
  getSvgDownloadFilename,
} from "./svg-export";
import {
  getLocalPianoSynthOptions,
  playLocalPianoPitch,
  warmLocalPianoSoundfont,
} from "./soundfont";
import { createTempoControl, type TempoControl } from "./tempo-control";
import { applyRenderViewTheme, createRenderView } from "./view";

export interface RenderInstance {
  container: HTMLElement;
  scoreElement: HTMLElement;
  keyboard: KeyboardController;
  audioElement: HTMLElement;
  tempoControl: TempoControl;
  durationControl: DurationControl;
  exportButton: HTMLButtonElement;
  studioButton: HTMLButtonElement;
  codeToggleButton: HTMLButtonElement;
  preElement: Element;
  preElementOriginalDisplay: string | null;
  isCodeCollapsed: boolean;
  abcText: string;
  themeMode: ThemeMode;
  visualObj: abcjs.TuneObject[] | null;
  synthControl: abcjs.SynthObjectController | null;
  activePlaybackElements: Element[];
  cleanup: () => void;
}

interface AbcElementRef {
  startChar?: number;
  endChar?: number;
}

interface TimingEvent {
  type?: string;
  milliseconds: number;
  elements?: unknown[];
  midiPitches?: MidiPitch[];
  millisecondsPerMeasure?: number;
  startChar?: number | null;
  endChar?: number | null;
  startCharArray?: Array<number | null>;
  endCharArray?: Array<number | null>;
}

type TimedTuneObject = Omit<abcjs.TuneObject, "setTiming"> & {
  noteTimings?: TimingEvent[];
  setTiming?: (qpm?: number, measuresOfDelay?: number) => TimingEvent[];
};

interface SeekableSynthControl extends abcjs.SynthObjectController {
  seek?: (percent: number) => void;
  runWhenReady?: (
    fn: () => Promise<{ status: string }>
  ) => Promise<unknown>;
}

const instances = new Map<Element, RenderInstance>();
const shadowStyles = `${abcjsAudioStyles}\n${chatmusicStyles}`;

/**
 * Initialize the abcjs SynthController for playback.
 * This creates the full built-in audio UI (play/pause, progress, warp, restart).
 */
async function initSynth(instance: RenderInstance): Promise<void> {
  if (!instance.visualObj || instance.visualObj.length === 0) return;

  const audioEl = instance.audioElement;
  instance.tempoControl.reset();
  instance.durationControl.reset();

  if (!abcjs.synth.supportsAudio()) {
    audioEl.innerHTML = '<p class="chatmusic-no-audio">Audio playback not supported in this browser.</p>';
    return;
  }

  try {
    const synthControl = new abcjs.synth.SynthController();
    synthControl.load(audioEl, createCursorControl(instance), {
      displayRestart: true,
      displayPlay: true,
      displayProgress: true,
      displayWarp: true,
    });

    await synthControl.setTune(
      instance.visualObj[0],
      false,
      getLocalPianoSynthOptions()
    );
    setupDurationControl(instance);
    setupTempoControl(instance);
    schedulePianoSoundfontWarmup();
    instance.synthControl = synthControl;
  } catch (err) {
    console.error("[ChatMusic] Synth init error:", err);
    audioEl.innerHTML = '<p class="chatmusic-no-audio">Failed to initialize audio playback.</p>';
  }
}

function createCursorControl(instance: RenderInstance): object {
  return {
    onReady: () => setupKeyboard(instance),
    onStart: () => clearPlaybackHighlight(instance),
    onEvent: (event: TimingEvent) => highlightTimingEvent(instance, event),
    onFinished: () => clearPlaybackHighlight(instance),
  };
}

function highlightTimingEvent(
  instance: RenderInstance,
  event: TimingEvent
): void {
  instance.tempoControl.update(event);
  clearPlaybackHighlight(instance);

  const elements = flattenTimingElements(event.elements);
  for (const element of elements) {
    element.classList.add("chatmusic-note-playing");
  }

  instance.activePlaybackElements = elements;
  highlightKeyboardPitches(instance, event.midiPitches ?? []);
}

function clearPlaybackHighlight(instance: RenderInstance): void {
  for (const element of instance.activePlaybackElements) {
    element.classList.remove("chatmusic-note-playing");
  }
  instance.keyboard.clearActiveKeys();
  instance.activePlaybackElements = [];
}

function setupKeyboard(instance: RenderInstance): void {
  instance.keyboard.setup(getTuneMidiPitches(instance));
}

function highlightKeyboardPitches(
  instance: RenderInstance,
  midiPitches: MidiPitch[]
): void {
  instance.keyboard.highlightPitches(midiPitches);
}

function getTuneMidiPitches(instance: RenderInstance): number[] {
  const pitches = new Set<number>();

  for (const event of getTimingEvents(instance)) {
    for (const midiPitch of event.midiPitches ?? []) {
      if (midiPitch.pitch !== undefined) pitches.add(midiPitch.pitch);
    }
  }

  return [...pitches].sort((first, second) => first - second);
}

function flattenTimingElements(elements: unknown[] | undefined): Element[] {
  if (!elements) return [];

  const flattened: Element[] = [];
  for (const item of elements) {
    if (item instanceof Element) {
      flattened.push(item);
    } else if (Array.isArray(item)) {
      flattened.push(...flattenTimingElements(item));
    }
  }

  return flattened;
}

async function seekToAbcElement(
  instance: RenderInstance,
  abcElement: AbcElementRef
): Promise<void> {
  const percent = getSeekPercentForElement(instance, abcElement);
  if (percent === null || !instance.synthControl) return;

  const synthControl = instance.synthControl as SeekableSynthControl;
  const seek = () => {
    synthControl.seek?.(percent);
    return Promise.resolve({ status: "ok" });
  };

  if (synthControl.runWhenReady) {
    await synthControl.runWhenReady(seek);
  } else {
    seek();
  }
}

function getSeekPercentForElement(
  instance: RenderInstance,
  abcElement: AbcElementRef
): number | null {
  if (abcElement.startChar === undefined || abcElement.endChar === undefined) {
    return null;
  }

  const timingEvents = getTimingEvents(instance);
  const lastEvent = timingEvents[timingEvents.length - 1];
  if (!lastEvent || lastEvent.milliseconds <= 0) return null;

  const matchingEvent = timingEvents.find((event) =>
    timingEventMatchesElement(event, abcElement)
  );
  if (!matchingEvent) return null;

  return matchingEvent.milliseconds / lastEvent.milliseconds;
}

function getTimingEvents(instance: RenderInstance): TimingEvent[] {
  const tune = instance.visualObj?.[0] as TimedTuneObject | undefined;
  if (!tune) return [];

  if (!tune.noteTimings || tune.noteTimings.length === 0) {
    tune.noteTimings = tune.setTiming?.(0, 0) ?? [];
  }

  return tune.noteTimings;
}

function timingEventMatchesElement(
  event: TimingEvent,
  abcElement: AbcElementRef
): boolean {
  if (event.type && event.type !== "event") return false;

  const starts = event.startCharArray ?? [event.startChar ?? null];
  const ends = event.endCharArray ?? [event.endChar ?? null];

  return starts.some((start, index) => {
    const end = ends[index];
    return (
      start !== null &&
      end !== null &&
      abcElement.endChar !== undefined &&
      abcElement.startChar !== undefined &&
      abcElement.endChar > start &&
      abcElement.startChar < end
    );
  });
}

function setupTempoControl(instance: RenderInstance): void {
  const nativeTempoInput = instance.audioElement.querySelector(
    ".abcjs-midi-tempo"
  ) as HTMLInputElement | null;

  if (!nativeTempoInput) return;

  instance.tempoControl.connect(nativeTempoInput, instance.visualObj?.[0]);
}

function setupDurationControl(instance: RenderInstance): void {
  instance.durationControl.mount(instance.audioElement);
  instance.durationControl.setDuration(
    getTuneDurationSeconds(instance.visualObj?.[0], getTimingEvents(instance))
  );
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
  keyboardVisibility: KeyboardVisibility = DEFAULT_KEYBOARD_VISIBILITY
): RenderInstance {
  // If already rendered, update instead of creating new
  const existing = instances.get(preElement);
  if (existing) {
    applyTheme(existing, themeMode);
    applyKeyboardVisibility(existing, keyboardVisibility);
    if (existing.abcText === abcText) return existing;
    return updateRender(existing, abcText, themeMode);
  }

  const elements = createRenderView(preElement, themeMode, shadowStyles);
  const keyboard = createKeyboardController(
    elements.keyboardElement,
    elements.keyboardToggleButton,
    keyboardVisibility === "visible",
    playKeyboardPitch
  );
  const durationControl = createDurationControl();
  const tempoControl = createTempoControl(
    elements.tempoMenuElement,
    elements.tempoInputElement,
    elements.tempoBpmElement,
    (warpPercent) => durationControl.setWarp(warpPercent)
  );

  // Render sheet music SVG
  let instance: RenderInstance | null = null;
  const visualObj = abcjs.renderAbc(elements.scoreElement, abcText, {
    responsive: "resize",
    add_classes: true,
    clickListener: (abcElement: AbcElementRef) => {
      if (instance) void seekToAbcElement(instance, abcElement);
    },
  });

  instance = {
    container: elements.container,
    scoreElement: elements.scoreElement,
    keyboard,
    audioElement: elements.audioElement,
    tempoControl,
    durationControl,
    exportButton: elements.exportButton,
    studioButton: elements.studioButton,
    codeToggleButton: elements.codeToggleButton,
    preElement,
    preElementOriginalDisplay: null,
    isCodeCollapsed: false,
    abcText,
    themeMode,
    visualObj,
    synthControl: null,
    activePlaybackElements: [],
    cleanup: () => {
      keyboard.dispose();
      elements.cleanup();
    },
  };

  setupCodeToggleButton(instance);
  setupExportButton(instance);
  setupStudioButton(instance);
  applyCodeBlockVisibility(instance, codeBlockVisibility);
  applyKeyboardVisibility(instance, keyboardVisibility);
  setupKeyboard(instance);
  instances.set(preElement, instance);

  // Initialize synth (async, non-blocking)
  initSynth(instance);

  return instance;
}

function playKeyboardPitch(pitch: number): void {
  playLocalPianoPitch(pitch).catch((err: unknown) => {
    console.warn("[ChatMusic] Keyboard pitch playback failed:", err);
  });
}

function schedulePianoSoundfontWarmup(): void {
  const warmup = () => {
    warmLocalPianoSoundfont().catch((err: unknown) => {
      console.warn("[ChatMusic] Piano soundfont warmup failed:", err);
    });
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(warmup, { timeout: 1500 });
  } else {
    setTimeout(warmup, 0);
  }
}

function setupStudioButton(instance: RenderInstance): void {
  const runtime = getExtensionRuntime();

  if (!runtime?.sendMessage) {
    instance.studioButton.hidden = true;
    return;
  }

  const openStudio = () => {
    void runtime.sendMessage?.(createOpenStudioMessage(instance.abcText));
  };
  const previousCleanup = instance.cleanup;

  instance.studioButton.addEventListener("click", openStudio);
  instance.cleanup = () => {
    instance.studioButton.removeEventListener("click", openStudio);
    previousCleanup();
  };
}

function setupExportButton(instance: RenderInstance): void {
  const exportScore = () => {
    const svg = getScoreSvg(instance.scoreElement);
    if (!svg) return;

    downloadSvg(svg, getSvgDownloadFilename(instance.abcText));
  };
  const previousCleanup = instance.cleanup;

  instance.exportButton.addEventListener("click", exportScore);
  instance.cleanup = () => {
    instance.exportButton.removeEventListener("click", exportScore);
    previousCleanup();
  };
}

function setupCodeToggleButton(instance: RenderInstance): void {
  const toggleCode = () => {
    setCodeCollapsed(instance, !instance.isCodeCollapsed);
  };
  const previousCleanup = instance.cleanup;

  instance.codeToggleButton.addEventListener("click", toggleCode);
  instance.cleanup = () => {
    instance.codeToggleButton.removeEventListener("click", toggleCode);
    previousCleanup();
  };
}

function applyKeyboardVisibility(
  instance: RenderInstance,
  keyboardVisibility: KeyboardVisibility
): void {
  instance.keyboard.setVisible(keyboardVisibility === "visible");
}

export function updateKeyboardVisibility(
  keyboardVisibility: KeyboardVisibility
): void {
  for (const instance of instances.values()) {
    applyKeyboardVisibility(instance, keyboardVisibility);
  }
}

function applyCodeBlockVisibility(
  instance: RenderInstance,
  codeBlockVisibility: CodeBlockVisibility
): void {
  setCodeCollapsed(instance, codeBlockVisibility === "collapsed");
}

function setCodeCollapsed(
  instance: RenderInstance,
  isCollapsed: boolean
): void {
  if (!(instance.preElement instanceof HTMLElement)) return;

  if (instance.preElementOriginalDisplay === null) {
    instance.preElementOriginalDisplay = instance.preElement.style.display;
  }

  instance.isCodeCollapsed = isCollapsed;
  instance.preElement.style.display = isCollapsed
    ? "none"
    : instance.preElementOriginalDisplay;
  updateCodeToggleButton(instance);
}

function updateCodeToggleButton(instance: RenderInstance): void {
  const label = instance.isCodeCollapsed
    ? "Show source code"
    : "Hide source code";

  instance.codeToggleButton.title = label;
  instance.codeToggleButton.setAttribute("aria-label", label);
  instance.codeToggleButton.setAttribute(
    "aria-pressed",
    String(!instance.isCodeCollapsed)
  );
}

export function updateCodeBlockVisibility(
  codeBlockVisibility: CodeBlockVisibility
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
  themeMode: ThemeMode
): RenderInstance {
  applyTheme(instance, themeMode);
  clearPlaybackHighlight(instance);

  // Re-render SVG
  const visualObj = abcjs.renderAbc(instance.scoreElement, abcText, {
    responsive: "resize",
    add_classes: true,
    clickListener: (abcElement: AbcElementRef) => {
      void seekToAbcElement(instance, abcElement);
    },
  });

  instance.abcText = abcText;
  instance.visualObj = visualObj;
  setupKeyboard(instance);

  // Re-initialize synth with new tune
  if (instance.synthControl) {
    instance.synthControl.pause();
    instance.synthControl = null;
  }
  initSynth(instance);

  return instance;
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
    if (instance.synthControl) {
      instance.synthControl.pause();
    }
    setCodeCollapsed(instance, false);
    instance.cleanup();
    instance.container.remove();
    instances.delete(preElement);
  }
}

/**
 * Check if a <pre> element already has a ChatMusic render.
 */
export function hasRender(preElement: Element): boolean {
  return instances.has(preElement);
}
