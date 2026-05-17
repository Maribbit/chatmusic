import { getAbcDownloadFilename as getScoreDownloadFilename } from "./filename";

const SUPPORTED_ABC_EXTENSIONS = [".abc", ".txt"];

export class AbcFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AbcFileError";
  }
}

export async function importAbcFile(file: File): Promise<string> {
  if (!isAbcFile(file)) {
    throw new AbcFileError("Please choose an ABC or plain text file (.abc or .txt).");
  }

  return file.text();
}

export function isAbcFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();

  return SUPPORTED_ABC_EXTENSIONS.some((extension) =>
    lowerName.endsWith(extension)
  );
}

export function getAbcSourceDownloadFilename(abcText: string): string {
  return getScoreDownloadFilename(abcText, "abc");
}

export function downloadAbcSource(abcText: string, filename: string): void {
  const blob = new Blob([abcText], { type: "text/vnd.abc;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}