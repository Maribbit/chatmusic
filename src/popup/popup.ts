/**
 * ChatMusic Popup Script.
 * Manages the enable/disable toggle and displays status.
 */
import {
  CODE_BLOCK_VISIBILITY_STORAGE_KEY,
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

const toggle = document.getElementById("enableToggle") as HTMLInputElement;
const themeModeForm = document.getElementById(
  "themeModeForm",
) as HTMLFormElement;
const codeBlockVisibilityToggle = document.getElementById(
  "codeBlockVisibilityToggle",
) as HTMLInputElement;
const keyboardVisibilityToggle = document.getElementById(
  "keyboardVisibilityToggle",
) as HTMLInputElement;
const openStudioButton = document.getElementById(
  "openStudioButton",
) as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLElement;
const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

// Load current state
chrome.storage.sync.get(
  [
    "enabled",
    THEME_MODE_STORAGE_KEY,
    CODE_BLOCK_VISIBILITY_STORAGE_KEY,
    KEYBOARD_VISIBILITY_STORAGE_KEY,
  ],
  (result) => {
    const isEnabled = result.enabled !== false;
    const themeMode = normalizeThemeMode(result[THEME_MODE_STORAGE_KEY]);
    const codeBlockVisibility = normalizeCodeBlockVisibility(
      result[CODE_BLOCK_VISIBILITY_STORAGE_KEY],
    );
    const keyboardVisibility = normalizeKeyboardVisibility(
      result[KEYBOARD_VISIBILITY_STORAGE_KEY],
    );

    toggle.checked = isEnabled;
    setSelectedThemeMode(themeMode);
    codeBlockVisibilityToggle.checked = codeBlockVisibility === "expanded";
    keyboardVisibilityToggle.checked = keyboardVisibility === "visible";
    applyPopupTheme(themeMode);
    updateStatusText(
      isEnabled,
      themeMode,
      codeBlockVisibility,
      keyboardVisibility,
    );
  },
);

// Handle toggle change
toggle.addEventListener("change", async () => {
  const isEnabled = toggle.checked;
  const themeMode = getSelectedThemeMode();
  const codeBlockVisibility = getSelectedCodeBlockVisibility();
  const keyboardVisibility = getSelectedKeyboardVisibility();

  // Save state
  await chrome.storage.sync.set({ enabled: isEnabled });

  // Notify content script
  await sendMessageToActiveTab({
    type: "SET_ENABLED",
    enabled: isEnabled,
  });

  updateStatusText(
    isEnabled,
    themeMode,
    codeBlockVisibility,
    keyboardVisibility,
  );
});

themeModeForm.addEventListener("change", async () => {
  const themeMode = getSelectedThemeMode();

  applyPopupTheme(themeMode);
  await chrome.storage.sync.set({ [THEME_MODE_STORAGE_KEY]: themeMode });
  await sendMessageToActiveTab({
    type: "SET_THEME_MODE",
    themeMode,
  });

  updateStatusText(
    toggle.checked,
    themeMode,
    getSelectedCodeBlockVisibility(),
    getSelectedKeyboardVisibility(),
  );
});

colorSchemeQuery.addEventListener("change", () => {
  if (getSelectedThemeMode() === "auto") {
    applyPopupTheme("auto");
  }
});

codeBlockVisibilityToggle.addEventListener("change", async () => {
  const codeBlockVisibility = getSelectedCodeBlockVisibility();

  await chrome.storage.sync.set({
    [CODE_BLOCK_VISIBILITY_STORAGE_KEY]: codeBlockVisibility,
  });
  await sendMessageToActiveTab({
    type: "SET_CODE_BLOCK_VISIBILITY",
    codeBlockVisibility,
  });

  updateStatusText(
    toggle.checked,
    getSelectedThemeMode(),
    codeBlockVisibility,
    getSelectedKeyboardVisibility(),
  );
});

keyboardVisibilityToggle.addEventListener("change", async () => {
  const keyboardVisibility = getSelectedKeyboardVisibility();

  await chrome.storage.sync.set({
    [KEYBOARD_VISIBILITY_STORAGE_KEY]: keyboardVisibility,
  });
  await sendMessageToActiveTab({
    type: "SET_KEYBOARD_VISIBILITY",
    keyboardVisibility,
  });

  updateStatusText(
    toggle.checked,
    getSelectedThemeMode(),
    getSelectedCodeBlockVisibility(),
    keyboardVisibility,
  );
});

openStudioButton.addEventListener("click", async () => {
  await chrome.tabs.create({
    url: chrome.runtime.getURL("src/studio/index.html"),
  });
});

function getSelectedThemeMode(): ThemeMode {
  const themeModeControl = themeModeForm.elements.namedItem(
    "themeMode",
  ) as RadioNodeList | null;

  return normalizeThemeMode(themeModeControl?.value || DEFAULT_THEME_MODE);
}

function setSelectedThemeMode(themeMode: ThemeMode): void {
  const input = themeModeForm.querySelector<HTMLInputElement>(
    `input[name="themeMode"][value="${themeMode}"]`,
  );
  if (input) input.checked = true;
}

function applyPopupTheme(themeMode: ThemeMode): void {
  const resolvedTheme =
    themeMode === "auto"
      ? colorSchemeQuery.matches
        ? "dark"
        : "light"
      : themeMode;

  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themeMode = themeMode;
}

function getSelectedCodeBlockVisibility(): CodeBlockVisibility {
  return codeBlockVisibilityToggle.checked ? "expanded" : "collapsed";
}

function getSelectedKeyboardVisibility(): KeyboardVisibility {
  return keyboardVisibilityToggle.checked ? "visible" : "hidden";
}

async function sendMessageToActiveTab(message: object): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  if (await trySendMessage(tab.id, message)) return;

  await injectContentScript(tab.id);
  await trySendMessage(tab.id, message);
}

async function trySendMessage(
  tabId: number,
  message: object,
): Promise<boolean> {
  try {
    await chrome.tabs.sendMessage(tabId, message);
    return true;
  } catch {
    return false;
  }
}

async function injectContentScript(tabId: number): Promise<void> {
  const contentScriptPath =
    chrome.runtime.getManifest().content_scripts?.[0]?.js?.[0];
  if (!contentScriptPath) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [contentScriptPath],
    });
  } catch {
    // Some browser pages do not allow extension scripts.
  }
}

function updateStatusText(
  isEnabled: boolean,
  themeMode: ThemeMode,
  codeBlockVisibility: CodeBlockVisibility,
  keyboardVisibility: KeyboardVisibility,
): void {
  if (!isEnabled) {
    statusEl.textContent = "Detection disabled.";
    return;
  }

  const themeText =
    themeMode === "auto" ? "automatic theme" : `${themeMode} theme`;
  const codeText =
    codeBlockVisibility === "collapsed" ? "collapsed source" : "visible source";
  const keyboardText =
    keyboardVisibility === "hidden" ? "hidden keyboard" : "visible keyboard";

  statusEl.textContent = `Detecting ABC notation with ${themeText}, ${codeText}, and ${keyboardText}.`;
}
