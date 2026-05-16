import abcjs from "abcjs";
import { getAssetUrl } from "../shared/assets";

export const LOCAL_PIANO_INSTRUMENT = "acoustic_grand_piano";

const LOCAL_PIANO_SOUNDFONT_PATH = "soundfonts/FluidR3_GM/";
const PIANO_INSTRUMENT_PROGRAM = 0;
const FULL_KEYBOARD_START_PITCH = 21;
const FULL_KEYBOARD_END_PITCH = 108;
const KEYBOARD_NOTE_DURATION_MEASURES = 0.25;
const KEYBOARD_NOTE_VOLUME = 90;
const KEYBOARD_NOTE_MILLISECONDS_PER_MEASURE = 1000;
const WARMUP_NOTE_DURATION_MEASURES = 1 / 128;
const WARMUP_NOTE_VOLUME = 1;

let pianoWarmupPromise: Promise<void> | null = null;

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
    getLocalPianoSynthOptions().soundFontUrl
  );
}

export function warmLocalPianoSoundfont(): Promise<void> {
  if (pianoWarmupPromise) return pianoWarmupPromise;

  pianoWarmupPromise = loadLocalPianoSoundfont().catch((error: unknown) => {
    pianoWarmupPromise = null;
    throw error;
  });

  return pianoWarmupPromise;
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

async function loadLocalPianoSoundfont(): Promise<void> {
  if (!abcjs.synth.supportsAudio()) return;

  const sequence = new abcjs.synth.SynthSequence();
  const trackNumber = sequence.addTrack() as unknown as number;
  sequence.setInstrument(trackNumber, PIANO_INSTRUMENT_PROGRAM);

  for (
    let pitch = FULL_KEYBOARD_START_PITCH;
    pitch <= FULL_KEYBOARD_END_PITCH;
    pitch++
  ) {
    sequence.appendNote(
      trackNumber,
      pitch,
      WARMUP_NOTE_DURATION_MEASURES,
      WARMUP_NOTE_VOLUME,
      0
    );
  }

  const buffer = new abcjs.synth.CreateSynth();
  await buffer.init({
    sequence: sequence as unknown as abcjs.AudioSequence,
    millisecondsPerMeasure: KEYBOARD_NOTE_MILLISECONDS_PER_MEASURE,
    options: {
      soundFontUrl: getLocalPianoSynthOptions().soundFontUrl,
    },
  });
}