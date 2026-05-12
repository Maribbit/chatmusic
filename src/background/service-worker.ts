/**
 * ChatMusic Background Service Worker.
 * Handles badge updates and extension lifecycle.
 */

// Update badge text when content script reports ABC detections
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "UPDATE_BADGE" && sender.tab?.id) {
    const count = message.count;
    chrome.action.setBadgeText({
      text: count > 0 ? String(count) : "",
      tabId: sender.tab.id,
    });
    chrome.action.setBadgeBackgroundColor({
      color: "#4CAF50",
      tabId: sender.tab.id,
    });
  }
});

// Clear badge when navigating to a new page
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    chrome.action.setBadgeText({ text: "", tabId });
  }
});
