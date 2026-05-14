import type abcjs from "abcjs";

export const LOCAL_PIANO_INSTRUMENT = "acoustic_grand_piano";

const LOCAL_PIANO_SOUNDFONT_PATH = "soundfonts/FluidR3_GM/";

export function getLocalPianoSynthOptions(): abcjs.SynthOptions {
  return {
    soundFontUrl: chrome.runtime.getURL(LOCAL_PIANO_SOUNDFONT_PATH),
    sequenceCallback: forcePianoInstrument,
  };
}

export function forcePianoInstrument(
  noteMapTracks: abcjs.NoteMapTrack[]
): abcjs.NoteMapTrack[] {
  for (const noteMapTrack of noteMapTracks) {
    for (const note of noteMapTrack) {
      note.instrument = LOCAL_PIANO_INSTRUMENT;
    }
  }

  return noteMapTracks;
}