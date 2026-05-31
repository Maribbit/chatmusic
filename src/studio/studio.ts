import {
  DEFAULT_THEME_MODE,
  normalizeEditorWrap,
  normalizeThemeMode,
  normalizeLayoutMode,
  type AbcAutoCheck,
  type EditorWrap,
  type KeyboardVisibility,
  type ThemeMode,
  type LayoutMode,
} from "../shared/settings";
import type {
  AbcDiagnostic,
  AbcQualityReport,
} from "../shared/abc-quality/diagnostics";
import { validateAbcSource } from "../shared/abc-quality/validate";
import { decodeStudioAbcHash } from "../shared/studio-url";
import {
  downloadAbcSource,
  getAbcSourceDownloadFilename,
  importAbcFile,
} from "../shared/abc-file";
import {
  renderAbc,
  removeRender,
  type RenderInstance,
  type SourceHighlightRange,
} from "../content/renderer";
import {
  loadStudioSettings,
  saveStudioAbcAutoCheck,
  saveStudioEditorWrap,
  saveStudioThemeMode,
  saveStudioLayoutMode,
} from "./settings-store";

const STUDIO_SOURCE_STORAGE_KEY = "chatmusicStudioAbcText";
const STUDIO_DESKTOP_SPLIT_STORAGE_KEY = "chatmusicStudioDesktopSplit";
const STUDIO_MOBILE_SPLIT_STORAGE_KEY = "chatmusicStudioMobileSplit";
const RENDER_DEBOUNCE_MS = 350;
const MIN_DESKTOP_EDITOR_WIDTH = 280;
const MIN_DESKTOP_PREVIEW_WIDTH = 320;
const MIN_MOBILE_EDITOR_HEIGHT = 160;
const MIN_MOBILE_PREVIEW_HEIGHT = 220;
const SPLIT_KEYBOARD_STEP = 24;

const EXAMPLE_ABC = `X: 1
T: ChatMusic Studio Example
M: 4/4
L: 1/4
Q: 1/4=108
K: C
C D E F | G A B c | c B A G | F E D C |
E2 D2 | C4 |]`;

const input = document.getElementById("abcInput") as HTMLTextAreaElement;
const editorFrame = document.getElementById("abcEditorFrame") as HTMLElement;
const sourceHighlightMirror = document.getElementById(
  "abcHighlightMirror",
) as HTMLElement;
const studioShell = document.querySelector(".studio-shell") as HTMLElement;
const sourceElement = document.getElementById("studioSource") as HTMLElement;
const renderMount = document.getElementById("renderMount") as HTMLElement;
const editorPane = document.querySelector(".editor-pane") as HTMLElement;
const studioResizer = document.getElementById("studioResizer") as HTMLElement;
const sourceStats = document.getElementById("sourceStats") as HTMLElement;
const renderStatus = document.getElementById("renderStatus") as HTMLElement;
const qualityPanel = document.getElementById("qualityPanel") as HTMLElement;
const themeModeForm = document.getElementById(
  "themeModeForm",
) as HTMLFormElement;
const layoutModeForm = document.getElementById(
  "layoutModeForm",
) as HTMLFormElement;
const autoCheckInput = document.getElementById(
  "autoCheckInput",
) as HTMLInputElement;
const editorWrapInput = document.getElementById(
  "editorWrapInput",
) as HTMLInputElement;
const copySourceButton = document.getElementById(
  "copySourceButton",
) as HTMLButtonElement;
const importAbcButton = document.getElementById(
  "importAbcButton",
) as HTMLButtonElement;
const abcFileInput = document.getElementById(
  "abcFileInput",
) as HTMLInputElement;
const exportAbcButton = document.getElementById(
  "exportAbcButton",
) as HTMLButtonElement;
const loadExampleButton = document.getElementById(
  "loadExampleButton",
) as HTMLButtonElement;
const clearButton = document.getElementById("clearButton") as HTMLButtonElement;
const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
const stackedLayoutQuery = window.matchMedia("(max-width: 860px)");

let renderTimer: number | undefined;
let currentInstance: RenderInstance | null = null;
let currentKeyboardVisibility: KeyboardVisibility = "visible";
let currentAbcAutoCheck: AbcAutoCheck = "enabled";
let currentEditorWrap: EditorWrap = "disabled";
let explicitLayoutMode: LayoutMode = "auto";
let isResizing = false;
let currentSourceHighlightKey = "";

void initializeStudio();

