import {
  downloadMidi,
  getMidiDownloadFilename,
} from "../../shared/abc-midi-export";
import type { RenderInstance } from "../types";
import { downloadSvg, getScoreSvg, getSvgDownloadFilename } from "./svg-export";

export function exportScore(instance: RenderInstance): void {
  const svg = getScoreSvg(instance.scoreElement);
  if (!svg) return;

  downloadSvg(svg, getSvgDownloadFilename(instance.abcText));
}

export function exportMidi(instance: RenderInstance): void {
  const tune = instance.visualObj?.[0];
  if (!tune) return;

  try {
    downloadMidi(tune, getMidiDownloadFilename(instance.abcText));
  } catch (error) {
    console.warn("[ChatMusic] MIDI export failed:", error);
  }
}
