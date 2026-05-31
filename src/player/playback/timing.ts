import type {
  AbcElementRef,
  RenderInstance,
  TimedTuneObject,
  TimingEvent,
} from "../types";

export function getSeekPercentForElement(
  instance: RenderInstance,
  abcElement: AbcElementRef,
): number | null {
  if (abcElement.startChar === undefined || abcElement.endChar === undefined) {
    return null;
  }

  const timingEvents = getTimingEvents(instance);
  const lastEvent = timingEvents[timingEvents.length - 1];
  if (!lastEvent || lastEvent.milliseconds <= 0) return null;

  const matchingEvent = timingEvents.find((event) =>
    timingEventMatchesElement(event, abcElement),
  );
  if (!matchingEvent) return null;

  return matchingEvent.milliseconds / lastEvent.milliseconds;
}

export function getTimingEvents(instance: RenderInstance): TimingEvent[] {
  const tune = instance.visualObj?.[0] as TimedTuneObject | undefined;
  if (!tune) return [];

  if (!tune.noteTimings || tune.noteTimings.length === 0) {
    tune.noteTimings = tune.setTiming?.(0, 0) ?? [];
  }

  return tune.noteTimings;
}

function timingEventMatchesElement(
  event: TimingEvent,
  abcElement: AbcElementRef,
): boolean {
  if (event.type && event.type !== "event") return false;

  const starts = event.startCharArray ?? [event.startChar ?? null];
  const ends = event.endCharArray ?? [event.endChar ?? null];

  return starts.some((start, index) => {
    const end = ends[index];
    return (
      start !== null &&
      end !== null &&
      abcElement.endChar !== undefined &&
      abcElement.startChar !== undefined &&
      abcElement.endChar > start &&
      abcElement.startChar < end
    );
  });
}
