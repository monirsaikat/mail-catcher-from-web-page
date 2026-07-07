(() => {
  const HIGHLIGHT_CLASS = "ext-email-highlight";
  const HOST_ID = "ext-email-popup-host";
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT"]);
  const EMAIL_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

  const POPUP_STYLES = `
    .ext-popup {
      position: fixed;
      z-index: 2147483647;
      width: 260px;
      background: #ffffff;
      color: #1a1a1a;
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.06);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      overflow: hidden;
    }
    @media (prefers-color-scheme: dark) {
      .ext-popup { background: #26272b; color: #f2f2f2; box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08); }
    }
    .ext-popup[hidden] { display: none; }
    .ext-popup-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      font-weight: 600;
      border-bottom: 1px solid rgba(127,127,127,0.2);
    }
    .ext-close {
      background: none;
      border: none;
      font-size: 16px;
      cursor: pointer;
      color: inherit;
      opacity: 0.6;
      line-height: 1;
    }
    .ext-close:hover { opacity: 1; }
    .ext-popup-body { padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
    .ext-popup-body label { font-size: 11px; font-weight: 600; opacity: 0.7; }
    .ext-popup-body input, .ext-popup-body textarea {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid rgba(127,127,127,0.35);
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 12px;
      font-family: inherit;
      background: transparent;
      color: inherit;
      resize: vertical;
    }
    .ext-popup-body input[readonly] { opacity: 0.7; }
    .ext-popup-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      padding: 10px 12px;
      border-top: 1px solid rgba(127,127,127,0.2);
    }
    .ext-saved-flash { margin-right: auto; color: #16a34a; font-size: 12px; }
    .ext-btn {
      border: none;
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 12px;
      cursor: pointer;
      font-weight: 500;
    }
    .ext-btn-secondary { background: rgba(127,127,127,0.15); color: inherit; }
    .ext-btn-primary { background: #2563eb; color: white; }
    .ext-btn-primary:hover { background: #1d4ed8; }
  `;

  let host = null;
  let shadow = null;
  let popupEl = null;
  let emailInput = null;
  let titleInput = null;
  let noteInput = null;
  let savedFlash = null;

  function ensurePopup() {
    if (host) return;

    host = document.createElement("div");
    host.id = HOST_ID;
    host.style.all = "initial";
    document.documentElement.appendChild(host);

    shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>${POPUP_STYLES}</style>
      <div class="ext-popup" id="ext-popup" hidden>
        <div class="ext-popup-header">
          <span>Save Email</span>
          <button class="ext-close" id="ext-close" type="button" aria-label="Close">&times;</button>
        </div>
        <div class="ext-popup-body">
          <div>
            <label for="ext-email">Email</label>
            <input type="text" id="ext-email" readonly />
          </div>
          <div>
            <label for="ext-title">Title <span style="font-weight:400;">(optional)</span></label>
            <input type="text" id="ext-title" placeholder="e.g. Sales lead" />
          </div>
          <div>
            <label for="ext-note">Note <span style="font-weight:400;">(optional)</span></label>
            <textarea id="ext-note" rows="3" placeholder="Add a note..."></textarea>
          </div>
        </div>
        <div class="ext-popup-footer">
          <span class="ext-saved-flash" id="ext-saved-flash" hidden>Saved</span>
          <button class="ext-btn ext-btn-secondary" id="ext-cancel" type="button">Cancel</button>
          <button class="ext-btn ext-btn-primary" id="ext-save" type="button">Save</button>
        </div>
      </div>
    `;

    popupEl = shadow.getElementById("ext-popup");
    emailInput = shadow.getElementById("ext-email");
    titleInput = shadow.getElementById("ext-title");
    noteInput = shadow.getElementById("ext-note");
    savedFlash = shadow.getElementById("ext-saved-flash");

    shadow.getElementById("ext-close").addEventListener("click", hidePopup);
    shadow.getElementById("ext-cancel").addEventListener("click", hidePopup);
    shadow.getElementById("ext-save").addEventListener("click", saveEntry);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !popupEl.hidden) hidePopup();
    });
  }

  function isPopupOpen() {
    return popupEl && !popupEl.hidden;
  }

  function showPopupFor(span) {
    ensurePopup();
    const email = span.dataset.email;

    popupEl.dataset.currentEmail = email;
    emailInput.value = email;
    titleInput.value = "";
    noteInput.value = "";
    savedFlash.hidden = true;
    popupEl.hidden = false;

    const rect = span.getBoundingClientRect();
    const popupWidth = 260;
    let left = rect.left;
    let top = rect.bottom + 6;

    if (left + popupWidth > window.innerWidth - 10) {
      left = window.innerWidth - popupWidth - 10;
    }
    if (left < 10) left = 10;

    const estimatedHeight = 260;
    if (top + estimatedHeight > window.innerHeight - 10) {
      top = rect.top - estimatedHeight - 6;
      if (top < 10) top = 10;
    }

    popupEl.style.left = `${left}px`;
    popupEl.style.top = `${top}px`;

    titleInput.focus();
  }

  function hidePopup() {
    if (popupEl) popupEl.hidden = true;
  }

  function togglePopup(span) {
    ensurePopup();
    const email = span.dataset.email;
    if (isPopupOpen() && popupEl.dataset.currentEmail === email) {
      hidePopup();
      return;
    }
    showPopupFor(span);
  }

  function saveEntry() {
    const entry = {
      id: crypto.randomUUID(),
      email: emailInput.value,
      title: titleInput.value.trim(),
      note: noteInput.value.trim(),
      createdAt: Date.now(),
    };

    chrome.storage.local.get({ entries: [] }, ({ entries }) => {
      entries.push(entry);
      chrome.storage.local.set({ entries }, () => {
        savedFlash.hidden = false;
        setTimeout(hidePopup, 500);
      });
    });
  }

  document.addEventListener(
    "click",
    (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;

      const emailSpan = target.closest(`.${HIGHLIGHT_CLASS}`);
      if (emailSpan) {
        e.preventDefault();
        e.stopPropagation();
        togglePopup(emailSpan);
        return;
      }

      if (isPopupOpen() && host && !e.composedPath().includes(host)) {
        hidePopup();
      }
    },
    true
  );

  function processTextNode(textNode) {
    const parent = textNode.parentElement;
    if (!parent) return;
    if (SKIP_TAGS.has(parent.tagName)) return;
    if (parent.classList.contains(HIGHLIGHT_CLASS)) return;
    if (parent.isContentEditable) return;

    const text = textNode.nodeValue;
    if (!text || text.indexOf("@") === -1) return;

    EMAIL_REGEX.lastIndex = 0;
    let match;
    let lastIndex = 0;
    let found = false;
    const frag = document.createDocumentFragment();

    while ((match = EMAIL_REGEX.exec(text)) !== null) {
      const email = match[0];
      const start = match.index;
      if (start > lastIndex) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex, start)));
      }
      const span = document.createElement("span");
      span.className = HIGHLIGHT_CLASS;
      span.dataset.email = email;
      span.textContent = email;
      frag.appendChild(span);
      lastIndex = start + email.length;
      found = true;
    }

    if (!found) return;

    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    textNode.replaceWith(frag);
  }

  function scanNode(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (parent.classList.contains(HIGHLIGHT_CLASS)) return NodeFilter.FILTER_REJECT;
        if (parent.isContentEditable) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(processTextNode);
  }

  try {
    scanNode(document.body);
  } catch (err) {
    console.error("Email Grabber: initial scan failed", err);
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        try {
          if (node.nodeType === Node.TEXT_NODE) {
            processTextNode(node);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.id === HOST_ID) return;
            if (node.classList && node.classList.contains(HIGHLIGHT_CLASS)) return;
            scanNode(node);
          }
        } catch (err) {
          console.error("Email Grabber: scan failed", err);
        }
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
