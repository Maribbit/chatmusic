/**
 * ChatMusic Content Script Entry Point.
 * Sets up MutationObserver to detect ABC notation blocks in AI chat apps.
 */
import { detectAbc, scanForAbc } from "./detector";
import { renderAbc, hasRender } from "./renderer";
import "./styles.css";

const DEBUG = true;
function log(...args: unknown[]): void {
  if (DEBUG) console.log("[ChatMusic]", ...args);
}

/** Track processed elements and their last known ABC text */
const processedText = new WeakMap<Element, string>();

/** Extension enabled state */
let enabled = true;

/**
 * Process a single <pre> element: detect ABC and render if found.
 */
function processPreElement(pre: Element): void {
  const result = detectAbc(pre);
  if (!result) return;

  const lastText = processedText.get(pre);
  // Skip if already rendered with the same text
  if (lastText === result.abcText && hasRender(pre)) return;

  log("Detected ABC notation:", result.method, result.abcText.substring(0, 80) + "...");
  renderAbc(result.element, result.abcText);
  processedText.set(pre, result.abcText);
  updateBadge(1);
}

/**
 * Scan a DOM node (or the whole document) for ABC notation blocks.
 */
function fullScan(): void {
  if (!enabled) return;

  const preElements = document.querySelectorAll("pre");
  log("Full scan: found", preElements.length, "<pre> elements");

  let detected = 0;
  for (const pre of preElements) {
    const result = detectAbc(pre);
    if (result) {
      const lastText = processedText.get(pre);
      if (lastText !== result.abcText || !hasRender(pre)) {
        renderAbc(result.element, result.abcText);
        processedText.set(pre, result.abcText);
        detected++;
      }
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

/**
 * Set up the MutationObserver on document.body.
 */
function setupObserver(): void {
  const observer = new MutationObserver(() => {
    scheduleScan();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  log("MutationObserver attached to document.body");
}

/**
 * Listen for enable/disable messages from the popup.
 */
function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SET_ENABLED") {
      enabled = message.enabled;
      if (enabled) {
        fullScan();
      }
    }
  });
}

/**
 * Load enabled state from storage.
 */
async function loadState(): Promise<void> {
  try {
    const result = await chrome.storage.sync.get("enabled");
    enabled = result.enabled !== false; // Default to enabled
  } catch {
    enabled = true;
  }
}

/**
 * Initialize the content script.
 */
async function init(): Promise<void> {
  await loadState();

  if (!enabled) {
    log("Extension disabled, skipping init");
    return;
  }

  // Listen for messages (always, even before scan)
  setupMessageListener();

  // Initial scan of existing DOM
  log("Initial scan...");
  fullScan();

  // Set up observer for future changes
  setupObserver();

  log("Content script initialized on", window.location.href);
}

// Start
init();