async function initializeStudio(): Promise<void> {
  restoreSplitSizes();
  updateResizerOrientation();
  window.requestAnimationFrame(clampRestoredSplitSize);

  input.value =
    readAbcFromUrlHash() ??
    window.localStorage.getItem(STUDIO_SOURCE_STORAGE_KEY) ??
    EXAMPLE_ABC;
  window.localStorage.setItem(STUDIO_SOURCE_STORAGE_KEY, input.value);

  const settings = await loadStudioSettings();
  currentKeyboardVisibility = settings.keyboardVisibility;
  currentAbcAutoCheck = settings.abcAutoCheck;
  currentEditorWrap = settings.editorWrap;
  themeModeForm.themeMode.value = settings.themeMode;
  layoutModeForm.layoutMode.value = settings.layoutMode;
  explicitLayoutMode = settings.layoutMode;

  autoCheckInput.checked = settings.abcAutoCheck === "enabled";
  applyEditorWrap(settings.editorWrap);
  applyStudioTheme(settings.themeMode);
  applyStudioLayoutMode(settings.layoutMode);

  input.addEventListener("input", () => {
    clearSourceHighlight();
    updateSourceStats();
    window.localStorage.setItem(STUDIO_SOURCE_STORAGE_KEY, input.value);
    hideQualityPanel();
    renderStatus.textContent = "Checking...";
    scheduleRender();
  });
  input.addEventListener("scroll", syncSourceHighlightScroll);

  autoCheckInput.addEventListener("change", () => {
    void updateAbcAutoCheckSetting(
      autoCheckInput.checked ? "enabled" : "disabled",
    );
  });
  editorWrapInput.addEventListener("change", () => {
    void updateEditorWrapSetting(
      editorWrapInput.checked ? "enabled" : "disabled",
    );
  });
  copySourceButton.addEventListener("click", () => {
    void copySourceToClipboard();
  });
  importAbcButton.addEventListener("click", () => {
    abcFileInput.click();
  });
  abcFileInput.addEventListener("change", () => {
    void importSelectedAbcFile();
  });
  exportAbcButton.addEventListener("click", () => {
    exportCurrentAbcFile();
  });
  loadExampleButton.addEventListener("click", () => {
    setInputValue(EXAMPLE_ABC);
    renderCurrentInput();
  });
  clearButton.addEventListener("click", () => {
    setInputValue("");
    renderCurrentInput();
    input.focus();
  });
  themeModeForm.addEventListener("change", async () => {
    const themeMode = normalizeThemeMode(themeModeForm.themeMode.value);
    applyStudioTheme(themeMode);
    await saveStudioThemeMode(themeMode);
    renderCurrentInput();
  });
  layoutModeForm.addEventListener("change", async () => {
    const layoutMode = normalizeLayoutMode(layoutModeForm.layoutMode.value);
    explicitLayoutMode = layoutMode;
    applyStudioLayoutMode(layoutMode);
    updateResizerOrientation();
    await saveStudioLayoutMode(layoutMode);
    window.requestAnimationFrame(clampRestoredSplitSize);
  });
  colorSchemeQuery.addEventListener("change", () => {
    if (getSelectedThemeMode() === "auto") {
      applyStudioTheme("auto");
      renderCurrentInput();
    }
  });
  stackedLayoutQuery.addEventListener("change", () => {
    if (explicitLayoutMode === "auto") {
      updateResizerOrientation();
      window.requestAnimationFrame(clampRestoredSplitSize);
    }
  });
  studioResizer.addEventListener("pointerdown", startResize);
  studioResizer.addEventListener("keydown", handleResizerKeydown);
  window.addEventListener("pointermove", resizeFromPointer);
  window.addEventListener("pointerup", stopResize);

  updateSourceStats();
  renderCurrentInput();
}

async function updateAbcAutoCheckSetting(
  abcAutoCheck: AbcAutoCheck,
): Promise<void> {
  currentAbcAutoCheck = abcAutoCheck;
  autoCheckInput.checked = abcAutoCheck === "enabled";
  await saveStudioAbcAutoCheck(abcAutoCheck);
  checkCurrentAbcSource();
}

async function updateEditorWrapSetting(editorWrap: EditorWrap): Promise<void> {
  applyEditorWrap(editorWrap);
  await saveStudioEditorWrap(editorWrap);
}

function applyEditorWrap(editorWrap: EditorWrap): void {
  currentEditorWrap = normalizeEditorWrap(editorWrap);
  editorWrapInput.checked = currentEditorWrap === "enabled";
  editorFrame.dataset.editorWrap = currentEditorWrap;
  input.wrap = currentEditorWrap === "enabled" ? "soft" : "off";
  if (currentEditorWrap === "enabled") input.scrollLeft = 0;
  syncSourceHighlightScroll();
}

