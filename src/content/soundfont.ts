import abcjs from "abcjs";
import { getAssetUrl } from "../shared/assets";

export const LOCAL_PIANO_INSTRUMENT = "acoustic_grand_piano";

const LOCAL_PIANO_SOUNDFONT_PATH = "soundfonts/FluidR3_GM/";
const PIANO_INSTRUMENT_PROGRAM = 0;
const KEYBOARD_NOTE_DURATION_MEASURES = 0.25;
const KEYBOARD_NOTE_VOLUME = 90;
const KEYBOARD_NOTE_MILLISECONDS_PER_MEASURE = 1000;

export function getLocalPianoSynthOptions(): abcjs.SynthOptions {
  return {
    soundFontUrl: getAssetUrl(LOCAL_PIANO_SOUNDFONT_PATH),
    sequenceCallback: forcePianoInstrument,
  };
}

export async function playLocalPianoPitch(pitch: number): Promise<void> {
  await abcjs.synth.playEvent(
    [
      {
        instrument: PIANO_INSTRUMENT_PROGRAM,
        pitch,
        duration: KEYBOARD_NOTE_DURATION_MEASURES,
        volume: KEYBOARD_NOTE_VOLUME,
        start: 0,
        gap: 0,
      },
    ],
    undefined,
    KEYBOARD_NOTE_MILLISECONDS_PER_MEASURE,
    getLocalPianoSynthOptions().soundFontUrl,
  );
}

export function forcePianoInstrument(
  noteMapTracks: abcjs.NoteMapTrack[],
): abcjs.NoteMapTrack[] {
  for (const noteMapTrack of noteMapTracks) {
    for (const note of noteMapTrack) {
      note.instrument = LOCAL_PIANO_INSTRUMENT;
    }
  }

  return noteMapTracks;
}
