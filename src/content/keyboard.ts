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

const FULL_KEYBOARD_START_PITCH = 21;
const FULL_KEYBOARD_END_PITCH = 108;
const MIDDLE_C_PITCH = 60;
const WHITE_KEY_COUNT = 52;
const MIN_WHITE_KEY_WIDTH = 20;
const KEYBOARD_HORIZONTAL_PADDING = 16;

export function createKeyboardController(
  keyboardElement: HTMLElement,
  toggleButton: HTMLButtonElement,
  initialVisibility: boolean
): KeyboardController {
  let isVisible = initialVisibility;
  let focusStartPitch = MIDDLE_C_PITCH;
  let focusEndPitch = MIDDLE_C_PITCH;
  let activeKeys: HTMLElement[] = [];

  const updateToggleButton = () => {
    const label = isVisible ? "Hide keyboard" : "Show keyboard";

    toggleButton.title = label;
    toggleButton.setAttribute("aria-label", label);
    toggleButton.setAttribute("aria-pressed", String(isVisible));
  };

  const scrollToFocusRange = () => {
    const startKey = keyboardElement.querySelector(
      `[data-pitch="${focusStartPitch}"]`
    );
    const endKey = keyboardElement.querySelector(
      `[data-pitch="${focusEndPitch}"]`
    );
    if (!(startKey instanceof HTMLElement) || !(endKey instanceof HTMLElement)) {
      return;
    }

    requestAnimationFrame(() => {
      if (keyboardElement.hidden) return;

      const start = startKey.offsetLeft;
      const end = endKey.offsetLeft + endKey.offsetWidth;
      const center = (start + end) / 2;
      const scrollLeft = Math.max(0, center - keyboardElement.clientWidth / 2);

      keyboardElement.scrollTo({ left: scrollLeft });
    });
  };

  const syncSize = () => {
    const availableWidth = Math.max(
      0,
      keyboardElement.clientWidth - KEYBOARD_HORIZONTAL_PADDING
    );
    const whiteKeyWidth = Math.max(
      MIN_WHITE_KEY_WIDTH,
      availableWidth / WHITE_KEY_COUNT
    );
    const blackKeyWidth = whiteKeyWidth * 0.6;

    keyboardElement.style.setProperty(
      "--chatmusic-white-key-width",
      `${whiteKeyWidth}px`
    );
    keyboardElement.style.setProperty(
      "--chatmusic-black-key-width",
      `${blackKeyWidth}px`
    );
    keyboardElement.style.setProperty(
      "--chatmusic-black-key-offset",
      `${-blackKeyWidth / 2}px`
    );
  };

  const setVisible = (nextVisibility: boolean) => {
    isVisible = nextVisibility;
    keyboardElement.hidden = !isVisible;
    updateToggleButton();

    if (isVisible) {
      syncSize();
      scrollToFocusRange();
    }
  };

  const setup = (pitches: number[]) => {
    const tunePitches = new Set(pitches);
    keyboardElement.replaceChildren();
    activeKeys = [];
    focusStartPitch = pitches[0] ?? MIDDLE_C_PITCH;
    focusEndPitch = pitches[pitches.length - 1] ?? MIDDLE_C_PITCH;

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
      if (pitch === MIDDLE_C_PITCH) key.classList.add("chatmusic-key-middle-c");
      key.dataset.pitch = String(pitch);
      key.dataset.note = getMidiNoteName(pitch);
      key.title = getMidiNoteName(pitch);
      keyboardElement.append(key);
    }

    syncSize();
    setVisible(isVisible);
  };

  const clearActiveKeys = () => {
    for (const key of activeKeys) {
      key.classList.remove("chatmusic-key-active");
    }
    activeKeys = [];
  };

  const highlightPitches = (midiPitches: MidiPitch[]) => {
    clearActiveKeys();

    for (const midiPitch of midiPitches) {
      if (midiPitch.pitch === undefined) continue;

      const key = keyboardElement.querySelector(
        `[data-pitch="${midiPitch.pitch}"]`
      );
      if (key instanceof HTMLElement) {
        key.classList.add("chatmusic-key-active");
        activeKeys.push(key);
      }
    }
  };

  const toggleKeyboard = () => setVisible(!isVisible);
  const resizeObserver =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => {
          syncSize();
          if (isVisible) scrollToFocusRange();
        });

  toggleButton.addEventListener("click", toggleKeyboard);
  resizeObserver?.observe(keyboardElement);
  updateToggleButton();

  return {
    setup,
    setVisible,
    highlightPitches,
    clearActiveKeys,
    syncSize,
    dispose: () => {
      toggleButton.removeEventListener("click", toggleKeyboard);
      resizeObserver?.disconnect();
    },
  };
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