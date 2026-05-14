import { describe, expect, it } from "vitest";
import {
  formatDuration,
  getEffectiveDurationSeconds,
  getTuneDurationSeconds,
  type DurationTune,
} from "./duration";

describe("duration helpers", () => {
  it("reads total time from an abcjs tune object", () => {
    const tune: DurationTune = { getTotalTime: () => 83.2 };

    expect(getTuneDurationSeconds(tune)).toBe(83.2);
  });

  it("falls back to the last timing event", () => {
    expect(
      getTuneDurationSeconds(undefined, [{ milliseconds: 0 }, { milliseconds: 90500 }])
    ).toBe(90.5);
  });

  it("adjusts duration for playback warp percent", () => {
    expect(getEffectiveDurationSeconds(120, 200)).toBe(60);
    expect(getEffectiveDurationSeconds(120, 50)).toBe(240);
  });

  it("formats durations for display", () => {
    expect(formatDuration(83.9)).toBe("1:23");
    expect(formatDuration(3671)).toBe("1:01:11");
  });
});