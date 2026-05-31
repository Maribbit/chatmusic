import abcjs from "abcjs";
import type { AbcElementRef, RenderInstance } from "../types";

const DEFAULT_STAFF_WIDTH = 740;
const MIN_STAFF_WIDTH = 320;
const SCORE_WIDTH_PADDING = 24;
const STAFF_WIDTH_CHANGE_THRESHOLD = 24;
const SCORE_RESIZE_DEBOUNCE_MS = 180;
const SCORE_WRAP_OPTIONS: abcjs.Wrap = {
  preferredMeasuresPerLine: 4,
  minSpacing: 1.2,
  maxSpacing: 2.4,
  lastLineLimit: 1.4,
  minSpacingLimit: 1,
};

export function renderScore(
  scoreElement: HTMLElement,
  abcText: string,
  clickListener: (abcElement: AbcElementRef) => void,
): { visualObj: abcjs.TuneObject[]; staffWidth: number } {
  const staffWidth = getScoreStaffWidth(scoreElement);
  const visualObj = abcjs.renderAbc(scoreElement, abcText, {
    responsive: "resize",
    add_classes: true,
    staffwidth: staffWidth,
    wrap: { ...SCORE_WRAP_OPTIONS },
    clickListener,
  });

  return { visualObj, staffWidth };
}

export function setupScoreResizeObserver(
  instance: RenderInstance,
  onResizeSettled: () => void,
): void {
  if (typeof ResizeObserver === "undefined") return;

  instance.scoreResizeObserver = new ResizeObserver(() => {
    if (instance.scoreResizeTimer !== undefined) {
      window.clearTimeout(instance.scoreResizeTimer);
    }

    instance.scoreResizeTimer = window.setTimeout(() => {
      instance.scoreResizeTimer = undefined;
      onResizeSettled();
    }, SCORE_RESIZE_DEBOUNCE_MS);
  });
  instance.scoreResizeObserver.observe(instance.scoreElement);
}

export function shouldRerenderScoreForLayout(
  instance: RenderInstance,
): boolean {
  if (!instance.container.isConnected) return false;

  const nextStaffWidth = getScoreStaffWidth(instance.scoreElement);
  return (
    Math.abs(nextStaffWidth - instance.renderedStaffWidth) >=
    STAFF_WIDTH_CHANGE_THRESHOLD
  );
}

export function disposeScoreResizeObserver(instance: RenderInstance): void {
  if (instance.scoreResizeTimer !== undefined) {
    window.clearTimeout(instance.scoreResizeTimer);
    instance.scoreResizeTimer = undefined;
  }
  instance.scoreResizeObserver?.disconnect();
  instance.scoreResizeObserver = null;
}

function getScoreStaffWidth(scoreElement: HTMLElement): number {
  const measuredWidth = Math.floor(
    scoreElement.getBoundingClientRect().width || scoreElement.clientWidth,
  );
  const availableWidth = measuredWidth || DEFAULT_STAFF_WIDTH;

  return Math.max(MIN_STAFF_WIDTH, availableWidth - SCORE_WIDTH_PADDING);
}
