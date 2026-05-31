import { LitElement, html, type TemplateResult } from "lit";

export interface MidiPitch {
  pitch?: number;
}

export interface KeyboardController {
  setup(pitches: number[]): void;
  setVisible(isVisible: boolean): void;
  highlightPitches(midiPitches: MidiPitch[]): void;
  clearActiveKeys(): void;
  syncSize(): void;
  dispose(): void;
}

export type KeyboardPitchHandler = (pitch: number) => void | Promise<void>;

const FULL_KEYBOARD_START_PITCH = 21;
const FULL_KEYBOARD_END_PITCH = 108;
const MIDDLE_C_PITCH = 60;
const WHITE_KEY_COUNT = 52;
const MIN_WHITE_KEY_WIDTH = 20;
const MIN_WHITE_KEY_HEIGHT = 52;
const MAX_WHITE_KEY_HEIGHT = 96;
const WHITE_KEY_HEIGHT_RATIO = 3;
const KEYBOARD_HORIZONTAL_PADDING = 16;
const AUDITION_HIGHLIGHT_MS = 220;
const KEYBOARD_TAG_NAME = "chatmusic-keyboard";
const KEYBOARD_PITCH_EVENT = "chatmusic-pitch-trigger";

interface KeyboardPitchEventDetail {
  pitch: number;
}

export function createKeyboardController(
  keyboardElement: HTMLElement,
  toggleButton: HTMLButtonElement,
  initialVisibility: boolean,
  onPitchTrigger?: KeyboardPitchHandler,
): KeyboardController {
  const keyboard = keyboardElement as ChatMusicKeyboardElement;
  let isVisible = initialVisibility;

  const updateToggleButton = () => {
    const label = isVisible ? "Hide keyboard" : "Show keyboard";

    toggleButton.title = label;
    toggleButton.setAttribute("aria-label", label);
    toggleButton.setAttribute("aria-pressed", String(isVisible));
  };

  const setVisible = (nextVisibility: boolean) => {
    isVisible = nextVisibility;
    keyboard.setVisible(isVisible);
    updateToggleButton();
  };

  const toggleKeyboard = () => setVisible(!isVisible);
  const triggerKeyboardPitch = (event: Event) => {
    if (!onPitchTrigger) return;

    const pitch = (event as CustomEvent<KeyboardPitchEventDetail>).detail
      ?.pitch;
    if (Number.isInteger(pitch)) void onPitchTrigger(pitch);
  };

  toggleButton.addEventListener("click", toggleKeyboard);
  keyboard.addEventListener(KEYBOARD_PITCH_EVENT, triggerKeyboardPitch);
  setVisible(initialVisibility);

  return {
    setup: (pitches: number[]) => keyboard.setup(pitches),
    setVisible,
    highlightPitches: (midiPitches: MidiPitch[]) =>
      keyboard.highlightPitches(midiPitches),
    clearActiveKeys: () => keyboard.clearActiveKeys(),
    syncSize: () => keyboard.syncSize(),
    dispose: () => {
      toggleButton.removeEventListener("click", toggleKeyboard);
      keyboard.removeEventListener(KEYBOARD_PITCH_EVENT, triggerKeyboardPitch);
      keyboard.dispose();
    },
  };
}

export class ChatMusicKeyboardElement extends LitElement {
  static properties = {
    tunePitches: { attribute: false },
    activePitches: { attribute: false },
    auditionPitches: { attribute: false },
  };

  tunePitches: number[] = [];
  activePitches: number[] = [];
  auditionPitches: number[] = [];

  private focusStartPitch = MIDDLE_C_PITCH;
  private focusEndPitch = MIDDLE_C_PITCH;
  private auditionTimers = new Map<number, number>();
  private resizeObserver: ResizeObserver | null = null;

  protected createRenderRoot(): HTMLElement {
    return this;
  }

