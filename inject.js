// Runs in page main world.
//
// Root cause (researched, confirmed by Atlassian's own fix in CONFSERVER-100547,
// fixed in Confluence 9.2.11 / 10.1.0):
//
//   The classic Confluence Server editor wraps its content in a TinyMCE iframe
//   (id="wysiwygTextarea_ifr"). The iframe's inner <body> has height:100% set,
//   which constrains layout to the iframe viewport. On certain interactions
//   (notably clicking the editor's margin / whitespace), Chromium reflows the
//   iframe body in a way that visually snaps content back to the top — without
//   ever changing scrollTop on the outer document. That's why every scroll-
//   based intercept failed: there is no scroll event, no scroll API call, and
//   document.scrollingElement.scrollTop stays 0 the whole time.
//
//   Atlassian's official workaround: set the iframe body's height to "auto".
//   That's the entire fix. We apply it persistently with multiple strategies
//   (the iframe is rebuilt on edit-mode entry, on tab focus, on rte-ready).
//
// This module no longer does any scroll-watching, scroll-API patching, or
// rAF position polling. Those approaches can never catch this bug because the
// bug isn't a scroll.
//
// Sources:
//   https://jira.atlassian.com/browse/CONFSERVER-100547
//   https://jira.atlassian.com/browse/CONFSERVER-100622
//   https://github.com/pfederi/Confluence-Fix

(() => {
  if (window.__confluenceEditLockInstalled) return;
  window.__confluenceEditLockInstalled = true;

  let DEBUG = false;
  const log = (...a) => { if (DEBUG) console.debug("[CEL]", ...a); };

  const state = {
    locked: false,
    appliedTo: new WeakSet(),
    lastAppliedAt: 0,
    applyCount: 0,
  };

  const IFRAME_SELECTOR = "iframe#wysiwygTextarea_ifr, iframe.tox-edit-area__iframe";

  // ---- the actual fix ---------------------------------------------------

  const fixIframeBody = (iframe) => {
    if (!iframe) return false;
    let doc;
    try {
      doc = iframe.contentDocument;
    } catch {
      return false; // cross-origin
    }
    if (!doc || !doc.body) return false;

    const body = doc.body;
    const html = doc.documentElement;

    // Idempotent: setting these to the same value is cheap and harmless.
    body.style.setProperty("height", "auto", "important");
    body.style.setProperty("min-height", "auto", "important");
    body.style.setProperty("overflow", "visible", "important");
    if (html) {
      html.style.setProperty("height", "auto", "important");
      html.style.setProperty("overflow", "visible", "important");
    }

    if (!state.appliedTo.has(body)) {
      state.appliedTo.add(body);
      log("applied iframe body fix", { iframe, body });
      // Also reapply on the iframe's own load (rebuild) and when its body
      // pointer changes (TinyMCE sometimes swaps it).
      iframe.addEventListener("load", () => fixIframeBody(iframe), { passive: true });
    }

    state.lastAppliedAt = Date.now();
    state.applyCount += 1;
    return true;
  };

  const sweep = (reason) => {
    if (!state.locked) return 0;
    let n = 0;
    for (const f of document.querySelectorAll(IFRAME_SELECTOR)) {
      if (fixIframeBody(f)) n += 1;
    }
    if (n > 0) log("sweep", reason, "→ fixed", n, "iframe(s)");
    return n;
  };

  // ---- triggers ---------------------------------------------------------
  // The iframe is created late and Confluence rebuilds it on edit-mode
  // toggle, so we apply the fix from many angles. Each is cheap and
  // idempotent.

  // 1. Immediate sweep when lock turns on.
  // 2. MutationObserver on document — catch iframe insertion and any DOM
  //    activity that could indicate an editor remount.
  let mo = null;
  const startObserver = () => {
    if (mo) return;
    mo = new MutationObserver(() => {
      if (state.locked) sweep("mutation");
    });
    const start = () => {
      if (!document.documentElement) return;
      mo.observe(document.documentElement, { childList: true, subtree: true });
    };
    if (document.documentElement) start();
    else document.addEventListener("DOMContentLoaded", start, { once: true });
  };
  const stopObserver = () => {
    if (mo) { mo.disconnect(); mo = null; }
  };

  // 3. Polling fallback — covers the case where contentDocument is replaced
  //    without an outer-document mutation. Cheap (querySelector on a single
  //    id'd iframe).
  let pollTimer = null;
  const startPolling = () => {
    if (pollTimer) return;
    pollTimer = setInterval(() => {
      if (state.locked) sweep("poll");
    }, 1000);
  };
  const stopPolling = () => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  };

  // 4. Window focus — Atlassian's own workaround reapplies on focus.
  const onFocus = () => { if (state.locked) sweep("focus"); };
  window.addEventListener("focus", onFocus);

  // 5. Hook Confluence's own ready event if AJS / require is available. This
  //    is the most reliable signal — fires when the editor is fully built.
  const tryHookConfluenceReady = () => {
    try {
      // AJS.bind / AJS.toInit is a global Confluence helper.
      const w = window;
      if (w.AJS && typeof w.AJS.bind === "function") {
        w.AJS.bind("rte-ready", () => sweep("rte-ready"));
        w.AJS.bind("init.rte", () => sweep("init.rte"));
      }
      if (typeof w.require === "function") {
        try {
          w.require(["confluence/api/event"], (Events) => {
            if (Events && typeof Events.bind === "function") {
              Events.bind("rte-ready", () => sweep("rte-ready (require)"));
            }
          });
        } catch { /* no-op */ }
      }
    } catch { /* no-op */ }
  };
  tryHookConfluenceReady();
  // Retry once after DOMContentLoaded — AJS may not be loaded at document_start.
  document.addEventListener("DOMContentLoaded", () => {
    tryHookConfluenceReady();
    if (state.locked) sweep("DOMContentLoaded");
  }, { once: true });

  // ---- lock state from content script -----------------------------------

  const setLocked = (locked) => {
    if (state.locked === locked) return;
    state.locked = locked;
    log("lock state →", locked);
    if (locked) {
      startObserver();
      startPolling();
      // Initial burst — the iframe might be created in the next few hundred
      // ms after edit-mode kicks in. Sweep aggressively for a short window.
      const burst = [0, 100, 300, 700, 1500, 3000];
      for (const t of burst) setTimeout(() => sweep(`burst@${t}`), t);
    } else {
      stopObserver();
      stopPolling();
    }
  };

  window.addEventListener("confluence-edit-lock:set", (e) => {
    const detail = e && e.detail;
    if (!detail) return;
    setLocked(!!detail.locked);
  });

  // Diagnostics surface. Lets the user inspect or force-apply.
  window.__confluenceEditLock = {
    get state() {
      return {
        locked: state.locked,
        applyCount: state.applyCount,
        lastAppliedAt: state.lastAppliedAt,
        iframesFound: document.querySelectorAll(IFRAME_SELECTOR).length,
      };
    },
    setDebug(v) { DEBUG = !!v; return DEBUG; },
    apply() { return sweep("manual"); },
  };

  // Signal readiness to content script.
  window.dispatchEvent(new CustomEvent("confluence-edit-lock:ready"));
})();
