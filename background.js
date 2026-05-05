// Service worker — only used to update the toolbar badge so the user
// can see at a glance whether the lock is currently active on the
// active tab.

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!sender.tab) return;
  if (msg && msg.type === "lock-state") {
    const tabId = sender.tab.id;
    const locked = !!msg.locked;
    chrome.action.setBadgeText({ tabId, text: locked ? "ON" : "" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: locked ? "#1f883d" : "#888" });
  }
});
