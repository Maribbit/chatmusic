/**
 * ABC notation renderer using abcjs.
 * Creates sheet music SVG and playback controls below detected code blocks.
 */
import abcjs from "abcjs";
import abcjsAudioStyles from "abcjs/abcjs-audio.css?inline";
import chatmusicStyles from "./styles.css?inline";
import type { ChatMusicCodeToggleElement } from "./code-toggle";
import {
  DEFAULT_CODE_BLOCK_VISIBILITY,
  DEFAULT_KEYBOARD_VISIBILITY,
  DEFAULT_THEME_MODE,
  type CodeBlockVisibility,
  type KeyboardVisibility,
  type ThemeMode,
} from "../shared/settings";
import {
  formatAbcQualityReportForAi,
  validateAbcSource,
} from "../shared/abc-quality/validate";
import { getExtensionRuntime } from "../shared/extension-runtime";
import { createOpenStudioMessage } from "../shared/messages";
import {
  downloadMidi,
  getMidiDownloadFilename,
} from "../shared/abc-midi-export";
import type { ChatMusicQualityElement } from "./quality-panel";
import {
  createDurationControl,
  type DurationControl,
} from "./duration-control";
import { getTuneDurationSeconds } from "./duration";
import {
  createKeyboardController,
  type KeyboardController,
  type MidiPitch,
} from "./keyboard";
import { downloadSvg, getScoreSvg, getSvgDownloadFilename } from "./svg-export";
import { getLocalPianoSynthOptions, playLocalPianoPitch } from "./soundfont";
import { createTempoControl, type TempoControl } from "./tempo-control";
import { applyRenderViewTheme, createRenderView } from "./view";

export interface RenderInstance {
  container: HTMLElement;
  scoreElement: HTMLElement;
  keyboard: KeyboardController;
  audioElement: HTMLElement;
  qualityElement: ChatMusicQualityElement;
  tempoControl: TempoControl;
  durationControl: DurationControl;
  codeToggleElement: ChatMusicCodeToggleElement;
  preElement: Element;
  preElementOriginalDisplay: string | null;
  isCodeCollapsed: boolean;
  abcText: string;
  themeMode: ThemeMode;
  visualObj: abcjs.TuneObject[] | null;
  renderedStaffWidth: number;
  synthControl: abcjs.SynthObjectController | null;
  activePlaybackElements: Element[];
  scoreResizeObserver: ResizeObserver | null;
  scoreResizeTimer: number | undefined;
  pendingPlaybackSeekPercent: number | null;
  pendingPlaybackSeekPromise: Promise<unknown> | null;
  progressDragCleanup: (() => void) | null;
  onSourceHighlight: ((ranges: SourceHighlightRange[]) => void) | undefined;
  cleanup: () => void;
}

export interface SourceHighlightRange {
  start: number;
  end: number;
}