  connectedCallback(): void {
    super.connectedCallback();

    this.resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            this.syncSize();
            if (!this.hidden) this.scrollToFocusRange();
          });
    this.resizeObserver?.observe(this);
  }

  disconnectedCallback(): void {
    this.dispose();
    super.disconnectedCallback();
  }

  setup(pitches: number[]): void {
    this.clearAuditionPitches();
    this.tunePitches = [...pitches];
    this.activePitches = [];
    this.focusStartPitch = pitches[0] ?? MIDDLE_C_PITCH;
    this.focusEndPitch = pitches[pitches.length - 1] ?? MIDDLE_C_PITCH;

    this.scheduleVisibleLayoutSync();
  }

  setVisible(isVisible: boolean): void {
    this.hidden = !isVisible;
    if (isVisible) this.scheduleVisibleLayoutSync();
  }

  highlightPitches(midiPitches: MidiPitch[]): void {
    this.activePitches = midiPitches.flatMap((midiPitch) =>
      midiPitch.pitch === undefined ? [] : [midiPitch.pitch],
    );
  }

  clearActiveKeys(): void {
    this.activePitches = [];
  }

  syncSize(): void {
    const availableWidth = Math.max(
      0,
      this.clientWidth - KEYBOARD_HORIZONTAL_PADDING,
    );
    const whiteKeyWidth = Math.max(
      MIN_WHITE_KEY_WIDTH,
      availableWidth / WHITE_KEY_COUNT,
    );
    const blackKeyWidth = whiteKeyWidth * 0.6;
    const whiteKeyHeight = Math.min(
      MAX_WHITE_KEY_HEIGHT,
      Math.max(MIN_WHITE_KEY_HEIGHT, whiteKeyWidth * WHITE_KEY_HEIGHT_RATIO),
    );
    const blackKeyHeight = whiteKeyHeight * 0.62;

    this.style.setProperty("--chatmusic-white-key-width", `${whiteKeyWidth}px`);
    this.style.setProperty(
      "--chatmusic-white-key-height",
      `${whiteKeyHeight}px`,
    );
    this.style.setProperty("--chatmusic-black-key-width", `${blackKeyWidth}px`);
    this.style.setProperty(
      "--chatmusic-black-key-height",
      `${blackKeyHeight}px`,
    );
    this.style.setProperty(
      "--chatmusic-black-key-offset",
      `${-blackKeyWidth / 2}px`,
    );
  }

  dispose(): void {
    this.clearAuditionPitches();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  protected render(): TemplateResult {
    const tunePitches = new Set(this.tunePitches);
    const activePitches = new Set(this.activePitches);
    const auditionPitches = new Set(this.auditionPitches);

    return html`${this.getKeyboardPitches().map((pitch) =>
      this.renderPianoKey(pitch, tunePitches, activePitches, auditionPitches),
    )}`;
  }

  private getKeyboardPitches(): number[] {
    const pitches: number[] = [];

    for (
      let pitch = FULL_KEYBOARD_START_PITCH;
      pitch <= FULL_KEYBOARD_END_PITCH;
      pitch++
    ) {
      pitches.push(pitch);
    }

    return pitches;
  }

  private renderPianoKey(
    pitch: number,
    tunePitches: Set<number>,
    activePitches: Set<number>,
    auditionPitches: Set<number>,
  ): TemplateResult {
    const noteName = getMidiNoteName(pitch);

    return html`
      <div
        class=${getPianoKeyClassName(
          pitch,
          tunePitches,
          activePitches,
          auditionPitches,
        )}
        data-pitch=${String(pitch)}
        data-note=${noteName}
        title=${noteName}
        role="button"
        aria-label=${`Play ${noteName}`}
        @click=${() => this.triggerKeyboardPitch(pitch)}
      ></div>
    `;
  }

  private triggerKeyboardPitch(pitch: number): void {
    this.flashAuditionPitch(pitch);
    this.dispatchEvent(
      new CustomEvent<KeyboardPitchEventDetail>(KEYBOARD_PITCH_EVENT, {
        bubbles: true,
        composed: true,
        detail: { pitch },
      }),
    );
  }

  private flashAuditionPitch(pitch: number): void {
    const existingTimerId = this.auditionTimers.get(pitch);
    if (existingTimerId !== undefined) window.clearTimeout(existingTimerId);

    this.auditionPitches = [...new Set([...this.auditionPitches, pitch])];
    this.auditionTimers.set(
      pitch,
      window.setTimeout(() => {
        this.auditionPitches = this.auditionPitches.filter(
          (activePitch) => activePitch !== pitch,
        );
        this.auditionTimers.delete(pitch);
      }, AUDITION_HIGHLIGHT_MS),
    );
  }

  private clearAuditionPitches(): void {
    for (const timerId of this.auditionTimers.values()) {
      window.clearTimeout(timerId);
    }
    this.auditionTimers.clear();
    this.auditionPitches = [];
  }

  private scheduleVisibleLayoutSync(): void {
    void this.updateComplete.then(() => {
      this.syncSize();
      if (!this.hidden) this.scrollToFocusRange();
    });
  }

  private scrollToFocusRange(): void {
    const startKey = this.querySelector(
      `[data-pitch="${this.focusStartPitch}"]`,
    );
    const endKey = this.querySelector(`[data-pitch="${this.focusEndPitch}"]`);
    if (
      !(startKey instanceof HTMLElement) ||
      !(endKey instanceof HTMLElement)
    ) {
      return;
    }

    requestAnimationFrame(() => {
      if (this.hidden) return;

      const start = startKey.offsetLeft;
      const end = endKey.offsetLeft + endKey.offsetWidth;
      const center = (start + end) / 2;
      const scrollLeft = Math.max(0, center - this.clientWidth / 2);

      this.scrollTo({ left: scrollLeft });
    });
  }
}

function getPianoKeyClassName(
  pitch: number,
  tunePitches: Set<number>,
  activePitches: Set<number>,
  auditionPitches: Set<number>,
): string {
  const classNames = [
    "chatmusic-piano-key",
    isBlackPianoKey(pitch)
      ? "chatmusic-piano-key-black"
      : "chatmusic-piano-key-white",
  ];

  if (tunePitches.has(pitch)) classNames.push("chatmusic-key-in-tune");
  if (pitch === MIDDLE_C_PITCH) classNames.push("chatmusic-key-middle-c");
  if (activePitches.has(pitch)) classNames.push("chatmusic-key-active");
  if (auditionPitches.has(pitch)) {
    classNames.push("chatmusic-key-auditioning");
  }

  return classNames.join(" ");
}

if (!customElements.get(KEYBOARD_TAG_NAME)) {
  customElements.define(KEYBOARD_TAG_NAME, ChatMusicKeyboardElement);
}

function isBlackPianoKey(pitch: number): boolean {
  return [1, 3, 6, 8, 10].includes(pitch % 12);
}

function getMidiNoteName(pitch: number): string {
  const noteNames = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  const octave = Math.floor(pitch / 12) - 1;

  return `${noteNames[pitch % 12]}${octave}`;
}
