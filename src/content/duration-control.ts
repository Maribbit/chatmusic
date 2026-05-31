import { LitElement, html, type TemplateResult } from "lit";
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

const DURATION_TAG_NAME = "chatmusic-duration";

export function createDurationControl(): DurationControl {
  let element: ChatMusicDurationElement | null = null;
  let baseDurationSeconds: number | null = null;
  let currentWarpPercent: number | null = 100;

  const update = () => {
    element?.setPlaybackDuration(baseDurationSeconds, currentWarpPercent);
  };

  return {
    mount: (audioElement) => {
      element?.remove();
      element = document.createElement(
        DURATION_TAG_NAME
      ) as ChatMusicDurationElement;
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

export class ChatMusicDurationElement extends LitElement {
  static properties = {
    baseDurationSeconds: { state: true },
    currentWarpPercent: { state: true },
  };

  baseDurationSeconds: number | null = null;
  currentWarpPercent: number | null = 100;

  protected createRenderRoot(): HTMLElement {
    return this;
  }

  setPlaybackDuration(
    durationSeconds: number | null,
    warpPercent: number | null
  ): void {
    this.baseDurationSeconds = durationSeconds;
    this.currentWarpPercent = warpPercent;
    this.hidden = this.getDurationSeconds() === null;
  }

  protected render(): TemplateResult | null {
    const durationSeconds = this.getDurationSeconds();

    return durationSeconds ? html`/ ${formatDuration(durationSeconds)}` : null;
  }

  private getDurationSeconds(): number | null {
    return getEffectiveDurationSeconds(
      this.baseDurationSeconds,
      this.currentWarpPercent
    );
  }
}

if (!customElements.get(DURATION_TAG_NAME)) {
  customElements.define(DURATION_TAG_NAME, ChatMusicDurationElement);
}