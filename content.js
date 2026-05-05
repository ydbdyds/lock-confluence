// Content script — runs at document_start in isolated world.
// Responsibilities:
//   1. Inject inject.js into page main world (so it can monkey-patch APIs).
//   2. Decide whether the current page is a Confluence edit page.
//   3. Push lock on/off state to the injected script via CustomEvent.
//   4. Listen to popup/background messages for manual override.

(() => {
  // Hostname gate — manifest matches <all_urls>, so we early-exit on any
  // domain that doesn't contain "confluence" to avoid touching unrelated sites.
  if (!/confluence/i.test(location.hostname)) return;

  const STORAGE_KEY_MANUAL = "manualOverride"; // "on" | "off" | "auto"

  // --- 1. Inject the main-world script ASAP. ---
  const injectScript = () => {
    try {
      const s = document.createElement("script");
      s.src = chrome.runtime.getURL("inject.js");
      s.async = false;
      (document.head || document.documentElement).appendChild(s);
      s.onload = () => s.remove();
    } catch (e) {
      console.warn("[ConfluenceEditLock] inject failed:", e);
    }
  };
  injectScript();

  // --- 2. Edit-mode detection. ---
  const URL_EDIT_PATTERNS = [
    /resumedraft\.action/i,
    /[?&]action=edit\b/i,
    /\/edit-v2\//i,
    /\/pages\/editpage\.action/i,
    /\/pages\/createpage\.action/i,
  ];

  const urlLooksLikeEdit = () => {
    const href = location.href;
    return URL_EDIT_PATTERNS.some((re) => re.test(href));
  };

  const editorDomPresent = () =>
    !!document.querySelector(
      "iframe#wysiwygTextarea_ifr, iframe.tox-edit-area__iframe, .ProseMirror, [contenteditable='true'], .aui-page-panel-content [contenteditable]"
    );

  // --- 3. Lock state machine. ---
  let manualOverride = "auto"; // populated from storage
  let lastSent = null;

  const sendLockState = (locked) => {
    if (locked === lastSent) return;
    lastSent = locked;
    window.dispatchEvent(
      new CustomEvent("confluence-edit-lock:set", { detail: { locked } })
    );
    chrome.runtime.sendMessage({ type: "lock-state", locked }).catch(() => {});
  };

  const computeLocked = () => {
    if (manualOverride === "on") return true;
    if (manualOverride === "off") return false;
    // auto: URL hint AND editor DOM both present.
    return urlLooksLikeEdit() && editorDomPresent();
  };

  const reevaluate = () => sendLockState(computeLocked());

  // Initial sync once inject.js signals ready.
  window.addEventListener("confluence-edit-lock:ready", () => {
    lastSent = null; // force resend
    reevaluate();
  });

  // Watch DOM for editor mount/unmount (Confluence is SPA-ish).
  const mo = new MutationObserver(() => reevaluate());
  const startObserving = () => {
    if (!document.body) return;
    mo.observe(document.body, { childList: true, subtree: true });
  };
  if (document.body) startObserving();
  else document.addEventListener("DOMContentLoaded", startObserving, { once: true });

  // Watch URL changes in SPAs.
  let lastHref = location.href;
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      reevaluate();
    }
  }, 500);

  // --- 4. Manual override via popup/background. ---
  chrome.storage.local.get([STORAGE_KEY_MANUAL]).then((res) => {
    manualOverride = res[STORAGE_KEY_MANUAL] || "auto";
    reevaluate();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[STORAGE_KEY_MANUAL]) {
      manualOverride = changes[STORAGE_KEY_MANUAL].newValue || "auto";
      reevaluate();
    }
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === "get-status") {
      sendResponse({
        locked: computeLocked(),
        manualOverride,
        urlLooksLikeEdit: urlLooksLikeEdit(),
        editorDomPresent: editorDomPresent(),
      });
    }
    return true;
  });
})();
