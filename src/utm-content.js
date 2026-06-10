// utm-content.js
// ----------------------------------------------------------------------------
// Address-bar UTM/tracking-param stripper. Runs on *every* http(s) page,
// gated by BOTH the master `enabled` toggle AND the `enabledUtmStrip`
// toggle. Default OFF — this is a permission expansion compared to the
// per-site model, so users have to opt in explicitly via the popup, and
// turning the master off (the toolbar "OFF" badge state) stops the
// universal strip too.
//
// What it does:
//   1. On document_start, read both flags + the skip/keep lists from
//      chrome.storage.sync. If both flags are on, run a cleanup pass on
//      location.href (with the keep-list applied, and skipping the page
//      entirely if the host matches the user's skip-list).
//   2. Listen for popstate to catch back/forward navigations.
//   3. Poll on a visibility-aware setInterval to catch SPA navigations
//      (pushState, the same dance social-content.js does).
//   4. Listen for storage changes so toggling on/off, editing the skip
//      list, or editing the keep list takes effect immediately on
//      already-open tabs.
//
// Coexistence with per-site cleanup:
//   On a supported site (Amazon, YouTube, etc.), both this script and the
//   per-site script run. They don't conflict — per-site uses allowlists
//   ("keep ?v, ?t"), this one uses a denylist ("strip utm_*, gclid, ...").
//   Each calls history.replaceState idempotently. Whichever runs second
//   sees the already-cleaned URL and is a no-op.
//
// Why no in-page anchor rewriting:
//   Same reason as social-content.js: anchor hrefs often carry session-
//   specific state the host site uses for attribution / impressions /
//   security tokens. Modifying them in place doesn't help and risks
//   breaking the site's own behavior.
// ----------------------------------------------------------------------------

(function () {
  'use strict';

  const M = self.UtmStripper;
  if (!M) return;

  // Both flags must be true for the stripper to actually run. Starts
  // pessimistic so we never strip before storage has loaded.
  let masterEnabled = false;
  let utmEnabled = false;
  let skipDomains = [];   // string[] — leading dot = subdomain match
  let keepParams = [];    // string[] — case-insensitive
  let lastHref = null;
  let pollTimer = null;

  function isOn() {
    return masterEnabled && utmEnabled;
  }

  // Returns true if the current hostname matches any entry in the user's
  // skip list. Entry rules:
  //   ".example.com"  -> matches example.com and *.example.com
  //   "example.com"   -> matches example.com only (exact)
  //   "localhost"     -> matches "localhost" only
  function hostIsSkipped(hostname) {
    if (!hostname || !skipDomains.length) return false;
    const lower = hostname.toLowerCase();
    for (const raw of skipDomains) {
      const entry = String(raw).trim().toLowerCase();
      if (!entry) continue;
      if (entry.startsWith('.')) {
        const bare = entry.slice(1);
        if (lower === bare || lower.endsWith('.' + bare)) return true;
      } else {
        if (lower === entry) return true;
      }
    }
    return false;
  }

  function cleanCurrentUrl() {
    if (!isOn()) return false;
    try {
      if (hostIsSkipped(location.hostname)) return false;
      const opts = keepParams.length ? { keepParams } : undefined;
      if (!M.needsStripping(location.href, opts)) return false;
      const cleaned = M.stripTrackingParams(location.href, opts);
      if (!cleaned || cleaned === location.href) return false;
      history.replaceState(history.state, '', cleaned);
      lastHref = cleaned;
      return true;
    } catch (e) {
      console.debug('[Link Shortener UTM] could not rewrite URL:', e);
      return false;
    }
  }

  function startPolling() {
    if (pollTimer) return;
    // 750ms is fast enough that share clicks land on a clean URL while
    // still being far below any noticeable CPU cost. Skip when the tab is
    // hidden — no URL can have changed without user interaction; the
    // visibilitychange handler below catches up when the tab returns.
    pollTimer = setInterval(() => {
      if (!isOn()) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      if (location.href !== lastHref) {
        cleanCurrentUrl();
        lastHref = location.href;
      }
    }, 750);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function doFullPass() {
    cleanCurrentUrl();
    lastHref = location.href;
    if (isOn()) startPolling();
    else stopPolling();
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(
      {
        enabled: true,
        enabledUtmStrip: false,
        utmStripSkipDomains: [],
        utmStripKeepParams: [],
      },
      (items) => {
        masterEnabled = items.enabled !== false;
        utmEnabled = items.enabledUtmStrip === true;
        skipDomains = Array.isArray(items.utmStripSkipDomains) ? items.utmStripSkipDomains : [];
        keepParams = Array.isArray(items.utmStripKeepParams) ? items.utmStripKeepParams : [];
        doFullPass();
      },
    );

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      let touched = false;
      if (Object.prototype.hasOwnProperty.call(changes, 'enabled')) {
        masterEnabled = changes.enabled.newValue !== false;
        touched = true;
      }
      if (Object.prototype.hasOwnProperty.call(changes, 'enabledUtmStrip')) {
        utmEnabled = changes.enabledUtmStrip.newValue === true;
        touched = true;
      }
      if (Object.prototype.hasOwnProperty.call(changes, 'utmStripSkipDomains')) {
        const v = changes.utmStripSkipDomains.newValue;
        skipDomains = Array.isArray(v) ? v : [];
        touched = true;
      }
      if (Object.prototype.hasOwnProperty.call(changes, 'utmStripKeepParams')) {
        const v = changes.utmStripKeepParams.newValue;
        keepParams = Array.isArray(v) ? v : [];
        touched = true;
      }
      if (touched) doFullPass();
    });
  }

  window.addEventListener('popstate', () => {
    if (isOn()) cleanCurrentUrl();
  });

  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      if (!isOn()) return;
      if (location.href !== lastHref) {
        cleanCurrentUrl();
        lastHref = location.href;
      }
    });
  }
})();
