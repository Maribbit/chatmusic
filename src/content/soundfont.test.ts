import { describe, expect, it } from "vitest";
import { forcePianoInstrument, LOCAL_PIANO_INSTRUMENT } from "./soundfont";

describe("soundfont helpers", () => {
  it("rewrites all playback notes to the bundled piano instrument", () => {
    const noteMapTracks = [
      [
        {
          pitch: 60,
          instrument: "violin",
          start: 0,
          end: 1,
          startChar: 0,
          endChar: 1,
          volume: 80,
        },
      ],
      [
        {
          pitch: 64,
          instrument: "flute",
          start: 1,
          end: 2,
          startChar: 2,
          endChar: 3,
          volume: 90,
        },
      ],
    ];

    expect(forcePianoInstrument(noteMapTracks)).toBe(noteMapTracks);
    expect(noteMapTracks.flat().map((note) => note.instrument)).toEqual([
      LOCAL_PIANO_INSTRUMENT,
      LOCAL_PIANO_INSTRUMENT,
    ]);
  });
});