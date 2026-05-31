import type { RenderInstance, TimingEvent } from "../types";
import { getTimingEventSourceRanges } from "./source-highlight";
import { getTimingEvents } from "./timing";

export function highlightTimingEvent(
  instance: RenderInstance,
  event: TimingEvent,
): void {
  instance.tempoControl.update(event);
  clearPlaybackHighlight(instance, false);

  const elements = flattenTimingElements(event.elements);
  for (const element of elements) {
    element.classList.add("chatmusic-note-playing");
  }

  instance.activePlaybackElements = elements;
  instance.keyboard.highlightPitches(event.midiPitches ?? []);
  instance.onSourceHighlight?.(
    getTimingEventSourceRanges(event, instance.abcText.length),
  );
}

export function clearPlaybackHighlight(
  instance: RenderInstance,
  clearSourceHighlight = true,
): void {
  for (const element of instance.activePlaybackElements) {
    element.classList.remove("chatmusic-note-playing");
  }
  instance.keyboard.clearActiveKeys();
  instance.activePlaybackElements = [];
  if (clearSourceHighlight) instance.onSourceHighlight?.([]);
}

export function setupKeyboard(instance: RenderInstance): void {
  instance.keyboard.setup(getTuneMidiPitches(instance));
}

function getTuneMidiPitches(instance: RenderInstance): number[] {
  const pitches = new Set<number>();

  for (const event of getTimingEvents(instance)) {
    for (const midiPitch of event.midiPitches ?? []) {
      if (midiPitch.pitch !== undefined) pitches.add(midiPitch.pitch);
    }
  }

  return [...pitches].sort((first, second) => first - second);
}

function flattenTimingElements(elements: unknown[] | undefined): Element[] {
  if (!elements) return [];

  const flattened: Element[] = [];
  for (const item of elements) {
    if (item instanceof Element) {
      flattened.push(item);
    } else if (Array.isArray(item)) {
      flattened.push(...flattenTimingElements(item));
    }
  }

  return flattened;
}
