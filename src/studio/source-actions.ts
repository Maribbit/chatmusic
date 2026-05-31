import {
  downloadAbcSource,
  getAbcSourceDownloadFilename,
  importAbcFile,
} from "../shared/abc-file";

interface SourceStatsTargets {
  copySourceButton: HTMLButtonElement;
  exportAbcButton: HTMLButtonElement;
  sourceStats: HTMLElement;
}

interface ImportStudioAbcFileOptions {
  abcFileInput: HTMLInputElement;
  importAbcButton: HTMLButtonElement;
  qualityPanel: HTMLElement;
  renderCurrentInput: () => void;
  renderStatus: HTMLElement;
  setInputValue: (value: string) => void;
}

export function getSourceStatsText(sourceText: string): string {
  const characterCount = sourceText.length;
  const lineCount = sourceText.length === 0 ? 0 : sourceText.split("\n").length;
  return `${lineCount} lines, ${characterCount} chars`;
}

export function updateStudioSourceStats(
  targets: SourceStatsTargets,
  sourceText: string,
): void {
  const characterCount = sourceText.length;
  targets.sourceStats.textContent = getSourceStatsText(sourceText);
  targets.copySourceButton.disabled = characterCount === 0;
  targets.exportAbcButton.disabled = characterCount === 0;
}

export async function copyStudioSourceToClipboard(
  sourceText: string,
  sourceStats: HTMLElement,
  updateSourceStats: () => void,
): Promise<void> {
  try {
    await navigator.clipboard.writeText(sourceText);
    sourceStats.textContent = "Copied";
  } catch (error) {
    console.error("[ChatMusic Studio] Copy failed:", error);
    sourceStats.textContent = "Copy failed";
  }

  window.setTimeout(updateSourceStats, 1200);
}

export async function importStudioAbcFile({
  abcFileInput,
  importAbcButton,
  qualityPanel,
  renderCurrentInput,
  renderStatus,
  setInputValue,
}: ImportStudioAbcFileOptions): Promise<void> {
  const file = abcFileInput.files?.[0];
  if (!file) return;

  renderStatus.textContent = "Opening ABC...";
  importAbcButton.disabled = true;

  try {
    const abcText = await importAbcFile(file);
    setInputValue(abcText);
    renderCurrentInput();
    if (qualityPanel.hidden) renderStatus.textContent = "Opened ABC";
  } catch (error) {
    console.error("[ChatMusic Studio] ABC import failed:", error);
    renderStatus.textContent = getAbcImportErrorMessage(error);
  } finally {
    importAbcButton.disabled = false;
    abcFileInput.value = "";
  }
}

export function exportStudioAbcFile(
  sourceText: string,
  sourceStats: HTMLElement,
  updateSourceStats: () => void,
): void {
  if (!sourceText.trim()) return;

  downloadAbcSource(sourceText, getAbcSourceDownloadFilename(sourceText));
  sourceStats.textContent = "Saved ABC";
  window.setTimeout(updateSourceStats, 1200);
}

export function getAbcImportErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "ABC import failed";
}
