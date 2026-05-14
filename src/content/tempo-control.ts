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

export function createTempoControl(
  menuElement: HTMLElement,
  inputElement: HTMLInputElement,
  bpmElement: HTMLElement,
  onWarpChange: (warpPercent: number | null) => void = () => {}
): TempoControl {
  const button = menuElement.querySelector(".chatmusic-tempo-button");
  let activeTune: TempoTune | undefined;

  const update = (event?: TempoTimingEvent) => {
    const eventBpm = getBpmFromMillisecondsPerMeasure(
      activeTune,
      event?.millisecondsPerMeasure
    );
    const baseBpm = eventBpm ?? getTuneBaseBpm(activeTune);
    const effectiveBpm = eventBpm ?? getEffectiveBpm(
      baseBpm,
      parseWarpPercent(inputElement.value)
    );
    const bpmText = formatBpm(effectiveBpm);
    const label = effectiveBpm ? `Tempo: ${bpmText} BPM` : "Tempo";

    bpmElement.textContent = bpmText;
    button?.setAttribute("title", label);
    button?.setAttribute("aria-label", label);
  };

  return {
    reset: () => {
      activeTune = undefined;
      menuElement.hidden = true;
      bpmElement.textContent = "--";
      inputElement.oninput = null;
      inputElement.onchange = null;
    },
    connect: (nativeTempoInput, tune) => {
      activeTune = tune;
      inputElement.value = nativeTempoInput.value;
      inputElement.min = nativeTempoInput.min;
      inputElement.max = nativeTempoInput.max;

      const syncTempo = () => {
        if (parseWarpPercent(inputElement.value) === null) {
          onWarpChange(null);
          update();
          return;
        }

        nativeTempoInput.value = inputElement.value;
        nativeTempoInput.dispatchEvent(new Event("change", { bubbles: true }));
        onWarpChange(parseWarpPercent(inputElement.value));
        update();
      };

      inputElement.oninput = syncTempo;
      inputElement.onchange = syncTempo;
      onWarpChange(parseWarpPercent(inputElement.value));
      update();
      menuElement.hidden = false;
    },
    update,
  };
}