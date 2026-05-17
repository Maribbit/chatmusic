import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const pause = vi.fn();

  return {
    pause,
    parseOnly: vi.fn(() => [
      {
        warnings: [] as string[],
      },
    ]),
    renderAbc: vi.fn((element: HTMLElement) => {
      element.textContent = "rendered score";
      return [
        {
          setTiming: () => [],
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
        load(): void {}
        setTune = mocks.setTune;
        pause = mocks.pause;
      },
      playEvent: vi.fn(() => Promise.resolve()),
      CreateSynth: class {
        init(): Promise<{ cached: string[]; error: string[]; loaded: string[] }> {
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

import { removeDisconnectedRenders, renderAbc } from "./renderer";

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

    expect(shadowRoot?.querySelector(".chatmusic-quality-panel")?.textContent)
      .toContain("Unknown character ignored");
    expect(shadowRoot?.querySelector(".chatmusic-quality-panel")?.textContent)
      .toContain("Line 4, column 5");
  });
});
