/**
 * ChatMusic Content Script Entry Point.
 * Sets up MutationObserver to detect ABC notation blocks in AI chat apps.
 */
import { scanForAbc } from "./detector";
import {
  renderAbc,
  hasRender,
  removeDisconnectedRenders,
  updateRenderThemes,
  updateCodeBlockVisibility,
  updateKeyboardVisibility,
} from "./renderer";
import {
  CODE_BLOCK_VISIBILITY_STORAGE_KEY,
  DEFAULT_CODE_BLOCK_VISIBILITY,
  DEFAULT_KEYBOARD_VISIBILITY,
  DEFAULT_THEME_MODE,
  KEYBOARD_VISIBILITY_STORAGE_KEY,
  THEME_MODE_STORAGE_KEY,
  normalizeCodeBlockVisibility,
  normalizeKeyboardVisibility,
  normalizeThemeMode,
  type CodeBlockVisibility,
  type KeyboardVisibility,
  type ThemeMode,
} from "../shared/settings";

const DEBUG = false;
function log(...args: unknown[]): void {
  if (DEBUG) console.debug("[ChatMusic]", ...args);
}

/** Track processed elements and their last known ABC text */
const processedText = new WeakMap<Element, string>();

/** Extension enabled state */
let enabled = true;

/** Rendered score theme preference */
let themeMode: ThemeMode = DEFAULT_THEME_MODE;

/** Source code visibility preference */
let codeBlockVisibility: CodeBlockVisibility = DEFAULT_CODE_BLOCK_VISIBILITY;

/** Piano keyboard visibility preference */
let keyboardVisibility: KeyboardVisibility = DEFAULT_KEYBOARD_VISIBILITY;

let domObserverStarted = false;
let themeObserverStarted = false;

/**
 * Scan a DOM node (or the whole document) for ABC notation blocks.
 */
function fullScan(): void {
  if (!enabled) return;

  removeDisconnectedRenders();

  const results = scanForAbc(document);
  log("Full scan: found", results.length, "ABC candidates");

  let detected = 0;
  for (const result of results) {
    const lastText = processedText.get(result.element);
    if (lastText !== result.abcText || !hasRender(result.element)) {
      renderAbc(
        result.element,
        result.abcText,
        themeMode,
        codeBlockVisibility,
        keyboardVisibility
      );
      processedText.set(result.element, result.abcText);
      detected++;
    }
  }

  if (detected > 0) {
    log("Rendered", detected, "ABC blocks");
    updateBadge(detected);
  }
}

/**
 * Update extension badge with count of detected ABC blocks.
 */
function updateBadge(count: number): void {
  try {
    chrome.runtime.sendMessage({ type: "UPDATE_BADGE", count });
  } catch {
    // Extension context may be invalidated
  }
}

/**
 * Debounce utility.
 */
function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number
): (...args: T) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: T) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Handle mutations from MutationObserver.
 * Instead of processing individual mutations (which can miss things during streaming),
 * we debounce and do a full re-scan of the document.
 */
const scheduleScan = debounce(() => {
  if (!enabled) return;
  fullScan();
}, 300);

const scheduleThemeSync = debounce(() => {
  if (!enabled || themeMode !== "auto") return;
  updateRenderThemes(themeMode);
}, 100);

/**
 * Set up the MutationObserver on document.body.
 */
function setupObserver(): void {
  if (domObserverStarted) return;

  const observer = new MutationObserver(() => {
    removeDisconnectedRenders();
    scheduleScan();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  domObserverStarted = true;
  log("MutationObserver attached to document.body");
}

function setupThemeObserver(): void {
  if (themeObserverStarted) return;

  const observer = new MutationObserver(() => {
    scheduleThemeSync();
  });
  const options: MutationObserverInit = {
    attributes: true,
    attributeFilter: [
      "class",
      "style",
      "data-theme",
      "data-color-mode",
      "data-bs-theme",
    ],
  };

  observer.observe(document.documentElement, options);
  if (document.body) observer.observe(document.body, options);

  window
    .matchMedia?.("(prefers-color-scheme: dark)")
    .addEventListener("change", scheduleThemeSync);

  themeObserverStarted = true;
  log("Theme observer attached");
}

/**
 * Listen for enable/disable messages from the popup.
 */
function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SET_ENABLED") {
      enabled = message.enabled;
      if (enabled) {
        setupObserver();
        setupThemeObserver();
        fullScan();
      }
    }

    if (message.type === "SET_THEME_MODE") {
      themeMode = normalizeThemeMode(message.themeMode);
      updateRenderThemes(themeMode);
    }

    if (message.type === "SET_CODE_BLOCK_VISIBILITY") {
      codeBlockVisibility = normalizeCodeBlockVisibility(
        message.codeBlockVisibility
      );
      updateCodeBlockVisibility(codeBlockVisibility);
    }

    if (message.type === "SET_KEYBOARD_VISIBILITY") {
      keyboardVisibility = normalizeKeyboardVisibility(
        message.keyboardVisibility
      );
      updateKeyboardVisibility(keyboardVisibility);
    }
  });
}

/**
 * Load enabled state from storage.
 */
async function loadState(): Promise<void> {
  try {
    const result = await chrome.storage.sync.get([
      "enabled",
      THEME_MODE_STORAGE_KEY,
      CODE_BLOCK_VISIBILITY_STORAGE_KEY,
      KEYBOARD_VISIBILITY_STORAGE_KEY,
    ]);
    enabled = result.enabled !== false; // Default to enabled
    themeMode = normalizeThemeMode(result[THEME_MODE_STORAGE_KEY]);
    codeBlockVisibility = normalizeCodeBlockVisibility(
      result[CODE_BLOCK_VISIBILITY_STORAGE_KEY]
    );
    keyboardVisibility = normalizeKeyboardVisibility(
      result[KEYBOARD_VISIBILITY_STORAGE_KEY]
    );
  } catch {
    enabled = true;
    themeMode = DEFAULT_THEME_MODE;
    codeBlockVisibility = DEFAULT_CODE_BLOCK_VISIBILITY;
    keyboardVisibility = DEFAULT_KEYBOARD_VISIBILITY;
  }
}

/**
 * Initialize the content script.
 */
async function init(): Promise<void> {
  await loadState();

  // Listen for messages even when detection starts disabled.
  setupMessageListener();

  if (!enabled) {
    log("Extension disabled, skipping init");
    return;
  }

  // Initial scan of existing DOM
  log("Initial scan...");
  fullScan();

  // Set up observer for future changes
  setupObserver();
  setupThemeObserver();

  log("Content script initialized on", window.location.href);
}

// Start
init();