function restoreSplitSizes(): void {
  const desktopSplit = window.localStorage.getItem(
    STUDIO_DESKTOP_SPLIT_STORAGE_KEY,
  );
  const mobileSplit = window.localStorage.getItem(
    STUDIO_MOBILE_SPLIT_STORAGE_KEY,
  );

  if (desktopSplit) {
    studioShell.style.setProperty("--studio-editor-size", desktopSplit);
  }
  if (mobileSplit) {
    studioShell.style.setProperty("--studio-editor-mobile-size", mobileSplit);
  }
}

function updateResizerOrientation(): void {
  studioResizer.setAttribute(
    "aria-orientation",
    isStackedLayout() ? "horizontal" : "vertical",
  );
}

function clampRestoredSplitSize(): void {
  if (isStackedLayout()) {
    setMobileEditorHeight(editorPane.getBoundingClientRect().height);
  }
}

function startResize(event: PointerEvent): void {
  isResizing = true;
  studioShell.classList.add("is-resizing");
  studioResizer.setPointerCapture(event.pointerId);
}

function resizeFromPointer(event: PointerEvent): void {
  if (!isResizing) return;

  if (isStackedLayout()) {
    setMobileEditorHeight(
      event.clientY - editorPane.getBoundingClientRect().top,
    );
  } else {
    setDesktopEditorWidth(
      event.clientX - studioShell.getBoundingClientRect().left,
    );
  }
}

function stopResize(): void {
  if (!isResizing) return;
  isResizing = false;
  studioShell.classList.remove("is-resizing");
}

function handleResizerKeydown(event: KeyboardEvent): void {
  const stackedLayout = isStackedLayout();
  const delta = getResizeDelta(event, stackedLayout);
  if (delta === 0) return;

  event.preventDefault();
  if (stackedLayout) {
    setMobileEditorHeight(editorPane.getBoundingClientRect().height + delta);
  } else {
    setDesktopEditorWidth(editorPane.getBoundingClientRect().width + delta);
  }
}

function getResizeDelta(event: KeyboardEvent, stackedLayout: boolean): number {
  if (stackedLayout) {
    if (event.key === "ArrowUp") return -SPLIT_KEYBOARD_STEP;
    if (event.key === "ArrowDown") return SPLIT_KEYBOARD_STEP;
    return 0;
  }

  if (event.key === "ArrowLeft") return -SPLIT_KEYBOARD_STEP;
  if (event.key === "ArrowRight") return SPLIT_KEYBOARD_STEP;
  return 0;
}

function setDesktopEditorWidth(width: number): void {
  const maxWidth =
    studioShell.getBoundingClientRect().width - MIN_DESKTOP_PREVIEW_WIDTH;
  const editorWidth = clamp(width, MIN_DESKTOP_EDITOR_WIDTH, maxWidth);
  const value = `${editorWidth}px`;

  studioShell.style.setProperty("--studio-editor-size", value);
  window.localStorage.setItem(STUDIO_DESKTOP_SPLIT_STORAGE_KEY, value);
}

function setMobileEditorHeight(height: number): void {
  const maxHeight =
    studioShell.getBoundingClientRect().height -
    MIN_MOBILE_PREVIEW_HEIGHT -
    studioResizer.getBoundingClientRect().height;
  const editorHeight = clamp(height, MIN_MOBILE_EDITOR_HEIGHT, maxHeight);
  const value = `${editorHeight}px`;

  studioShell.style.setProperty("--studio-editor-mobile-size", value);
  window.localStorage.setItem(STUDIO_MOBILE_SPLIT_STORAGE_KEY, value);
}

