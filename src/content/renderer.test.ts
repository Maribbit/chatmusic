import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const play = vi.fn();
  const pause = vi.fn();
  const seek = vi.fn();
  const setProgress = vi.fn();
  const cursorControls: Array<{
    onEvent?: (event: {
      endChar?: number;
      milliseconds: number;
      startChar?: number;
    }) => void;
    onFinished?: () => void;
  }> = [];

  return {
    cursorControls,
    play,
    pause,
    seek,
    setProgress,
    parseOnly: vi.fn(() => [
      {
        warnings: [] as string[],
      },
    ]),
    renderAbc: vi.fn((element: HTMLElement) => {
      element.textContent = "rendered score";
      return [
        {
          getTotalTime: () => 13,
          setTiming: () => [{ milliseconds: 13000 }],
        },
      ];
    }),
    setTune: vi.fn(() => Promise.resolve({ status: "created" })),
  };
});

vi.mock("abcjs", () => ({
  default: {
    parseOnly: mocks.parseOnly,
    renderAbc: mocks.renderAbc,
    synth: {
      supportsAudio: () => true,
      SynthController: class {
        isLoaded = false;
        percent = 0;

        load(
          parent: HTMLElement,
          cursorControl: (typeof mocks.cursorControls)[number],
        ): void {
          mocks.cursorControls.push(cursorControl);
          parent.innerHTML = `
            <div class="abcjs-inline-audio">
              <button type="button" class="abcjs-midi-start"></button>
              <button type="button" class="abcjs-midi-progress-background">
                <span class="abcjs-midi-progress-indicator"></span>
              </button>
              <span class="abcjs-midi-clock"></span>
            </div>
          `;
          parent
            .querySelector(".abcjs-midi-start")
            ?.addEventListener("click", () => void this.play());
        }
        setTune = mocks.setTune;
        pause = mocks.pause;
        seek(percent: number): void {
          mocks.seek(percent);
        }
        setProgress(percent: number, totalTime?: number): void {
          this.percent = percent;
          mocks.setProgress(percent, totalTime);
        }
        runWhenReady(
          callback: () => Promise<{ status: string }>,
        ): Promise<{ status: string }> {
          if (!this.isLoaded) {
            this.percent = 0;
            this.isLoaded = true;
          }

          return callback();
        }
        play(): Promise<{ status: string }> {
          mocks.play(this.percent);
          return Promise.resolve({ status: "ok" });
        }
      },
      playEvent: vi.fn(() => Promise.resolve()),
      CreateSynth: class {
        init(): Promise<{
          cached: string[];
          error: string[];
          loaded: string[];
        }> {
          return Promise.resolve({ cached: [], error: [], loaded: [] });
        }
      },
      SynthSequence: class {
        addTrack(): number {
          return 0;
        }
        setInstrument(): void {}
        appendNote(): void {}
      },
    },
  },
}));

