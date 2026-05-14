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
import {
  formatBpm,
  getBpmFromMillisecondsPerMeasure,
  getEffectiveBpm,
  getTuneBaseBpm,
  parseWarpPercent,
  type TempoTune,
} from "./tempo";
import { resolveTheme } from "./theme";

export interface RenderInstance {
  container: HTMLElement;
  scoreElement: HTMLElement;
  keyboardElement: HTMLElement;
  keyboardToggleButton: HTMLButtonElement;
  audioElement: HTMLElement;
  tempoMenuElement: HTMLElement;
  tempoInputElement: HTMLInputElement;
  tempoBpmElement: HTMLElement;
  codeToggleButton: HTMLButtonElement;
  preElement: Element;
  preElementOriginalDisplay: string | null;
  isCodeCollapsed: boolean;
  abcText: string;
  themeMode: ThemeMode;
  visualObj: abcjs.TuneObject[] | null;
  synthControl: abcjs.SynthObjectController | null;
  isKeyboardVisible: boolean;
  keyboardFocusStartPitch: number;
  keyboardFocusEndPitch: number;
  activePlaybackElements: Element[];
  activeKeyboardKeys: HTMLElement[];
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

interface MidiPitch {
  pitch?: number;
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

interface RenderElements {
  container: HTMLElement;
  scoreElement: HTMLElement;
  keyboardElement: HTMLElement;
  keyboardToggleButton: HTMLButtonElement;
  audioElement: HTMLElement;
  tempoMenuElement: HTMLElement;
  tempoInputElement: HTMLInputElement;
  tempoBpmElement: HTMLElement;
  codeToggleButton: HTMLButtonElement;
  cleanup: () => void;
}

const instances = new Map<Element, RenderInstance>();
const shadowStyles = `${abcjsAudioStyles}\n${chatmusicStyles}`;
const FULL_KEYBOARD_START_PITCH = 21;
const FULL_KEYBOARD_END_PITCH = 108;
const MIDDLE_C_PITCH = 60;
const WHITE_KEY_COUNT = 52;
const MIN_WHITE_KEY_WIDTH = 20;
const KEYBOARD_HORIZONTAL_PADDING = 16;

/**
 * Create the ChatMusic container with score area and audio area.
 * Uses abcjs SynthController's built-in UI for playback (has progress, warp, etc.)
 */
function createContainer(
  preElement: Element,
  themeMode: ThemeMode
): RenderElements {
  const host = document.createElement("div");
  host.className = "chatmusic-host";
  applyHostTheme(host, preElement, themeMode);

  const shadowRoot = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = shadowStyles;

  const container = document.createElement("div");
  container.className = "chatmusic-container";

  container.innerHTML = `
    <div class="chatmusic-header">
      <span class="chatmusic-label">ChatMusic</span>
      <div class="chatmusic-header-actions">
        <details class="chatmusic-tempo-menu" hidden>
          <summary class="chatmusic-tempo-button" title="Tempo" aria-label="Tempo">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 21L9.6 4.2A2 2 0 0 1 11.5 2h1A2 2 0 0 1 14.4 4.2L17 21" />
              <path d="M5 21h14" />
              <path d="M9 13v-1 M15 13v-1" />
              <path d="M12 21V8" />
              <circle cx="12" cy="13.5" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </summary>
          <div class="chatmusic-tempo-panel">
            <div class="chatmusic-tempo-readout" aria-live="polite">
              <span class="chatmusic-tempo-bpm-value">--</span>
              <span class="chatmusic-tempo-unit">BPM</span>
            </div>
            <label class="chatmusic-tempo-field">
              <input class="chatmusic-tempo-input" type="number" min="1" max="300" value="100" aria-label="Playback speed">
              <span>%</span>
            </label>
          </div>
        </details>
        <button class="chatmusic-fullscreen-button" type="button" title="Enter fullscreen" aria-label="Enter fullscreen" aria-pressed="false">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
          </svg>
        </button>
        <button class="chatmusic-keyboard-toggle-button" type="button" title="Hide keyboard" aria-label="Hide keyboard" aria-pressed="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/>
            <path d="M8 6v8 M12 6v8 M16 6v8"/>
            <path d="M6 14h12"/>
          </svg>
        </button>
        <button class="chatmusic-code-toggle-button" type="button" title="Hide source code" aria-label="Hide source code" aria-pressed="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="chatmusic-score"></div>
    <div class="chatmusic-keyboard"></div>
    <div class="chatmusic-audio"></div>
  `;

  const fullscreenButton = container.querySelector(
    ".chatmusic-fullscreen-button"
  ) as HTMLButtonElement;
  const cleanup = setupFullscreenButton(host, fullscreenButton);

  shadowRoot.append(style, container);

  // Insert after the <pre> element
  preElement.parentNode?.insertBefore(host, preElement.nextSibling);

  return {
    container: host,
    scoreElement: container.querySelector(".chatmusic-score") as HTMLElement,
    keyboardElement: container.querySelector(
      ".chatmusic-keyboard"
    ) as HTMLElement,
    keyboardToggleButton: container.querySelector(
      ".chatmusic-keyboard-toggle-button"
    ) as HTMLButtonElement,
    audioElement: container.querySelector(".chatmusic-audio") as HTMLElement,
    tempoMenuElement: container.querySelector(
      ".chatmusic-tempo-menu"
    ) as HTMLElement,
    tempoInputElement: container.querySelector(
      ".chatmusic-tempo-input"
    ) as HTMLInputElement,
    tempoBpmElement: container.querySelector(
      ".chatmusic-tempo-bpm-value"
    ) as HTMLElement,
    codeToggleButton: container.querySelector(
      ".chatmusic-code-toggle-button"
    ) as HTMLButtonElement,
    cleanup,
  };
}

function setupFullscreenButton(
  host: HTMLElement,
  button: HTMLButtonElement
): () => void {
  if (!document.fullscreenEnabled || !host.requestFullscreen) {
    button.hidden = true;
    return () => {};
  }

  const updateButtonState = () => {
    const isFullscreen = document.fullscreenElement === host;
    const label = isFullscreen ? "Exit fullscreen" : "Enter fullscreen";

    button.title = label;
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", String(isFullscreen));
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === host) {
        await document.exitFullscreen();
      } else {
        await host.requestFullscreen();
      }
    } catch (err) {
      console.warn("[ChatMusic] Fullscreen toggle failed:", err);
    }
  };