function isStackedLayout(): boolean {
  if (explicitLayoutMode === "vertical") return true;
  if (explicitLayoutMode === "horizontal") return false;
  return stackedLayoutQuery.matches;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function readAbcFromUrlHash(): string | null {
  const abcText = decodeStudioAbcHash(window.location.hash);
  if (abcText === null) return null;

  window.history.replaceState(null, "", window.location.pathname);
  return abcText;
}

function setInputValue(value: string): void {
  input.value = value;
  clearSourceHighlight();
  window.localStorage.setItem(STUDIO_SOURCE_STORAGE_KEY, value);
  updateSourceStats();
}

function clearSourceHighlight(): void {
  updateSourceHighlight([]);
}

function updateSourceHighlight(ranges: SourceHighlightRange[]): void {
  const normalizedRanges = normalizeSourceHighlightRanges(
    ranges,
    input.value.length,
  );
  const nextKey = normalizedRanges
    .map((range) => `${range.start}:${range.end}`)
    .join(";");
  if (nextKey === currentSourceHighlightKey) {
    syncSourceHighlightScroll();
    return;
  }

  currentSourceHighlightKey = nextKey;
  sourceHighlightMirror.hidden = normalizedRanges.length === 0;
  if (normalizedRanges.length === 0) {
    sourceHighlightMirror.replaceChildren();
    return;
  }

  sourceHighlightMirror.replaceChildren(
    createSourceHighlightFragment(input.value, normalizedRanges),
  );
  syncSourceHighlightScroll();
}

function syncSourceHighlightScroll(): void {
  sourceHighlightMirror.scrollTop = input.scrollTop;
  sourceHighlightMirror.scrollLeft = input.scrollLeft;
}

function normalizeSourceHighlightRanges(
  ranges: SourceHighlightRange[],
  sourceLength: number,
): SourceHighlightRange[] {
  const boundedRanges = ranges
    .map((range) => ({
      start: clamp(range.start, 0, sourceLength),
      end: clamp(range.end, 0, sourceLength),
    }))
    .filter((range) => range.end > range.start)
    .sort(
      (first, second) => first.start - second.start || first.end - second.end,
    );
  const mergedRanges: SourceHighlightRange[] = [];

  for (const range of boundedRanges) {
    const previousRange = mergedRanges[mergedRanges.length - 1];
    if (previousRange && range.start <= previousRange.end) {
      previousRange.end = Math.max(previousRange.end, range.end);
    } else {
      mergedRanges.push({ ...range });
    }
  }

  return mergedRanges;
}

function createSourceHighlightFragment(
  sourceText: string,
  ranges: SourceHighlightRange[],
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  let position = 0;

  for (const range of ranges) {
    if (range.start > position) {
      fragment.append(
        document.createTextNode(sourceText.slice(position, range.start)),
      );
    }

    const highlight = document.createElement("mark");
    highlight.className = "abc-highlight-token";
    highlight.textContent = sourceText.slice(range.start, range.end);
    fragment.append(highlight);
    position = range.end;
  }

  if (position < sourceText.length) {
    fragment.append(document.createTextNode(sourceText.slice(position)));
  }

  return fragment;
}

function offsetSourceHighlightRanges(
  ranges: SourceHighlightRange[],
  offset: number,
): SourceHighlightRange[] {
  return ranges.map((range) => ({
    start: range.start + offset,
    end: range.end + offset,
  }));
}

function updateSourceStats(): void {
  const characterCount = input.value.length;
  const lineCount =
    input.value.length === 0 ? 0 : input.value.split("\n").length;
  sourceStats.textContent = `${lineCount} lines, ${characterCount} chars`;
  copySourceButton.disabled = characterCount === 0;
  exportAbcButton.disabled = characterCount === 0;
}

function checkCurrentAbcSource(): void {
  const report = validateAbcSource(input.value);
  renderStatus.textContent = getQualityStatusText(report);

  if (isAutoCheckEnabled() && report.status !== "ok") {
    renderQualityReport(report);
  } else {
    hideQualityPanel();
  }
}

function runAutoCheck(): void {
  checkCurrentAbcSource();
}

function isAutoCheckEnabled(): boolean {
  return currentAbcAutoCheck === "enabled";
}

function renderQualityReport(report: AbcQualityReport): void {
  qualityPanel.hidden = false;
  qualityPanel.dataset.status = report.status;
  qualityPanel.replaceChildren(createQualitySummary(report));

  if (report.diagnostics.length === 0) return;

  const list = document.createElement("ul");
  list.className = "quality-list";
  for (const diagnostic of report.diagnostics) {
    list.append(createDiagnosticItem(diagnostic));
  }
  qualityPanel.append(list);
}

function createQualitySummary(report: AbcQualityReport): HTMLElement {
  const summary = document.createElement("p");
  summary.className = "quality-summary";

  if (report.status === "ok") {
    summary.textContent = `No abcjs parser warnings (${report.tuneCount} tune${report.tuneCount === 1 ? "" : "s"}).`;
  } else {
    summary.textContent = `${report.diagnostics.length} issue${report.diagnostics.length === 1 ? "" : "s"} found.`;
  }

  return summary;
}

function createDiagnosticItem(diagnostic: AbcDiagnostic): HTMLElement {
  const item = document.createElement("li");
  item.className = "quality-item";

  const title = document.createElement("span");
  title.className = "quality-title";
  title.textContent = `${diagnostic.severity.toUpperCase()}: ${diagnostic.title}`;

  const message = document.createElement("span");
  message.textContent = diagnostic.message;

  item.append(title, message);

  const location = formatDiagnosticLocation(diagnostic);
  if (location) {
    const locationElement = document.createElement("span");
    locationElement.className = "quality-location";
    locationElement.textContent = location;
    item.append(locationElement);
  }

  return item;
}

function formatDiagnosticLocation(diagnostic: AbcDiagnostic): string | null {
  if (diagnostic.line === undefined) return null;
  if (diagnostic.column === undefined) return `Line ${diagnostic.line}`;
  return `Line ${diagnostic.line}, column ${diagnostic.column}`;
}

function hideQualityPanel(): void {
  qualityPanel.hidden = true;
  qualityPanel.replaceChildren();
}

function getQualityStatusText(report: AbcQualityReport): string {
  if (report.status === "ok") return "ABC check passed";
  if (report.status === "warning") return "ABC warnings found";
  return "ABC errors found";
}

async function copySourceToClipboard(): Promise<void> {
  try {
    await navigator.clipboard.writeText(input.value);
    sourceStats.textContent = "Copied";
  } catch (error) {
    console.error("[ChatMusic Studio] Copy failed:", error);
    sourceStats.textContent = "Copy failed";
  }

  window.setTimeout(updateSourceStats, 1200);
}

async function importSelectedAbcFile(): Promise<void> {
  const file = abcFileInput.files?.[0];
  if (!file) return;

  renderStatus.textContent = "Opening ABC...";
  importAbcButton.disabled = true;

  try {
    const abcText = await importAbcFile(file);
    setInputValue(abcText);
    renderCurrentInput();
    setImportCompleteStatus("Opened ABC");
  } catch (error) {
    console.error("[ChatMusic Studio] ABC import failed:", error);
    renderStatus.textContent = getAbcImportErrorMessage(error);
  } finally {
    importAbcButton.disabled = false;
    abcFileInput.value = "";
  }
}

function exportCurrentAbcFile(): void {
  const abcText = input.value;
  if (!abcText.trim()) return;

  downloadAbcSource(abcText, getAbcSourceDownloadFilename(abcText));
  sourceStats.textContent = "Saved ABC";
  window.setTimeout(updateSourceStats, 1200);
}

function setImportCompleteStatus(message: string): void {
  if (qualityPanel.hidden) renderStatus.textContent = message;
}

function getAbcImportErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "ABC import failed";
}

