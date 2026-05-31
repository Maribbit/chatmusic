export interface TempoTune {
  getBpm?: () => number;
  getBeatsPerMeasure?: () => number;
}

export function getTuneBaseBpm(tune: TempoTune | undefined): number | null {
  const bpm = tune?.getBpm?.();

  return isPositiveFiniteNumber(bpm) ? bpm : null;
}

export function getEffectiveBpm(
  baseBpm: number | null | undefined,
  warpPercent: number | null | undefined
): number | null {
  if (!isPositiveFiniteNumber(baseBpm) || !isPositiveFiniteNumber(warpPercent)) {
    return null;
  }

  return baseBpm * (warpPercent / 100);
}

export function getBpmFromMillisecondsPerMeasure(
  tune: TempoTune | undefined,
  millisecondsPerMeasure: number | null | undefined
): number | null {
  const beatsPerMeasure = tune?.getBeatsPerMeasure?.();
  if (
    !isPositiveFiniteNumber(beatsPerMeasure) ||
    !isPositiveFiniteNumber(millisecondsPerMeasure)
  ) {
    return null;
  }

  return (beatsPerMeasure * 60000) / millisecondsPerMeasure;
}

export function parseWarpPercent(value: string): number | null {
  const warpPercent = Number(value);

  return isPositiveFiniteNumber(warpPercent) ? warpPercent : null;
}

export function formatBpm(bpm: number | null | undefined): string {
  return isPositiveFiniteNumber(bpm) ? String(Math.round(bpm)) : "--";
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}