  button.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", updateButtonState);
  updateButtonState();

  return () => {
    button.removeEventListener("click", toggleFullscreen);
    document.removeEventListener("fullscreenchange", updateButtonState);
  };
}

function applyHostTheme(
  host: HTMLElement,
  preElement: Element,
  themeMode: ThemeMode
): void {
  const resolvedTheme = resolveTheme(preElement, themeMode);

  host.dataset.chatmusicTheme = resolvedTheme;
  host.dataset.chatmusicThemeMode = themeMode;
  host.style.colorScheme = resolvedTheme;
}

/**
 * Initialize the abcjs SynthController for playback.
 * This creates the full built-in audio UI (play/pause, progress, warp, restart).
 */
async function initSynth(instance: RenderInstance): Promise<void> {
  if (!instance.visualObj || instance.visualObj.length === 0) return;

  const audioEl = instance.audioElement;
  instance.tempoMenuElement.hidden = true;
  instance.tempoBpmElement.textContent = "--";
  instance.tempoInputElement.oninput = null;
  instance.tempoInputElement.onchange = null;

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

    await synthControl.setTune(instance.visualObj[0], false);
    setupTempoControl(instance);
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
  updateTempoBpmDisplay(instance, event);
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
  for (const key of instance.activeKeyboardKeys) {
    key.classList.remove("chatmusic-key-active");
  }
  instance.activePlaybackElements = [];
  instance.activeKeyboardKeys = [];
}

