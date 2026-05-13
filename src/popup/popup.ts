/**
 * ChatMusic Popup Script.
 * Manages the enable/disable toggle and displays status.
 */
import {
  DEFAULT_THEME_MODE,
  THEME_MODE_STORAGE_KEY,
  normalizeThemeMode,
  type ThemeMode,
} from "../shared/settings";

const toggle = document.getElementById("enableToggle") as HTMLInputElement;
const themeModeSelect = document.getElementById(
  "themeModeSelect"
) as HTMLSelectElement;
const statusEl = document.getElementById("status") as HTMLElement;

// Load current state
chrome.storage.sync.get(["enabled", THEME_MODE_STORAGE_KEY], (result) => {
  const isEnabled = result.enabled !== false;
  const themeMode = normalizeThemeMode(result[THEME_MODE_STORAGE_KEY]);

  toggle.checked = isEnabled;
  themeModeSelect.value = themeMode;
  updateStatusText(isEnabled, themeMode);
});

// Handle toggle change
toggle.addEventListener("change", async () => {
  const isEnabled = toggle.checked;
  const themeMode = getSelectedThemeMode();

  // Save state
  await chrome.storage.sync.set({ enabled: isEnabled });

  // Notify content script
  await sendMessageToActiveTab({
    type: "SET_ENABLED",
    enabled: isEnabled,
  });

  updateStatusText(isEnabled, themeMode);
});

themeModeSelect.addEventListener("change", async () => {
  const themeMode = getSelectedThemeMode();

  await chrome.storage.sync.set({ [THEME_MODE_STORAGE_KEY]: themeMode });
  await sendMessageToActiveTab({
    type: "SET_THEME_MODE",
    themeMode,
  });

  updateStatusText(toggle.checked, themeMode);
});

function getSelectedThemeMode(): ThemeMode {
  return normalizeThemeMode(themeModeSelect.value || DEFAULT_THEME_MODE);
}

async function sendMessageToActiveTab(message: object): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  await chrome.tabs.sendMessage(tab.id, message).catch(() => {
    // Tab may not have content script loaded
  });
}

function updateStatusText(isEnabled: boolean, themeMode: ThemeMode): void {
  if (!isEnabled) {
    statusEl.textContent = "Detection disabled.";
    return;
  }

  statusEl.textContent =
    themeMode === "auto"
      ? "Detecting ABC notation with automatic theme matching..."
      : `Detecting ABC notation with ${themeMode} theme.`;
}
