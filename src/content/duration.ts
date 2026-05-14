export interface DurationTune {
  getTotalTime?: () => number | undefined;
}

export interface DurationTimingEvent {
  milliseconds?: number;
}

export function getTuneDurationSeconds(
  tune: DurationTune | undefined,
  timingEvents: DurationTimingEvent[] = []
): number | null {
  const totalTime = tune?.getTotalTime?.();
  if (isPositiveFiniteNumber(totalTime)) return totalTime;

  const lastEvent = timingEvents[timingEvents.length - 1];
  const totalMilliseconds = lastEvent?.milliseconds;

  return isPositiveFiniteNumber(totalMilliseconds)
    ? totalMilliseconds / 1000
    : null;
}

export function getEffectiveDurationSeconds(
  durationSeconds: number | null | undefined,
  warpPercent: number | null | undefined
): number | null {
  if (
    !isPositiveFiniteNumber(durationSeconds) ||
    !isPositiveFiniteNumber(warpPercent)
  ) {
    return null;
  }

  return durationSeconds * (100 / warpPercent);
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!isPositiveFiniteNumber(seconds)) return "--:--";

  const totalSeconds = Math.floor(seconds);
  const displaySeconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const displayMinutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const paddedSeconds = String(displaySeconds).padStart(2, "0");

  if (hours <= 0) return `${displayMinutes}:${paddedSeconds}`;

  return `${hours}:${String(displayMinutes).padStart(2, "0")}:${paddedSeconds}`;
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}