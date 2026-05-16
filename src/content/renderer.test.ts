import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const pause = vi.fn();

  return {
    pause,
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
});
