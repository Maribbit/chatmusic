/**
 * ChatMusic Background Service Worker.
 * Handles badge updates and extension lifecycle.
 */

interface OpenStudioMessage {
  type: "OPEN_STUDIO";
  abcText: string;
}

function isOpenStudioMessage(message: unknown): message is OpenStudioMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "OPEN_STUDIO" &&
    "abcText" in message &&
    typeof message.abcText === "string"
  );
}

// Update badge text when content script reports ABC detections
chrome.runtime.onMessage.addListener((message, sender) => {
  if (isOpenStudioMessage(message)) {
    const studioUrl = new URL(chrome.runtime.getURL("src/studio/index.html"));
    studioUrl.hash = `abc=${encodeURIComponent(message.abcText)}`;
    void chrome.tabs.create({ url: studioUrl.toString() });
    return;
  }

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
