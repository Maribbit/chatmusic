import { LitElement, html, svg, type TemplateResult } from "lit";
import {
  formatBpm,
  getBpmFromMillisecondsPerMeasure,
  getEffectiveBpm,
  getTuneBaseBpm,
  parseWarpPercent,
  type TempoTune,
} from "./tempo";

export interface TempoTimingEvent {
  millisecondsPerMeasure?: number;
}

export interface TempoControl {
  reset(): void;
  connect(nativeTempoInput: HTMLInputElement, tune: TempoTune | undefined): void;
  update(event?: TempoTimingEvent): void;
}

export interface TempoWarpChangeDetail {
  warpPercent: number | null;
}

const TEMPO_TAG_NAME = "chatmusic-tempo";
const TEMPO_WARP_CHANGE_EVENT = "chatmusic-tempo-warp-change";

export function createTempoControl(
  tempoElement: HTMLElement,
  onWarpChange: (warpPercent: number | null) => void = () => {},
): TempoControl {
  const element = tempoElement as ChatMusicTempoElement;
  const handleWarpChange = (event: Event) => {
    const { warpPercent } = (event as CustomEvent<TempoWarpChangeDetail>)
      .detail;
    onWarpChange(warpPercent);
  };
  element.addEventListener(TEMPO_WARP_CHANGE_EVENT, handleWarpChange);

  return {
    reset: () => element.reset(),
    connect: (nativeTempoInput, tune) =>
      element.connectTempo(nativeTempoInput, tune),
    update: (event) => element.updateTempo(event),
  };
}

export class ChatMusicTempoElement extends LitElement {
  static properties = {
    bpmText: { state: true },
    inputValue: { state: true },
    max: { state: true },
    min: { state: true },
  };

  bpmText = "--";
  inputValue = "100";
  max = "300";
  min = "1";

  private activeTune: TempoTune | undefined;
  private nativeTempoInput: HTMLInputElement | null = null;
  private isConnectedToAudio = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.hidden = !this.isConnectedToAudio;
  }

  protected createRenderRoot(): HTMLElement {
    return this;
  }

  reset(): void {
    this.activeTune = undefined;
    this.nativeTempoInput = null;
    this.isConnectedToAudio = false;
    this.hidden = true;
    this.bpmText = "--";
    this.inputValue = "100";
    this.min = "1";
    this.max = "300";
  }

  connectTempo(
    nativeTempoInput: HTMLInputElement,
    tune: TempoTune | undefined,
  ): void {
    this.activeTune = tune;
    this.nativeTempoInput = nativeTempoInput;
    this.isConnectedToAudio = true;
    this.hidden = false;
    this.inputValue = nativeTempoInput.value;
    this.min = nativeTempoInput.min || "1";
    this.max = nativeTempoInput.max || "300";
    this.emitWarpChange(parseWarpPercent(this.inputValue));
    this.updateTempo();
  }

  updateTempo(event?: TempoTimingEvent): void {
    this.bpmText = formatBpm(this.getEffectiveTempo(event));
  }

  protected render(): TemplateResult {
    const label = this.getTempoLabel();

    return html`
      <details class="chatmusic-tempo-menu">
        <summary
          class="chatmusic-tempo-button"
          title=${label}
          aria-label=${label}
        >
          ${renderTempoIcon()}
        </summary>
        <div class="chatmusic-tempo-panel">
          <div class="chatmusic-tempo-readout" aria-live="polite">
            <span class="chatmusic-tempo-bpm-value">${this.bpmText}</span>
            <span class="chatmusic-tempo-unit">BPM</span>
          </div>
          <label class="chatmusic-tempo-field">
            <input
              class="chatmusic-tempo-input"
              type="number"
              min=${this.min}
              max=${this.max}
              .value=${this.inputValue}
              aria-label="Playback speed"
              @input=${this.handleTempoInput}
              @change=${this.handleTempoInput}
            />
            <span>%</span>
          </label>
        </div>
      </details>
    `;
  }

  private handleTempoInput = (event: Event): void => {
    if (!(event.target instanceof HTMLInputElement)) return;

    this.inputValue = event.target.value;
    this.syncNativeTempo();
  };

  private syncNativeTempo(): void {
    const warpPercent = parseWarpPercent(this.inputValue);
    if (warpPercent === null) {
      this.emitWarpChange(null);
      this.updateTempo();
      return;
    }

    if (this.nativeTempoInput) {
      this.nativeTempoInput.value = this.inputValue;
      this.nativeTempoInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    this.emitWarpChange(warpPercent);
    this.updateTempo();
  }

  private getEffectiveTempo(event?: TempoTimingEvent): number | null {
    const eventBpm = getBpmFromMillisecondsPerMeasure(
      this.activeTune,
      event?.millisecondsPerMeasure,
    );
    const baseBpm = eventBpm ?? getTuneBaseBpm(this.activeTune);

    return (
      eventBpm ?? getEffectiveBpm(baseBpm, parseWarpPercent(this.inputValue))
    );
  }

  private getTempoLabel(): string {
    return this.bpmText === "--" ? "Tempo" : `Tempo: ${this.bpmText} BPM`;
  }

  private emitWarpChange(warpPercent: number | null): void {
    this.dispatchEvent(
      new CustomEvent<TempoWarpChangeDetail>(TEMPO_WARP_CHANGE_EVENT, {
        detail: { warpPercent },
      }),
    );
  }
}

function renderTempoIcon(): TemplateResult {
  return svg`
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M7 21L9.6 4.2A2 2 0 0 1 11.5 2h1A2 2 0 0 1 14.4 4.2L17 21" />
      <path d="M5 21h14" />
      <path d="M9 13v-1 M15 13v-1" />
      <path d="M12 21V8" />
      <circle cx="12" cy="13.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  `;
}

if (!customElements.get(TEMPO_TAG_NAME)) {
  customElements.define(TEMPO_TAG_NAME, ChatMusicTempoElement);
}