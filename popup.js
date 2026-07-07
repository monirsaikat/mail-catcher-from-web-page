const listEl = document.getElementById("entry-list");
const emptyEl = document.getElementById("empty-state");
const countEl = document.getElementById("entry-count");
const headerCountEl = document.getElementById("header-count");
const syncBtn = document.getElementById("sync-btn");
const syncBtnLabel = syncBtn.querySelector(".btn-label");
const settingsBtn = document.getElementById("settings-btn");
const statusEl = document.getElementById("toast");
const template = document.getElementById("entry-template");

let entries = [];
let statusTimer = null;

function load() {
  chrome.storage.local.get({ entries: [] }, (data) => {
    entries = data.entries.slice().sort((a, b) => b.createdAt - a.createdAt);
    render();
  });
}

function avatarInitial(email) {
  return (email || "?").trim().charAt(0) || "?";
}

function render() {
  listEl.innerHTML = "";
  emptyEl.hidden = entries.length !== 0;
  countEl.textContent = `${entries.length} saved`;
  headerCountEl.textContent = entries.length === 1 ? "1 collected" : `${entries.length} collected`;
  syncBtn.disabled = entries.length === 0;

  for (const entry of entries) {
    const node = template.content.cloneNode(true);
    const li = node.querySelector(".entry");
    li.dataset.id = entry.id;
    node.querySelector(".entry-avatar").textContent = avatarInitial(entry.email);
    node.querySelector(".entry-title").textContent = entry.title || "(untitled)";
    node.querySelector(".entry-email").textContent = entry.email;

    const noteEl = node.querySelector(".entry-note");
    if (entry.note) {
      noteEl.textContent = entry.note;
    } else {
      noteEl.remove();
    }

    node.querySelector(".entry-delete").addEventListener("click", () => deleteEntry(entry.id));
    listEl.appendChild(node);
  }
}

function deleteEntry(id) {
  entries = entries.filter((e) => e.id !== id);
  chrome.storage.local.set({ entries });
}

function showStatus(message, type) {
  if (statusTimer) clearTimeout(statusTimer);
  statusEl.textContent = message;
  statusEl.className = `toast toast-${type}`;
  statusEl.hidden = false;
  requestAnimationFrame(() => statusEl.classList.add("show"));
  statusTimer = setTimeout(() => {
    statusEl.classList.remove("show");
    setTimeout(() => {
      statusEl.hidden = true;
    }, 180);
  }, 4000);
}

async function sync() {
  const { settings } = await chrome.storage.sync.get({ settings: null });
  if (!settings || !settings.endpoint) {
    showStatus("Set a sync endpoint in Settings first.", "error");
    chrome.runtime.openOptionsPage();
    return;
  }

  const snapshot = entries.slice();
  if (snapshot.length === 0) return;

  syncBtn.disabled = true;
  syncBtn.classList.add("is-loading");
  syncBtnLabel.textContent = "Syncing...";

  try {
    const headers = { "Content-Type": "application/json" };
    if (settings.authHeader) headers["Authorization"] = settings.authHeader;

    const response = await fetch(settings.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ entries: snapshot }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const syncedIds = new Set(snapshot.map((e) => e.id));
    const { entries: current = [] } = await chrome.storage.local.get({ entries: [] });
    const remaining = current.filter((e) => !syncedIds.has(e.id));
    await chrome.storage.local.set({ entries: remaining });

    showStatus(`Synced ${snapshot.length} item(s) successfully.`, "success");
  } catch (err) {
    showStatus(`Sync failed: ${err.message}`, "error");
  } finally {
    syncBtn.classList.remove("is-loading");
    syncBtnLabel.textContent = "Sync All";
    syncBtn.disabled = entries.length === 0;
  }
}

syncBtn.addEventListener("click", sync);
settingsBtn.addEventListener("click", () => chrome.runtime.openOptionsPage());

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.entries) load();
});

load();
