import {
  formatDuration,
  getEffectiveDurationSeconds,
} from "./duration";

export interface DurationControl {
  mount(audioElement: HTMLElement): void;
  reset(): void;
  setDuration(durationSeconds: number | null): void;
  setWarp(warpPercent: number | null): void;
}

export function createDurationControl(): DurationControl {
  let element: HTMLElement | null = null;
  let baseDurationSeconds: number | null = null;
  let currentWarpPercent: number | null = 100;

  const update = () => {
    if (!element) return;

    const durationSeconds = getEffectiveDurationSeconds(
      baseDurationSeconds,
      currentWarpPercent
    );
    element.textContent = durationSeconds
      ? `/ ${formatDuration(durationSeconds)}`
      : "";
    element.hidden = durationSeconds === null;
  };

  return {
    mount: (audioElement) => {
      element?.remove();
      element = document.createElement("span");
      element.className = "chatmusic-total-duration";
      element.setAttribute("aria-label", "Total duration");

      const clockElement = audioElement.querySelector(".abcjs-midi-clock");
      if (clockElement) {
        clockElement.after(element);
      } else {
        audioElement.querySelector(".abcjs-inline-audio")?.append(element);
      }

      update();
    },
    reset: () => {
      element?.remove();
      element = null;
      baseDurationSeconds = null;
      currentWarpPercent = 100;
    },
    setDuration: (durationSeconds) => {
      baseDurationSeconds = durationSeconds;
      update();
    },
    setWarp: (warpPercent) => {
      currentWarpPercent = warpPercent;
      update();
    },
  };
}