function scheduleRender(): void {
  if (renderTimer !== undefined) window.clearTimeout(renderTimer);
  renderStatus.textContent = "Editing...";
  renderTimer = window.setTimeout(renderCurrentInput, RENDER_DEBOUNCE_MS);
}

function renderCurrentInput(): void {
  if (renderTimer !== undefined) {
    window.clearTimeout(renderTimer);
    renderTimer = undefined;
  }

  const abcText = input.value.trim();
  const sourceOffset = abcText ? input.value.indexOf(abcText) : 0;
  clearSourceHighlight();
  sourceElement.textContent = abcText;

  if (!abcText) {
    removeRender(sourceElement);
    currentInstance = null;
    renderMount.classList.remove("has-render");
    renderStatus.textContent = "Ready";
    return;
  }

  try {
    currentInstance = renderAbc(
      sourceElement,
      abcText,
      getSelectedThemeMode(),
      "collapsed",
      currentKeyboardVisibility,
      {
        onSourceHighlight: (ranges) => {
          updateSourceHighlight(
            offsetSourceHighlightRanges(ranges, sourceOffset),
          );
        },
      },
    );
    currentInstance.container.dataset.chatmusicLayout = "studio";
    renderMount.classList.add("has-render");
    renderStatus.textContent = "Rendered";
    runAutoCheck();
  } catch (error) {
    console.error("[ChatMusic Studio] Render failed:", error);
    renderStatus.textContent = "Render failed";
  }
}

function getSelectedThemeMode(): ThemeMode {
  return normalizeThemeMode(
    themeModeForm.themeMode.value || DEFAULT_THEME_MODE,
  );
}

function applyStudioTheme(themeMode: ThemeMode): void {
  const resolvedTheme =
    themeMode === "auto"
      ? colorSchemeQuery.matches
        ? "dark"
        : "light"
      : themeMode;

  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themeMode = themeMode;
}

function applyStudioLayoutMode(layoutMode: LayoutMode): void {
  if (layoutMode === "horizontal") {
    studioShell.classList.add("layout-split");
    studioShell.classList.remove("layout-stacked");
  } else if (layoutMode === "vertical") {
    studioShell.classList.add("layout-stacked");
    studioShell.classList.remove("layout-split");
  } else {
    studioShell.classList.remove("layout-split", "layout-stacked");
  }
}