import {
  getSourceHighlightRangesForTest,
  removeDisconnectedRenders,
  renderAbc,
} from "./renderer";

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("render lifecycle", () => {
  it("stops and removes render instances when their source block is disconnected", async () => {
    const wrapper = document.createElement("section");
    const pre = document.createElement("pre");
    wrapper.append(pre);
    document.body.append(wrapper);

    const instance = renderAbc(pre, "X:1\nK:C\nC|");
    await Promise.resolve();

    expect(instance.container.isConnected).toBe(true);

    wrapper.remove();
    removeDisconnectedRenders();

    expect(mocks.pause).toHaveBeenCalledTimes(1);
    expect(instance.container.isConnected).toBe(false);
  });

  it("shows abcjs warning feedback in rendered score cards", async () => {
    mocks.parseOnly.mockReturnValueOnce([
      {
        warnings: [
          'Music Line:4:5: Unknown character ignored: C D <span style="font-weight:bold;">@</span> |',
        ],
      },
    ]);
    const pre = document.createElement("pre");
    document.body.append(pre);

    const instance = renderAbc(pre, "X:1\nT:Bad\nK:C\nC D @ |");
    await Promise.resolve();
    const shadowRoot = instance.container.shadowRoot;

    expect(
      shadowRoot?.querySelector(".chatmusic-quality-panel")?.textContent,
    ).toContain("Unknown character ignored");
    expect(
      shadowRoot?.querySelector(".chatmusic-quality-panel")?.textContent,
    ).toContain("Line 4, column 5");
  });

  it("renders scores with abcjs line wrapping enabled", () => {
    const pre = document.createElement("pre");
    document.body.append(pre);

    renderAbc(pre, "X:1\nK:C\nC|D|E|F|");

    expect(mocks.renderAbc).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.any(String),
      expect.objectContaining({
        responsive: "resize",
        staffwidth: 716,
        wrap: expect.objectContaining({
          preferredMeasuresPerLine: 4,
          minSpacing: 1.2,
          maxSpacing: 2.4,
        }),
      }),
    );
  });

  it("seeks continuously while dragging the playback progress bar", async () => {
    const pre = document.createElement("pre");
    document.body.append(pre);

    const instance = renderAbc(pre, "X:1\nK:C\nC|D|E|F|");
    await Promise.resolve();

    const progressBar = instance.audioElement.querySelector<HTMLButtonElement>(
      ".abcjs-midi-progress-background",
    );
    expect(progressBar).not.toBeNull();
    if (!progressBar) return;

    Object.defineProperty(progressBar, "clientWidth", {
      configurable: true,
      value: 200,
    });
    progressBar.getBoundingClientRect = () =>
      ({
        bottom: 10,
        height: 10,
        left: 100,
        right: 300,
        top: 0,
        width: 200,
        x: 100,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    progressBar.dispatchEvent(
      new MouseEvent("pointerdown", {
        bubbles: true,
        button: 0,
        clientX: 150,
      }),
    );
    progressBar.dispatchEvent(
      new MouseEvent("pointermove", { bubbles: true, clientX: 250 }),
    );
    progressBar.dispatchEvent(
      new MouseEvent("pointerup", { bubbles: true, clientX: 300 }),
    );

    expect(mocks.seek).toHaveBeenCalledWith(0.25);
    expect(mocks.seek).toHaveBeenCalledWith(0.75);
    expect(mocks.seek).toHaveBeenLastCalledWith(1);
    expect(mocks.setProgress).toHaveBeenLastCalledWith(1, 13000);
  });

  it("starts first playback from the dragged progress position", async () => {
    const pre = document.createElement("pre");
    document.body.append(pre);

    const instance = renderAbc(pre, "X:1\nK:C\nC|D|E|F|");
    await Promise.resolve();

    const playButton =
      instance.audioElement.querySelector<HTMLButtonElement>(
        ".abcjs-midi-start",
      );
    const progressBar = instance.audioElement.querySelector<HTMLButtonElement>(
      ".abcjs-midi-progress-background",
    );
    expect(playButton).not.toBeNull();
    expect(progressBar).not.toBeNull();
    if (!playButton || !progressBar) return;

    Object.defineProperty(progressBar, "clientWidth", {
      configurable: true,
      value: 200,
    });
    progressBar.getBoundingClientRect = () =>
      ({
        bottom: 10,
        height: 10,
        left: 100,
        right: 300,
        top: 0,
        width: 200,
        x: 100,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    progressBar.dispatchEvent(
      new MouseEvent("pointerdown", {
        bubbles: true,
        button: 0,
        clientX: 250,
      }),
    );
    await Promise.resolve();
    playButton.click();

    expect(mocks.play).toHaveBeenCalledWith(0.75);
  });

  it("normalizes playback source highlight ranges", () => {
    expect(
      getSourceHighlightRangesForTest(
        {
          milliseconds: 0,
          startCharArray: [8, 16, 8, null],
          endCharArray: [9, 18, 9, 24],
        },
        20,
      ),
    ).toEqual([
      { start: 8, end: 9 },
      { start: 16, end: 18 },
    ]);

    expect(
      getSourceHighlightRangesForTest(
        {
          milliseconds: 0,
          startChar: 22,
          endChar: 30,
        },
        24,
      ),
    ).toEqual([{ start: 22, end: 24 }]);
  });

  it("notifies source highlight callbacks during playback events", async () => {
    const pre = document.createElement("pre");
    document.body.append(pre);
    const onSourceHighlight = vi.fn();

    renderAbc(pre, "X:1\nK:C\nC|", undefined, undefined, undefined, {
      onSourceHighlight,
    });
    await Promise.resolve();
    const cursorControl = mocks.cursorControls[mocks.cursorControls.length - 1];

    cursorControl?.onEvent?.({
      milliseconds: 0,
      startChar: 8,
      endChar: 9,
    });
    cursorControl?.onFinished?.();

    expect(onSourceHighlight).toHaveBeenCalledWith([{ start: 8, end: 9 }]);
    expect(onSourceHighlight).toHaveBeenLastCalledWith([]);
  });
});