function setupKeyboard(instance: RenderInstance): void {
  const pitches = getTuneMidiPitches(instance);
  const tunePitches = new Set(pitches);
  instance.keyboardElement.replaceChildren();
  instance.activeKeyboardKeys = [];
  instance.keyboardFocusStartPitch = pitches[0] ?? MIDDLE_C_PITCH;
  instance.keyboardFocusEndPitch = pitches[pitches.length - 1] ?? MIDDLE_C_PITCH;

  // Keep the piano geography stable; tune pitches only affect markers and scroll.
  for (
    let pitch = FULL_KEYBOARD_START_PITCH;
    pitch <= FULL_KEYBOARD_END_PITCH;
    pitch++
  ) {
    const key = document.createElement("div");
    const isBlack = isBlackPianoKey(pitch);

    key.className = `chatmusic-piano-key ${
      isBlack ? "chatmusic-piano-key-black" : "chatmusic-piano-key-white"
    }`;
    if (tunePitches.has(pitch)) key.classList.add("chatmusic-key-in-tune");
    if (pitch === MIDDLE_C_PITCH) {
      key.classList.add("chatmusic-key-middle-c");
    }
    key.dataset.pitch = String(pitch);
    key.dataset.note = getMidiNoteName(pitch);
    key.title = getMidiNoteName(pitch);
    instance.keyboardElement.append(key);
  }

  syncKeyboardKeySize(instance);
  setKeyboardVisible(instance, instance.isKeyboardVisible);
}

function setKeyboardVisible(
  instance: RenderInstance,
  isKeyboardVisible: boolean
): void {
  instance.isKeyboardVisible = isKeyboardVisible;
  instance.keyboardElement.hidden = !isKeyboardVisible;
  updateKeyboardToggleButton(instance);
  if (isKeyboardVisible) {
    syncKeyboardKeySize(instance);
    scrollKeyboardToFocusRange(instance);
  }
}

function syncKeyboardKeySize(instance: RenderInstance): void {
  const availableWidth = Math.max(
    0,
    instance.keyboardElement.clientWidth - KEYBOARD_HORIZONTAL_PADDING
  );
  const whiteKeyWidth = Math.max(
    MIN_WHITE_KEY_WIDTH,
    availableWidth / WHITE_KEY_COUNT
  );
  const blackKeyWidth = whiteKeyWidth * 0.6;

  instance.keyboardElement.style.setProperty(
    "--chatmusic-white-key-width",
    `${whiteKeyWidth}px`
  );
  instance.keyboardElement.style.setProperty(
    "--chatmusic-black-key-width",
    `${blackKeyWidth}px`
  );
  instance.keyboardElement.style.setProperty(
    "--chatmusic-black-key-offset",
    `${-blackKeyWidth / 2}px`
  );
}

function updateKeyboardToggleButton(instance: RenderInstance): void {
  const label = instance.isKeyboardVisible ? "Hide keyboard" : "Show keyboard";

  instance.keyboardToggleButton.title = label;
  instance.keyboardToggleButton.setAttribute("aria-label", label);
  instance.keyboardToggleButton.setAttribute(
    "aria-pressed",
    String(instance.isKeyboardVisible)
  );
}

function scrollKeyboardToFocusRange(instance: RenderInstance): void {
  const startKey = instance.keyboardElement.querySelector(
    `[data-pitch="${instance.keyboardFocusStartPitch}"]`
  );
  const endKey = instance.keyboardElement.querySelector(
    `[data-pitch="${instance.keyboardFocusEndPitch}"]`
  );
  if (!(startKey instanceof HTMLElement) || !(endKey instanceof HTMLElement)) {
    return;
  }

  requestAnimationFrame(() => {
    if (instance.keyboardElement.hidden) return;

    const start = startKey.offsetLeft;
    const end = endKey.offsetLeft + endKey.offsetWidth;
    const center = (start + end) / 2;
    const scrollLeft = Math.max(
      0,
      center - instance.keyboardElement.clientWidth / 2
    );

    instance.keyboardElement.scrollTo({ left: scrollLeft });
  });
}

