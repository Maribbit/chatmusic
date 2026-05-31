import { getTuneDurationSeconds } from "./duration";
import { getTimingEvents } from "./timing";
import type { RenderInstance, SeekableSynthControl } from "../types";

export function setupProgressDrag(
  instance: RenderInstance,
): (() => void) | null {
  const progressBar = instance.audioElement.querySelector<HTMLButtonElement>(
    ".abcjs-midi-progress-background",
  );
  const playButton =
    instance.audioElement.querySelector<HTMLButtonElement>(".abcjs-midi-start");
  if (!progressBar) return null;

  let isDragging = false;

  const seekFromClientX = (clientX: number) => {
    const percent = getProgressPercent(progressBar, clientX);
    if (percent !== null) seekPlaybackToPercent(instance, percent);
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;

    isDragging = true;
    progressBar.classList.add("chatmusic-progress-dragging");
    if (typeof event.pointerId === "number") {
      progressBar.setPointerCapture?.(event.pointerId);
    }
    event.preventDefault();
    seekFromClientX(event.clientX);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!isDragging) return;

    event.preventDefault();
    seekFromClientX(event.clientX);
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (!isDragging) return;

    event.preventDefault();
    seekFromClientX(event.clientX);
    isDragging = false;
    progressBar.classList.remove("chatmusic-progress-dragging");
    if (typeof event.pointerId === "number") {
      progressBar.releasePointerCapture?.(event.pointerId);
    }
  };

  const handlePointerCancel = (event: PointerEvent) => {
    if (!isDragging) return;

    isDragging = false;
    progressBar.classList.remove("chatmusic-progress-dragging");
    if (typeof event.pointerId === "number") {
      progressBar.releasePointerCapture?.(event.pointerId);
    }
  };

  const handleClick = (event: MouseEvent) => {
    if (event.detail === 0) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    seekFromClientX(event.clientX);
  };

  const handlePlayClick = (event: MouseEvent) => {
    const hasPendingSeek =
      instance.pendingPlaybackSeekPercent !== null ||
      instance.pendingPlaybackSeekPromise !== null;
    const synthControl = instance.synthControl as SeekableSynthControl | null;
    if (!hasPendingSeek || !synthControl || synthControl.isLoaded === true) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    void playAfterPendingSeek(instance);
  };

  progressBar.addEventListener("pointerdown", handlePointerDown);
  progressBar.addEventListener("pointermove", handlePointerMove);
  progressBar.addEventListener("pointerup", handlePointerUp);
  progressBar.addEventListener("pointercancel", handlePointerCancel);
  progressBar.addEventListener("click", handleClick, true);
  playButton?.addEventListener("click", handlePlayClick, true);

  return () => {
    progressBar.removeEventListener("pointerdown", handlePointerDown);
    progressBar.removeEventListener("pointermove", handlePointerMove);
    progressBar.removeEventListener("pointerup", handlePointerUp);
    progressBar.removeEventListener("pointercancel", handlePointerCancel);
    progressBar.removeEventListener("click", handleClick, true);
    playButton?.removeEventListener("click", handlePlayClick, true);
    progressBar.classList.remove("chatmusic-progress-dragging");
  };
}

export function seekPlaybackToPercent(
  instance: RenderInstance,
  percent: number,
): void {
  const synthControl = instance.synthControl as SeekableSynthControl | null;
  if (!synthControl) return;

  const clampedPercent = clampProgressPercent(percent);
  instance.pendingPlaybackSeekPercent = clampedPercent;
  setPlaybackProgress(instance, clampedPercent);

  if (synthControl.isLoaded === true) {
    synthControl.seek?.(clampedPercent);
    instance.pendingPlaybackSeekPercent = null;
    return;
  }

  void flushPendingPlaybackSeek(instance);
}

function getProgressPercent(
  progressBar: HTMLElement,
  clientX: number,
): number | null {
  const rect = progressBar.getBoundingClientRect();
  const width = rect.width || progressBar.clientWidth;
  if (!Number.isFinite(clientX) || width <= 0) return null;

  return clampProgressPercent((clientX - rect.left) / width);
}

function clampProgressPercent(percent: number): number {
  return Math.min(1, Math.max(0, percent));
}

async function playAfterPendingSeek(instance: RenderInstance): Promise<void> {
  const synthControl = instance.synthControl as SeekableSynthControl | null;
  if (!synthControl) return;

  await flushPendingPlaybackSeek(instance);
  await synthControl.play?.();
}

function flushPendingPlaybackSeek(instance: RenderInstance): Promise<unknown> {
  if (instance.pendingPlaybackSeekPromise) {
    return instance.pendingPlaybackSeekPromise;
  }

  const synthControl = instance.synthControl as SeekableSynthControl | null;
  if (!synthControl || instance.pendingPlaybackSeekPercent === null) {
    return Promise.resolve();
  }

  const applyPendingSeek = () => {
    const pendingPercent = instance.pendingPlaybackSeekPercent;
    if (pendingPercent !== null) {
      setPlaybackProgress(instance, pendingPercent);
      synthControl.seek?.(pendingPercent);
      instance.pendingPlaybackSeekPercent = null;
    }

    return Promise.resolve({ status: "ok" });
  };

  const seekPromise = synthControl.runWhenReady
    ? synthControl.runWhenReady(applyPendingSeek)
    : applyPendingSeek();

  instance.pendingPlaybackSeekPromise = Promise.resolve(seekPromise).finally(
    () => {
      instance.pendingPlaybackSeekPromise = null;
    },
  );

  return instance.pendingPlaybackSeekPromise;
}

function setPlaybackProgress(instance: RenderInstance, percent: number): void {
  const synthControl = instance.synthControl as SeekableSynthControl | null;
  if (!synthControl) return;

  const durationSeconds = getTuneDurationSeconds(
    instance.visualObj?.[0],
    getTimingEvents(instance),
  );
  if (synthControl.setProgress) {
    synthControl.setProgress(
      percent,
      durationSeconds ? durationSeconds * 1000 : 0,
    );
  } else {
    updateProgressThumb(instance.audioElement, percent);
  }
}

function updateProgressThumb(audioElement: HTMLElement, percent: number): void {
  const progressBar = audioElement.querySelector<HTMLElement>(
    ".abcjs-midi-progress-background",
  );
  const progressThumb = audioElement.querySelector<HTMLElement>(
    ".abcjs-midi-progress-indicator",
  );
  if (!progressBar || !progressThumb) return;

  progressThumb.style.left = `${progressBar.clientWidth * percent}px`;
}
