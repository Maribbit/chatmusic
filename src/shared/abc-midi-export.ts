import abcjs from "abcjs";
import { getAbcDownloadFilename } from "./filename";

export function getMidiDownloadFilename(abcText: string): string {
  return getAbcDownloadFilename(abcText, "mid");
}

export function createMidiData(visualObj: abcjs.TuneObject): Uint8Array {
  const midiData: unknown = abcjs.synth.getMidiFile(visualObj, {
    midiOutputType: "binary",
  });

  if (!(midiData instanceof Uint8Array)) {
    throw new Error("abcjs did not return binary MIDI data.");
  }

  return midiData;
}

export function createMidiBlob(visualObj: abcjs.TuneObject): Blob {
  const midiData = createMidiData(visualObj);
  const buffer = new ArrayBuffer(midiData.byteLength);

  new Uint8Array(buffer).set(midiData);

  return new Blob([buffer], { type: "audio/midi" });
}

export function downloadMidi(
  visualObj: abcjs.TuneObject,
  filename: string
): void {
  const url = URL.createObjectURL(createMidiBlob(visualObj));
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}