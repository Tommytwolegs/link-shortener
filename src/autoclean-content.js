// autoclean-content.js
// ----------------------------------------------------------------------------
// Per-site automatic link cleaning (v1.13). This file is NOT in the
// manifest: the background registers it dynamically (scripting.
// registerContentScripts, id 'ls-autoclean') for exactly the origins the
// user has opted in via the popup's "Auto-clean links on this site" — each
// of which carries its own narrow *://host/* permission grant. It never
// runs anywhere else.
//
// What it does: the same batch pass as the popup's one-shot "Clean links
// on this page" button — collect anchor hrefs, send them to the background
// ('clean-links-batch', the bulk pipeline: unwrap -> per-site rules ->
// universal strip), write the cleaned hrefs back — plus a debounced
// MutationObserver so links added later (infinite scroll, SPA renders,
// webmail) get the same treatment.
//
// Loop safety is by IDEMPOTENCE, not bookkeeping: clean(clean(x)) ===
// clean(x), and hrefs are only written when they actually change. A pass
// over an already-clean page performs zero writes, so our own mutations
// can never re-trigger a busy loop; a site that actively resets its hrefs
// converges to one debounced pass per site-initiated change.
//
// Gates: master switch, the per-tab pause, and live membership in
// autoCleanDomains (belt and braces on top of the registration itself, so
// turning a site off stops cleaning instantly without waiting for
// re-registration).
// ----------------------------------------------------------------------------

(function () {
  'use strict';

  // Dynamic re-registration can double-inject on long-lived tabs.
  if (window.__lsAutoCleanBooted) return;
  window.__lsAutoCleanBooted = true;

  const HOST = location.hostname.toLowerCase();
  const DEBOUNCE_MS = 800;
  const MAX_BATCH = 2000;

  let masterEnabled = true;
  let hostListed = true;
  let tabPaused = false;
  let timer = null;
  let passRunning = false;
  let passQueued = false;
  let observer = null;

  function isOn() {
    return masterEnabled && hostListed && !tabPaused;
  }

  function runPass() {
    if (!isOn()) return;
    if (passRunning) {
      passQueued = true;
      return;
    }
    passRunning = true;
    let anchors;
    let urls;
    try {
      anchors = Array.from(document.links || []);
      const seen = new Set();
      urls = [];
      for (const a of anchors) {
        const h = a.href;
        if (!/^https?:/i.test(h) || seen.has(h)) continue;
        seen.add(h);
        urls.push(h);
        if (urls.length >= MAX_BATCH) break;
      }
    } catch (_e) {
      passRunning = false;
      return;
    }
    if (urls.length === 0) {
      passRunning = false;
      return;
    }
    try {
      chrome.runtime.sendMessage({ type: 'clean-links-batch', urls }, (resp) => {
        void chrome.runtime.lastError;
        try {
          const map = resp && resp.map ? resp.map : {};
          if (isOn()) {
            for (const a of anchors) {
              const clean = map[a.href];
              // Write ONLY on change — this is the idempotence guard that
              // keeps the observer loop-free.
              if (clean && clean !== a.href) a.href = clean;
            }
          }
        } catch (_e) { /* page went away mid-pass */ }
        passRunning = false;
        if (passQueued) {
          passQueued = false;
          schedulePass();
        }
      });
    } catch (_e) {
      // Extension context gone (update/reload); stop quietly.
      passRunning = false;
      stopObserver();
    }
  }

  function schedulePass() {
    if (!isOn()) return;
    clearTimeout(timer);
    timer = setTimeout(runPass, DEBOUNCE_MS);
  }

  function startObserver() {
    if (observer || typeof MutationObserver !== 'function') return;
    observer = new MutationObserver(() => schedulePass());
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href'],
    });
  }

  function stopObserver() {
    clearTimeout(timer);
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function reconcile() {
    if (isOn()) {
      startObserver();
      schedulePass();
    } else {
      stopObserver();
    }
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get({ enabled: true, autoCleanDomains: [] }, (items) => {
      void chrome.runtime.lastError;
      masterEnabled = items.enabled !== false;
      hostListed = Array.isArray(items.autoCleanDomains)
        && items.autoCleanDomains.some((d) => typeof d === 'string' && d.toLowerCase() === HOST);
      reconcile();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      let touched = false;
      if (Object.prototype.hasOwnProperty.call(changes, 'enabled')) {
        masterEnabled = changes.enabled.newValue !== false;
        touched = true;
      }
      if (Object.prototype.hasOwnProperty.call(changes, 'autoCleanDomains')) {
        const list = changes.autoCleanDomains.newValue;
        hostListed = Array.isArray(list)
          && list.some((d) => typeof d === 'string' && d.toLowerCase() === HOST);
        touched = true;
      }
      if (touched) reconcile();
    });

    // Per-tab pause: asked once per page load, same as the other content
    // scripts.
    try {
      chrome.runtime.sendMessage({ type: 'pause-info' }, (resp) => {
        void chrome.runtime.lastError;
        if (resp && resp.paused === true) {
          tabPaused = true;
          reconcile();
        }
      });
    } catch (_e) { /* leave unpaused */ }
  }
})();
