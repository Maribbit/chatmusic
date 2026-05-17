import abcjs from "abcjs";
import { describe, expect, it } from "vitest";
import {
  createMidiBlob,
  createMidiData,
  getMidiDownloadFilename,
} from "./abc-midi-export";

describe("ABC MIDI export helpers", () => {
  it("uses the ABC title for MIDI filenames", () => {
    expect(getMidiDownloadFilename("X:1\nT:Morning Tune\nK:C\nCDEF")).toBe(
      "Morning Tune.mid"
    );
  });

  it("creates binary MIDI data from an abcjs tune object", () => {
    const tune = abcjs.parseOnly("X:1\nT:Morning\nK:C\nC|")[0];
    const data = createMidiData(tune);

    expect([...data.slice(0, 4)].map((value) => String.fromCharCode(value)).join(""))
      .toBe("MThd");
  });

  it("wraps MIDI data in an audio/midi blob", () => {
    const tune = abcjs.parseOnly("X:1\nK:C\nC|")[0];
    const blob = createMidiBlob(tune);

    expect(blob.type).toBe("audio/midi");
    expect(blob.size).toBeGreaterThan(0);
  });
});