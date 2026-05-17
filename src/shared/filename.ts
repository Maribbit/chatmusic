const DEFAULT_SCORE_FILENAME_STEM = "chatmusic-score";

export function getAbcTitle(abcText: string): string | null {
  return /^T:\s*(.+)$/m.exec(abcText)?.[1]?.trim() || null;
}

export function getAbcDownloadFilename(
  abcText: string,
  extension: string
): string {
  const title = getAbcTitle(abcText);
  const stem = sanitizeFilenameStem(title ?? DEFAULT_SCORE_FILENAME_STEM);
  const normalizedExtension = extension.startsWith(".")
    ? extension.slice(1)
    : extension;

  return `${stem}.${normalizedExtension}`;
}

export function sanitizeFilenameStem(value: string): string {
  return (
    value
      .split("")
      .map((char) => (isUnsafeFilenameChar(char) ? " " : char))
      .join("")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || DEFAULT_SCORE_FILENAME_STEM
  );
}

function isUnsafeFilenameChar(char: string): boolean {
  return char.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(char);
}