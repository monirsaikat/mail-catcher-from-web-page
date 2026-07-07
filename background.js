function updateBadge(entries) {
  const count = entries.length;
  chrome.action.setBadgeText({ text: count ? String(count) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#2563eb" });
}

function refreshBadge() {
  chrome.storage.local.get({ entries: [] }, ({ entries }) => updateBadge(entries));
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.entries) return;
  updateBadge(changes.entries.newValue || []);
});

chrome.runtime.onInstalled.addListener(refreshBadge);
chrome.runtime.onStartup.addListener(refreshBadge);
