import type abcjs from "abcjs";
import type { ThemeMode } from "../shared/settings";
import type { ChatMusicCodeToggleElement } from "./components/code-toggle";
import type { DurationControl } from "./components/duration-control";
import type { KeyboardController, MidiPitch } from "./components/keyboard";
import type { ChatMusicQualityElement } from "./components/quality-panel";
import type { TempoControl } from "./components/tempo-control";

export interface RenderInstance {
  container: HTMLElement;
  scoreElement: HTMLElement;
  keyboard: KeyboardController;
  audioElement: HTMLElement;
  qualityElement: ChatMusicQualityElement;
  tempoControl: TempoControl;
  durationControl: DurationControl;
  codeToggleElement: ChatMusicCodeToggleElement;
  preElement: Element;
  preElementOriginalDisplay: string | null;
  isCodeCollapsed: boolean;
  abcText: string;
  themeMode: ThemeMode;
  visualObj: abcjs.TuneObject[] | null;
  renderedStaffWidth: number;
  synthControl: abcjs.SynthObjectController | null;
  activePlaybackElements: Element[];
  scoreResizeObserver: ResizeObserver | null;
  scoreResizeTimer: number | undefined;
  pendingPlaybackSeekPercent: number | null;
  pendingPlaybackSeekPromise: Promise<unknown> | null;
  progressDragCleanup: (() => void) | null;
  onSourceHighlight: ((ranges: SourceHighlightRange[]) => void) | undefined;
  cleanup: () => void;
}

export interface SourceHighlightRange {
  start: number;
  end: number;
}

export interface RenderAbcOptions {
  onSourceHighlight?: (ranges: SourceHighlightRange[]) => void;
}

export interface AbcElementRef {
  startChar?: number;
  endChar?: number;
}

export interface TimingEvent {
  type?: string;
  milliseconds: number;
  elements?: unknown[];
  midiPitches?: MidiPitch[];
  millisecondsPerMeasure?: number;
  startChar?: number | null;
  endChar?: number | null;
  startCharArray?: Array<number | null>;
  endCharArray?: Array<number | null>;
}

export type TimedTuneObject = Omit<abcjs.TuneObject, "setTiming"> & {
  noteTimings?: TimingEvent[];
  setTiming?: (qpm?: number, measuresOfDelay?: number) => TimingEvent[];
};

export type SeekableSynthControl = Omit<
  abcjs.SynthObjectController,
  "setProgress"
> & {
  isLoaded?: boolean;
  play?: () => Promise<unknown>;
  seek?: (percent: number) => void;
  setProgress?: (percent: number, totalTime?: number) => void;
  runWhenReady?: (fn: () => Promise<{ status: string }>) => Promise<unknown>;
};
