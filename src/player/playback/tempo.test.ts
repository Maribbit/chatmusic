import { describe, expect, it } from "vitest";
import {
  formatBpm,
  getBpmFromMillisecondsPerMeasure,
  getEffectiveBpm,
  getTuneBaseBpm,
  parseWarpPercent,
  type TempoTune,
} from "./tempo";

describe("tempo helpers", () => {
  it("reads the base BPM from an abcjs tune object", () => {
    const tune: TempoTune = { getBpm: () => 96 };

    expect(getTuneBaseBpm(tune)).toBe(96);
  });

  it("calculates effective BPM from playback warp percent", () => {
    expect(getEffectiveBpm(120, 50)).toBe(60);
    expect(getEffectiveBpm(120, 125)).toBe(150);
  });

  it("derives BPM from per-measure timing information", () => {
    const tune: TempoTune = { getBeatsPerMeasure: () => 4 };

    expect(getBpmFromMillisecondsPerMeasure(tune, 2000)).toBe(120);
  });

  it("formats invalid tempo values as unavailable", () => {
    expect(formatBpm(null)).toBe("--");
    expect(parseWarpPercent("")).toBeNull();
    expect(parseWarpPercent("0")).toBeNull();
  });
});