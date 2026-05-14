export function getScoreSvg(scoreElement: HTMLElement): SVGSVGElement | null {
  const svg = scoreElement.querySelector("svg");

  return svg instanceof SVGSVGElement ? svg : null;
}

export function getSvgDownloadFilename(abcText: string): string {
  const title = /^T:\s*(.+)$/m.exec(abcText)?.[1]?.trim();
  const baseName = title ? sanitizeFilename(title) : "chatmusic-score";

  return `${baseName || "chatmusic-score"}.svg`;
}

export function serializeScoreSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;

  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("version", "1.1");

  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}\n`;
}

export function downloadSvg(svg: SVGSVGElement, filename: string): void {
  const blob = new Blob([serializeScoreSvg(svg)], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(value: string): string {
  return value
    .split("")
    .map((char) => (isUnsafeFilenameChar(char) ? " " : char))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function isUnsafeFilenameChar(char: string): boolean {
  return char.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(char);
}