/**
 * ChatMusic Popup Script.
 * Manages the enable/disable toggle and displays status.
 */

const toggle = document.getElementById("enableToggle") as HTMLInputElement;
const statusEl = document.getElementById("status") as HTMLElement;

// Load current state
chrome.storage.sync.get("enabled", (result) => {
  const isEnabled = result.enabled !== false;
  toggle.checked = isEnabled;
  updateStatusText(isEnabled);
});

// Handle toggle change
toggle.addEventListener("change", async () => {
  const isEnabled = toggle.checked;

  // Save state
  await chrome.storage.sync.set({ enabled: isEnabled });

  // Notify content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      type: "SET_ENABLED",
      enabled: isEnabled,
    }).catch(() => {
      // Tab may not have content script loaded
    });
  }

  updateStatusText(isEnabled);
});

function updateStatusText(isEnabled: boolean): void {
  statusEl.textContent = isEnabled
    ? "Detecting ABC notation on this page..."
    : "Detection disabled.";
}
