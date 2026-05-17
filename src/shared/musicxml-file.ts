import {
  convertMusicXmlToAbc,
  MusicXmlConversionError,
} from "./musicxml-to-abc";

const SUPPORTED_MUSICXML_EXTENSIONS = [".musicxml", ".xml"];

export async function importMusicXmlFile(file: File): Promise<string> {
  if (file.name.toLowerCase().endsWith(".mxl")) {
    throw new MusicXmlConversionError(
      "Compressed .mxl files are not supported yet. Export uncompressed MusicXML (.musicxml or .xml)."
    );
  }

  if (!isMusicXmlFile(file)) {
    throw new MusicXmlConversionError(
      "Please choose an uncompressed MusicXML file (.musicxml or .xml)."
    );
  }

  return convertMusicXmlToAbc(await file.text());
}

export function isMusicXmlFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();

  return SUPPORTED_MUSICXML_EXTENSIONS.some((extension) =>
    lowerName.endsWith(extension)
  );
}