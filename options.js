const endpointInput = document.getElementById("endpoint");
const authInput = document.getElementById("auth-header");
const saveBtn = document.getElementById("save-btn");
const statusEl = document.getElementById("save-status");

chrome.storage.sync.get({ settings: null }, ({ settings }) => {
  if (settings) {
    endpointInput.value = settings.endpoint || "";
    authInput.value = settings.authHeader || "";
  }
});

saveBtn.addEventListener("click", () => {
  const settings = {
    endpoint: endpointInput.value.trim(),
    authHeader: authInput.value.trim(),
  };
  chrome.storage.sync.set({ settings }, () => {
    statusEl.hidden = false;
    setTimeout(() => {
      statusEl.hidden = true;
    }, 2000);
  });
});
