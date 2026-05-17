import {
  DEFAULT_THEME_MODE,
  normalizeThemeMode,
  type KeyboardVisibility,
  type ThemeMode,
} from "../shared/settings";
import { decodeStudioAbcHash } from "../shared/studio-url";
import {
  downloadAbcSource,
  getAbcSourceDownloadFilename,
  importAbcFile,
} from "../shared/abc-file";
import { importMusicXmlFile } from "../shared/musicxml-file";
import {
  renderAbc,
  removeRender,
  type RenderInstance,
} from "../content/renderer";
import { loadStudioSettings, saveStudioThemeMode } from "./settings-store";

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
const studioShell = document.querySelector(".studio-shell") as HTMLElement;
const sourceElement = document.getElementById("studioSource") as HTMLElement;
const renderMount = document.getElementById("renderMount") as HTMLElement;
const editorPane = document.querySelector(".editor-pane") as HTMLElement;
const studioResizer = document.getElementById("studioResizer") as HTMLElement;
const sourceStats = document.getElementById("sourceStats") as HTMLElement;
const renderStatus = document.getElementById("renderStatus") as HTMLElement;
const themeModeSelect = document.getElementById(
  "themeModeSelect"
) as HTMLSelectElement;
const copySourceButton = document.getElementById(
  "copySourceButton"
) as HTMLButtonElement;
const importAbcButton = document.getElementById(
  "importAbcButton"
) as HTMLButtonElement;
const abcFileInput = document.getElementById(
  "abcFileInput"
) as HTMLInputElement;
const exportAbcButton = document.getElementById(
  "exportAbcButton"
) as HTMLButtonElement;
const importMusicXmlButton = document.getElementById(
  "importMusicXmlButton"
) as HTMLButtonElement;
const musicXmlInput = document.getElementById(
  "musicXmlInput"
) as HTMLInputElement;
const loadExampleButton = document.getElementById(
  "loadExampleButton"
) as HTMLButtonElement;
const clearButton = document.getElementById("clearButton") as HTMLButtonElement;
const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
const stackedLayoutQuery = window.matchMedia("(max-width: 860px)");

let renderTimer: number | undefined;
let currentInstance: RenderInstance | null = null;
let currentKeyboardVisibility: KeyboardVisibility = "visible";
let isResizing = false;

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
  themeModeSelect.value = settings.themeMode;
  applyStudioTheme(settings.themeMode);

  input.addEventListener("input", () => {
    updateSourceStats();
    window.localStorage.setItem(STUDIO_SOURCE_STORAGE_KEY, input.value);
    scheduleRender();
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
  importMusicXmlButton.addEventListener("click", () => {
    musicXmlInput.click();
  });
  musicXmlInput.addEventListener("change", () => {
    void importSelectedMusicXmlFile();
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
  themeModeSelect.addEventListener("change", async () => {
    const themeMode = normalizeThemeMode(themeModeSelect.value);
    applyStudioTheme(themeMode);
    await saveStudioThemeMode(themeMode);
    renderCurrentInput();
  });
  colorSchemeQuery.addEventListener("change", () => {
    if (getSelectedThemeMode() === "auto") {
      applyStudioTheme("auto");
      renderCurrentInput();
    }
  });
  stackedLayoutQuery.addEventListener("change", updateResizerOrientation);
  studioResizer.addEventListener("pointerdown", startResize);
  studioResizer.addEventListener("keydown", handleResizerKeydown);
  window.addEventListener("pointermove", resizeFromPointer);
  window.addEventListener("pointerup", stopResize);

  updateSourceStats();
  renderCurrentInput();
}

function restoreSplitSizes(): void {
  const desktopSplit = window.localStorage.getItem(
    STUDIO_DESKTOP_SPLIT_STORAGE_KEY
  );
  const mobileSplit = window.localStorage.getItem(
    STUDIO_MOBILE_SPLIT_STORAGE_KEY
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
    isStackedLayout() ? "horizontal" : "vertical"
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
    setMobileEditorHeight(event.clientY - editorPane.getBoundingClientRect().top);
  } else {
    setDesktopEditorWidth(event.clientX - studioShell.getBoundingClientRect().left);
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
  const maxWidth = studioShell.getBoundingClientRect().width - MIN_DESKTOP_PREVIEW_WIDTH;
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
  window.localStorage.setItem(STUDIO_SOURCE_STORAGE_KEY, value);
  updateSourceStats();
}

function updateSourceStats(): void {
  const characterCount = input.value.length;
  const lineCount = input.value.length === 0 ? 0 : input.value.split("\n").length;
  sourceStats.textContent = `${lineCount} lines, ${characterCount} chars`;
  copySourceButton.disabled = characterCount === 0;
  exportAbcButton.disabled = characterCount === 0;
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
    renderStatus.textContent = "Opened ABC";
  } catch (error) {
    console.error("[ChatMusic Studio] ABC import failed:", error);
    renderStatus.textContent = getImportErrorMessage(error);
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

async function importSelectedMusicXmlFile(): Promise<void> {
  const file = musicXmlInput.files?.[0];
  if (!file) return;

  renderStatus.textContent = "Importing...";
  importMusicXmlButton.disabled = true;

  try {
    const abcText = await importMusicXmlFile(file);
    setInputValue(abcText);
    renderCurrentInput();
    renderStatus.textContent = "Imported MusicXML";
  } catch (error) {
    console.error("[ChatMusic Studio] MusicXML import failed:", error);
    renderStatus.textContent = getImportErrorMessage(error);
  } finally {
    importMusicXmlButton.disabled = false;
    musicXmlInput.value = "";
  }
}

function getImportErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "MusicXML import failed";
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
      currentKeyboardVisibility
    );
    currentInstance.container.dataset.chatmusicLayout = "studio";
    renderMount.classList.add("has-render");
    renderStatus.textContent = "Rendered";
  } catch (error) {
    console.error("[ChatMusic Studio] Render failed:", error);
    renderStatus.textContent = "Render failed";
  }
}

function getSelectedThemeMode(): ThemeMode {
  return normalizeThemeMode(themeModeSelect.value || DEFAULT_THEME_MODE);
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