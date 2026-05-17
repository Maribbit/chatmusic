import { unzipSync } from "fflate";
import {
  convertMusicXmlToAbc,
  MusicXmlConversionError,
} from "./musicxml-to-abc";

const SUPPORTED_MUSICXML_EXTENSIONS = [".musicxml", ".xml", ".mxl"];
const MXL_CONTAINER_PATH = "META-INF/container.xml";

export async function importMusicXmlFile(file: File): Promise<string> {
  if (file.name.toLowerCase().endsWith(".mxl")) {
    return convertMusicXmlToAbc(await readMxlMusicXmlText(file));
  }

  if (!isMusicXmlFile(file)) {
    throw new MusicXmlConversionError(
      "Please choose a MusicXML file (.musicxml, .xml, or .mxl)."
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

async function readMxlMusicXmlText(file: File): Promise<string> {
  let archive: Record<string, Uint8Array>;

  try {
    archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
  } catch (error) {
    throw new MusicXmlConversionError(
      `Could not read compressed MusicXML archive: ${getErrorMessage(error)}`
    );
  }

  const musicXmlPath = getMxlRootfilePath(archive);
  const musicXmlFile = archive[musicXmlPath];

  if (!musicXmlFile) {
    throw new MusicXmlConversionError(
      `The compressed MusicXML archive does not contain ${musicXmlPath}.`
    );
  }

  return new TextDecoder().decode(musicXmlFile);
}

function getMxlRootfilePath(archive: Record<string, Uint8Array>): string {
  const container = archive[MXL_CONTAINER_PATH];
  if (container) {
    const path = readContainerRootfilePath(new TextDecoder().decode(container));
    if (path) return path;
  }

  const fallbackPath = Object.keys(archive).find((path) => {
    const lowerPath = path.toLowerCase();
    return (
      !lowerPath.startsWith("meta-inf/") &&
      (lowerPath.endsWith(".musicxml") || lowerPath.endsWith(".xml"))
    );
  });

  if (fallbackPath) return fallbackPath;

  throw new MusicXmlConversionError(
    "The compressed MusicXML archive does not contain a MusicXML score file."
  );
}

function readContainerRootfilePath(containerXml: string): string | null {
  const document = new DOMParser().parseFromString(containerXml, "application/xml");
  const rootfile = Array.from(document.getElementsByTagName("*")).find(
    (element) => element.localName === "rootfile"
  );

  return rootfile?.getAttribute("full-path") || null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "unknown error";
}