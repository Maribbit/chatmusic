import {
  DEFAULT_THEME_MODE,
  KEYBOARD_VISIBILITY_STORAGE_KEY,
  THEME_MODE_STORAGE_KEY,
  normalizeKeyboardVisibility,
  normalizeThemeMode,
  type KeyboardVisibility,
  type ThemeMode,
} from "../shared/settings";
import {
  renderAbc,
  removeRender,
  type RenderInstance,
} from "../content/renderer";

const STUDIO_SOURCE_STORAGE_KEY = "chatmusicStudioAbcText";
const STUDIO_DESKTOP_SPLIT_STORAGE_KEY = "chatmusicStudioDesktopSplit";
const STUDIO_MOBILE_SPLIT_STORAGE_KEY = "chatmusicStudioMobileSplit";
const RENDER_DEBOUNCE_MS = 350;
const URL_ABC_HASH_PREFIX = "abc=";
const MIN_DESKTOP_EDITOR_WIDTH = 280;
const MIN_DESKTOP_PREVIEW_WIDTH = 320;
const MIN_MOBILE_EDITOR_HEIGHT = 280;
const MIN_MOBILE_PREVIEW_HEIGHT = 420;
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

  input.value =
    readAbcFromUrlHash() ??
    window.localStorage.getItem(STUDIO_SOURCE_STORAGE_KEY) ??
    EXAMPLE_ABC;
  window.localStorage.setItem(STUDIO_SOURCE_STORAGE_KEY, input.value);

  const settings = await loadSettings();
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
    await chrome.storage.sync.set({ [THEME_MODE_STORAGE_KEY]: themeMode });
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
  const hash = window.location.hash.slice(1);
  if (!hash.startsWith(URL_ABC_HASH_PREFIX)) return null;

  const abcText = decodeURIComponent(hash.slice(URL_ABC_HASH_PREFIX.length));
  window.history.replaceState(null, "", window.location.pathname);
  return abcText;
}

async function loadSettings(): Promise<{
  themeMode: ThemeMode;
  keyboardVisibility: KeyboardVisibility;
}> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      [
        THEME_MODE_STORAGE_KEY,
        KEYBOARD_VISIBILITY_STORAGE_KEY,
      ],
      (result) => {
        resolve({
          themeMode: normalizeThemeMode(
            result[THEME_MODE_STORAGE_KEY] ?? DEFAULT_THEME_MODE
          ),
          keyboardVisibility: normalizeKeyboardVisibility(
            result[KEYBOARD_VISIBILITY_STORAGE_KEY]
          ),
        });
      }
    );
  });
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