function highlightKeyboardPitches(
  instance: RenderInstance,
  midiPitches: MidiPitch[]
): void {
  const activeKeys: HTMLElement[] = [];

  for (const midiPitch of midiPitches) {
    if (midiPitch.pitch === undefined) continue;

    const key = instance.keyboardElement.querySelector(
      `[data-pitch="${midiPitch.pitch}"]`
    );
    if (key instanceof HTMLElement) {
      key.classList.add("chatmusic-key-active");
      activeKeys.push(key);
    }
  }

  instance.activeKeyboardKeys = activeKeys;
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

function isBlackPianoKey(pitch: number): boolean {
  return [1, 3, 6, 8, 10].includes(pitch % 12);
}

function getMidiNoteName(pitch: number): string {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(pitch / 12) - 1;

  return `${noteNames[pitch % 12]}${octave}`;
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

  instance.tempoInputElement.value = nativeTempoInput.value;
  instance.tempoInputElement.min = nativeTempoInput.min;
  instance.tempoInputElement.max = nativeTempoInput.max;
  const syncTempo = () => {
    if (parseWarpPercent(instance.tempoInputElement.value) === null) {
      updateTempoBpmDisplay(instance);
      return;
    }

    nativeTempoInput.value = instance.tempoInputElement.value;
    nativeTempoInput.dispatchEvent(new Event("change", { bubbles: true }));
    updateTempoBpmDisplay(instance);
  };
  instance.tempoInputElement.oninput = syncTempo;
  instance.tempoInputElement.onchange = syncTempo;
  updateTempoBpmDisplay(instance);
  instance.tempoMenuElement.hidden = false;
}

function updateTempoBpmDisplay(
  instance: RenderInstance,
  event?: TimingEvent
): void {
  const tune = instance.visualObj?.[0] as TempoTune | undefined;
  const eventBpm = getBpmFromMillisecondsPerMeasure(
    tune,
    event?.millisecondsPerMeasure
  );
  const baseBpm = eventBpm ?? getTuneBaseBpm(tune);
  const effectiveBpm = eventBpm ?? getEffectiveBpm(
    baseBpm,
    parseWarpPercent(instance.tempoInputElement.value)
  );
  const bpmText = formatBpm(effectiveBpm);
  const button = instance.tempoMenuElement.querySelector(
    ".chatmusic-tempo-button"
  );
  const label = effectiveBpm ? `Tempo: ${bpmText} BPM` : "Tempo";

  instance.tempoBpmElement.textContent = bpmText;
  button?.setAttribute("title", label);
  button?.setAttribute("aria-label", label);
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

  const elements = createContainer(preElement, themeMode);

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
    keyboardElement: elements.keyboardElement,
    keyboardToggleButton: elements.keyboardToggleButton,
    audioElement: elements.audioElement,
    tempoMenuElement: elements.tempoMenuElement,
    tempoInputElement: elements.tempoInputElement,
    tempoBpmElement: elements.tempoBpmElement,
    codeToggleButton: elements.codeToggleButton,
    preElement,
    preElementOriginalDisplay: null,
    isCodeCollapsed: false,
    abcText,
    themeMode,
    visualObj,
    synthControl: null,
    isKeyboardVisible: keyboardVisibility === "visible",
    keyboardFocusStartPitch: MIDDLE_C_PITCH,
    keyboardFocusEndPitch: MIDDLE_C_PITCH,
    activePlaybackElements: [],
    activeKeyboardKeys: [],
    cleanup: elements.cleanup,
  };

  setupCodeToggleButton(instance);
  setupKeyboardToggleButton(instance);
  setupKeyboardResizeObserver(instance);
  applyCodeBlockVisibility(instance, codeBlockVisibility);
  applyKeyboardVisibility(instance, keyboardVisibility);
  setupKeyboard(instance);
  instances.set(preElement, instance);

  // Initialize synth (async, non-blocking)
  initSynth(instance);

  return instance;
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

function setupKeyboardToggleButton(instance: RenderInstance): void {
  const toggleKeyboard = () => {
    setKeyboardVisible(instance, !instance.isKeyboardVisible);
  };
  const previousCleanup = instance.cleanup;

  instance.keyboardToggleButton.addEventListener("click", toggleKeyboard);
  instance.cleanup = () => {
    instance.keyboardToggleButton.removeEventListener("click", toggleKeyboard);
    previousCleanup();
  };
}

function setupKeyboardResizeObserver(instance: RenderInstance): void {
  if (typeof ResizeObserver === "undefined") return;

  const observer = new ResizeObserver(() => {
    syncKeyboardKeySize(instance);
    if (instance.isKeyboardVisible) scrollKeyboardToFocusRange(instance);
  });
  const previousCleanup = instance.cleanup;

  observer.observe(instance.keyboardElement);
  instance.cleanup = () => {
    observer.disconnect();
    previousCleanup();
  };
}

function applyKeyboardVisibility(
  instance: RenderInstance,
  keyboardVisibility: KeyboardVisibility
): void {
  setKeyboardVisible(instance, keyboardVisibility === "visible");
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
  applyHostTheme(instance.container, instance.preElement, themeMode);
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