export interface RenderAbcOptions {
  onSourceHighlight?: (ranges: SourceHighlightRange[]) => void;
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

type SeekableSynthControl = Omit<abcjs.SynthObjectController, "setProgress"> & {
  isLoaded?: boolean;
  play?: () => Promise<unknown>;
  seek?: (percent: number) => void;
  setProgress?: (percent: number, totalTime?: number) => void;
  runWhenReady?: (fn: () => Promise<{ status: string }>) => Promise<unknown>;
};

const instances = new Map<Element, RenderInstance>();
const shadowStyles = `${abcjsAudioStyles}\n${chatmusicStyles}`;
const DEFAULT_STAFF_WIDTH = 740;
const MIN_STAFF_WIDTH = 320;
const SCORE_WIDTH_PADDING = 24;
const STAFF_WIDTH_CHANGE_THRESHOLD = 24;
const SCORE_RESIZE_DEBOUNCE_MS = 180;
const SCORE_WRAP_OPTIONS: abcjs.Wrap = {
  preferredMeasuresPerLine: 4,
  minSpacing: 1.2,
  maxSpacing: 2.4,
  lastLineLimit: 1.4,
  minSpacingLimit: 1,
};

/**
 * Initialize the abcjs SynthController for playback.
 * This creates the full built-in audio UI (play/pause, progress, warp, restart).
 */
async function initSynth(instance: RenderInstance): Promise<void> {
  if (!instance.visualObj || instance.visualObj.length === 0) return;

  const audioEl = instance.audioElement;
  instance.progressDragCleanup?.();
  instance.progressDragCleanup = null;
  instance.tempoControl.reset();
  instance.durationControl.reset();

  if (!abcjs.synth.supportsAudio()) {
    audioEl.innerHTML =
      '<p class="chatmusic-no-audio">Audio playback not supported in this browser.</p>';
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
      getLocalPianoSynthOptions(),
    );
    instance.synthControl = synthControl;
    instance.progressDragCleanup = setupProgressDrag(instance);
    setupDurationControl(instance);
    setupTempoControl(instance);
  } catch (err) {
    console.error("[ChatMusic] Synth init error:", err);
    audioEl.innerHTML =
      '<p class="chatmusic-no-audio">Failed to initialize audio playback.</p>';
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
  event: TimingEvent,
): void {
  instance.tempoControl.update(event);
  clearPlaybackHighlight(instance, false);

  const elements = flattenTimingElements(event.elements);
  for (const element of elements) {
    element.classList.add("chatmusic-note-playing");
  }

  instance.activePlaybackElements = elements;
  highlightKeyboardPitches(instance, event.midiPitches ?? []);
  instance.onSourceHighlight?.(
    getTimingEventSourceRanges(event, instance.abcText.length),
  );
}

function clearPlaybackHighlight(
  instance: RenderInstance,
  clearSourceHighlight = true,
): void {
  for (const element of instance.activePlaybackElements) {
    element.classList.remove("chatmusic-note-playing");
  }
  instance.keyboard.clearActiveKeys();
  instance.activePlaybackElements = [];
  if (clearSourceHighlight) instance.onSourceHighlight?.([]);
}

function setupKeyboard(instance: RenderInstance): void {
  instance.keyboard.setup(getTuneMidiPitches(instance));
}

function highlightKeyboardPitches(
  instance: RenderInstance,
  midiPitches: MidiPitch[],
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

function getTimingEventSourceRanges(
  event: TimingEvent,
  sourceLength: number,
): SourceHighlightRange[] {
  const starts = event.startCharArray ?? [event.startChar ?? null];
  const ends = event.endCharArray ?? [event.endChar ?? null];
  const ranges: SourceHighlightRange[] = [];

  for (let index = 0; index < Math.max(starts.length, ends.length); index++) {
    const start = starts[index];
    const end = ends[index];
    if (typeof start !== "number" || typeof end !== "number") continue;
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;

    const boundedStart = Math.max(0, Math.min(sourceLength, start));
    const boundedEnd = Math.max(0, Math.min(sourceLength, end));
    if (boundedEnd <= boundedStart) continue;
    ranges.push({ start: boundedStart, end: boundedEnd });
  }

  return ranges.filter(
    (range, index) =>
      ranges.findIndex(
        (candidate) =>
          candidate.start === range.start && candidate.end === range.end,
      ) === index,
  );
}

export function getSourceHighlightRangesForTest(
  event: TimingEvent,
  sourceLength: number,
): SourceHighlightRange[] {
  return getTimingEventSourceRanges(event, sourceLength);
}

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

function getSeekPercentForElement(
  instance: RenderInstance,
  abcElement: AbcElementRef,
): number | null {
  if (abcElement.startChar === undefined || abcElement.endChar === undefined) {
    return null;
  }

  const timingEvents = getTimingEvents(instance);
  const lastEvent = timingEvents[timingEvents.length - 1];
  if (!lastEvent || lastEvent.milliseconds <= 0) return null;

  const matchingEvent = timingEvents.find((event) =>
    timingEventMatchesElement(event, abcElement),
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
  abcElement: AbcElementRef,
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
    ".abcjs-midi-tempo",
  ) as HTMLInputElement | null;

  if (!nativeTempoInput) return;

  instance.tempoControl.connect(nativeTempoInput, instance.visualObj?.[0]);
}

function setupDurationControl(instance: RenderInstance): void {
  instance.durationControl.mount(instance.audioElement);
  instance.durationControl.setDuration(
    getTuneDurationSeconds(instance.visualObj?.[0], getTimingEvents(instance)),
  );
}

function setupProgressDrag(instance: RenderInstance): (() => void) | null {
  const progressBar = instance.audioElement.querySelector<HTMLButtonElement>(
    ".abcjs-midi-progress-background",
  );
  const playButton =
    instance.audioElement.querySelector<HTMLButtonElement>(".abcjs-midi-start");
  if (!progressBar) return null;

  let isDragging = false;

  const seekFromClientX = (clientX: number) => {
    const percent = getProgressPercent(progressBar, clientX);
    if (percent !== null) seekPlaybackToPercent(instance, percent);
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;

    isDragging = true;
    progressBar.classList.add("chatmusic-progress-dragging");
    if (typeof event.pointerId === "number") {
      progressBar.setPointerCapture?.(event.pointerId);
    }
    event.preventDefault();
    seekFromClientX(event.clientX);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!isDragging) return;

    event.preventDefault();
    seekFromClientX(event.clientX);
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (!isDragging) return;

    event.preventDefault();
    seekFromClientX(event.clientX);
    isDragging = false;
    progressBar.classList.remove("chatmusic-progress-dragging");
    if (typeof event.pointerId === "number") {
      progressBar.releasePointerCapture?.(event.pointerId);
    }
  };

  const handlePointerCancel = (event: PointerEvent) => {
    if (!isDragging) return;

    isDragging = false;
    progressBar.classList.remove("chatmusic-progress-dragging");
    if (typeof event.pointerId === "number") {
      progressBar.releasePointerCapture?.(event.pointerId);
    }
  };

  const handleClick = (event: MouseEvent) => {
    if (event.detail === 0) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    seekFromClientX(event.clientX);
  };

  const handlePlayClick = (event: MouseEvent) => {
    const hasPendingSeek =
      instance.pendingPlaybackSeekPercent !== null ||
      instance.pendingPlaybackSeekPromise !== null;
    const synthControl = instance.synthControl as SeekableSynthControl | null;
    if (!hasPendingSeek || !synthControl || synthControl.isLoaded === true) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    void playAfterPendingSeek(instance);
  };

  progressBar.addEventListener("pointerdown", handlePointerDown);
  progressBar.addEventListener("pointermove", handlePointerMove);
  progressBar.addEventListener("pointerup", handlePointerUp);
  progressBar.addEventListener("pointercancel", handlePointerCancel);
  progressBar.addEventListener("click", handleClick, true);
  playButton?.addEventListener("click", handlePlayClick, true);

  return () => {
    progressBar.removeEventListener("pointerdown", handlePointerDown);
    progressBar.removeEventListener("pointermove", handlePointerMove);
    progressBar.removeEventListener("pointerup", handlePointerUp);
    progressBar.removeEventListener("pointercancel", handlePointerCancel);
    progressBar.removeEventListener("click", handleClick, true);
    playButton?.removeEventListener("click", handlePlayClick, true);
    progressBar.classList.remove("chatmusic-progress-dragging");
  };
}

function getProgressPercent(
  progressBar: HTMLElement,
  clientX: number,
): number | null {
  const rect = progressBar.getBoundingClientRect();
  const width = rect.width || progressBar.clientWidth;
  if (!Number.isFinite(clientX) || width <= 0) return null;

  return clampProgressPercent((clientX - rect.left) / width);
}

function clampProgressPercent(percent: number): number {
  return Math.min(1, Math.max(0, percent));
}

function seekPlaybackToPercent(
  instance: RenderInstance,
  percent: number,
): void {
  const synthControl = instance.synthControl as SeekableSynthControl | null;
  if (!synthControl) return;

  const clampedPercent = clampProgressPercent(percent);
  instance.pendingPlaybackSeekPercent = clampedPercent;
  setPlaybackProgress(instance, clampedPercent);

  if (synthControl.isLoaded === true) {
    synthControl.seek?.(clampedPercent);
    instance.pendingPlaybackSeekPercent = null;
    return;
  }

  void flushPendingPlaybackSeek(instance);
}

async function playAfterPendingSeek(instance: RenderInstance): Promise<void> {
  const synthControl = instance.synthControl as SeekableSynthControl | null;
  if (!synthControl) return;

  await flushPendingPlaybackSeek(instance);
  await synthControl.play?.();
}

function flushPendingPlaybackSeek(instance: RenderInstance): Promise<unknown> {
  if (instance.pendingPlaybackSeekPromise) {
    return instance.pendingPlaybackSeekPromise;
  }

  const synthControl = instance.synthControl as SeekableSynthControl | null;
  if (!synthControl || instance.pendingPlaybackSeekPercent === null) {
    return Promise.resolve();
  }

  const applyPendingSeek = () => {
    const pendingPercent = instance.pendingPlaybackSeekPercent;
    if (pendingPercent !== null) {
      setPlaybackProgress(instance, pendingPercent);
      synthControl.seek?.(pendingPercent);
      instance.pendingPlaybackSeekPercent = null;
    }

    return Promise.resolve({ status: "ok" });
  };

  const seekPromise = synthControl.runWhenReady
    ? synthControl.runWhenReady(applyPendingSeek)
    : applyPendingSeek();

  instance.pendingPlaybackSeekPromise = Promise.resolve(seekPromise).finally(
    () => {
      instance.pendingPlaybackSeekPromise = null;
    },
  );

  return instance.pendingPlaybackSeekPromise;
}

function setPlaybackProgress(instance: RenderInstance, percent: number): void {
  const synthControl = instance.synthControl as SeekableSynthControl | null;
  if (!synthControl) return;

  const durationSeconds = getTuneDurationSeconds(
    instance.visualObj?.[0],
    getTimingEvents(instance),
  );
  if (synthControl.setProgress) {
    synthControl.setProgress(
      percent,
      durationSeconds ? durationSeconds * 1000 : 0,
    );
  } else {
    updateProgressThumb(instance.audioElement, percent);
  }
}

function updateProgressThumb(audioElement: HTMLElement, percent: number): void {
  const progressBar = audioElement.querySelector<HTMLElement>(
    ".abcjs-midi-progress-background",
  );
  const progressThumb = audioElement.querySelector<HTMLElement>(
    ".abcjs-midi-progress-indicator",
  );
  if (!progressBar || !progressThumb) return;

  progressThumb.style.left = `${progressBar.clientWidth * percent}px`;
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
  setupScoreResizeObserver(instance);

  // Initialize synth (async, non-blocking)
  initSynth(instance);

  return instance;
}

function playKeyboardPitch(pitch: number): void {
  playLocalPianoPitch(pitch).catch((err: unknown) => {
    console.warn("[ChatMusic] Keyboard pitch playback failed:", err);
  });
}

function exportScore(instance: RenderInstance): void {
  const svg = getScoreSvg(instance.scoreElement);
  if (!svg) return;

  downloadSvg(svg, getSvgDownloadFilename(instance.abcText));
}

function exportMidi(instance: RenderInstance): void {
  const tune = instance.visualObj?.[0];
  if (!tune) return;

  try {
    downloadMidi(tune, getMidiDownloadFilename(instance.abcText));
  } catch (error) {
    console.warn("[ChatMusic] MIDI export failed:", error);
  }
}

function copyQualityFeedback(instance: RenderInstance): void {
  const report = validateAbcSource(instance.abcText);
  const feedback = formatAbcQualityReportForAi(report);

  navigator.clipboard.writeText(feedback).catch((error: unknown) => {
    console.warn("[ChatMusic] Copy ABC feedback failed:", error);
  });
}

function updateQualityPanel(instance: RenderInstance): void {
  const report = validateAbcSource(instance.abcText);
  instance.qualityElement.setDiagnostics(
    report.status === "ok" ? [] : report.diagnostics,
  );
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

function renderScore(
  scoreElement: HTMLElement,
  abcText: string,
  clickListener: (abcElement: AbcElementRef) => void,
): { visualObj: abcjs.TuneObject[]; staffWidth: number } {
  const staffWidth = getScoreStaffWidth(scoreElement);
  const visualObj = abcjs.renderAbc(scoreElement, abcText, {
    responsive: "resize",
    add_classes: true,
    staffwidth: staffWidth,
    wrap: { ...SCORE_WRAP_OPTIONS },
    clickListener,
  });

  return { visualObj, staffWidth };
}

function getScoreStaffWidth(scoreElement: HTMLElement): number {
  const measuredWidth = Math.floor(
    scoreElement.getBoundingClientRect().width || scoreElement.clientWidth,
  );
  const availableWidth = measuredWidth || DEFAULT_STAFF_WIDTH;

  return Math.max(MIN_STAFF_WIDTH, availableWidth - SCORE_WIDTH_PADDING);
}

function setupScoreResizeObserver(instance: RenderInstance): void {
  if (typeof ResizeObserver === "undefined") return;

  instance.scoreResizeObserver = new ResizeObserver(() => {
    if (instance.scoreResizeTimer !== undefined) {
      window.clearTimeout(instance.scoreResizeTimer);
    }

    instance.scoreResizeTimer = window.setTimeout(() => {
      instance.scoreResizeTimer = undefined;
      rerenderScoreForLayout(instance);
    }, SCORE_RESIZE_DEBOUNCE_MS);
  });
  instance.scoreResizeObserver.observe(instance.scoreElement);
}

function rerenderScoreForLayout(instance: RenderInstance): void {
  if (!instance.container.isConnected) return;

  const nextStaffWidth = getScoreStaffWidth(instance.scoreElement);
  if (
    Math.abs(nextStaffWidth - instance.renderedStaffWidth) <
    STAFF_WIDTH_CHANGE_THRESHOLD
  ) {
    return;
  }

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

function disposeScoreResizeObserver(instance: RenderInstance): void {
  if (instance.scoreResizeTimer !== undefined) {
    window.clearTimeout(instance.scoreResizeTimer);
    instance.scoreResizeTimer = undefined;
  }
  instance.scoreResizeObserver?.disconnect();
  instance.scoreResizeObserver = null;
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
