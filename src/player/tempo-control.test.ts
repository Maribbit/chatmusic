import { describe, expect, it, vi } from "vitest";
import {
  ChatMusicTempoElement,
  createTempoControl,
} from "./tempo-control";

describe("tempo control", () => {
  it("syncs playback warp changes into the abcjs tempo input", async () => {
    const element = document.createElement(
      "chatmusic-tempo",
    ) as ChatMusicTempoElement;
    const nativeTempoInput = document.createElement("input");
    const changes: Array<number | null> = [];
    const onNativeChange = vi.fn();

    nativeTempoInput.value = "100";
    nativeTempoInput.min = "1";
    nativeTempoInput.max = "300";
    nativeTempoInput.addEventListener("change", onNativeChange);
    document.body.append(element);

    const control = createTempoControl(element, (warpPercent) => {
      changes.push(warpPercent);
    });
    control.connect(nativeTempoInput, { getBpm: () => 120 });
    await element.updateComplete;

    expect(element.hidden).toBe(false);
    expect(element.querySelector(".chatmusic-tempo-bpm-value")?.textContent)
      .toBe("120");

    const input = element.querySelector(
      ".chatmusic-tempo-input",
    ) as HTMLInputElement;
    input.value = "50";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await element.updateComplete;

    expect(nativeTempoInput.value).toBe("50");
    expect(onNativeChange).toHaveBeenCalledTimes(1);
    expect(changes).toEqual([100, 50]);
    expect(element.querySelector(".chatmusic-tempo-bpm-value")?.textContent)
      .toBe("60");
  });

  it("keeps invalid warp values local while marking duration unavailable", async () => {
    const element = document.createElement(
      "chatmusic-tempo",
    ) as ChatMusicTempoElement;
    const nativeTempoInput = document.createElement("input");
    const changes: Array<number | null> = [];

    nativeTempoInput.value = "100";
    document.body.append(element);

    const control = createTempoControl(element, (warpPercent) => {
      changes.push(warpPercent);
    });
    control.connect(nativeTempoInput, { getBpm: () => 120 });
    await element.updateComplete;

    const input = element.querySelector(
      ".chatmusic-tempo-input",
    ) as HTMLInputElement;
    input.value = "0";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await element.updateComplete;

    expect(nativeTempoInput.value).toBe("100");
    expect(changes).toEqual([100, null]);
    expect(element.querySelector(".chatmusic-tempo-bpm-value")?.textContent)
      .toBe("--");
  });
});