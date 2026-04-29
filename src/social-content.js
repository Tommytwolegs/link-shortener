// social-content.js
// ----------------------------------------------------------------------------
// Address-bar URL cleanup dispatcher. Loaded alongside whichever URL module
// the manifest matched on this tab — the dispatcher picks up whichever
// `*LinkShortener` namespace is present and uses its `STORAGE_KEY` to gate
// on the right per-site toggle.
//
// Currently dispatches for: Facebook, Instagram, YouTube, Twitter/X, TikTok,
// Reddit, Spotify. (Amazon and the four hotel sites have their own scripts.)
//
// Why no in-page anchor rewriting (unlike Amazon's content.js): on social/
// media feeds, link hrefs carry session-specific tracking that the host site
// uses to attribute reactions and impressions to your account. Rewriting
// those in place doesn't help anyone — the target server resolves the long
// form to the same page either way.
//
// Respects two flags in chrome.storage.sync:
//   • `enabled`              — master toggle (default true)
//   • the module's STORAGE_KEY — combined or per-site toggle (default true)
//
// SPA navigations: most of these sites use history.pushState heavily. We
// rely on (a) popstate, (b) the background service worker pinging
// CHECK_URL on webNavigation.onHistoryStateUpdated, and (c) a periodic
// poll, since pushState itself doesn't fire any standard event.
// ----------------------------------------------------------------------------

(function () {
  'use strict';

  // Whichever module loaded for this host wins. Only one is in scope at a
  // time because each manifest content_scripts entry only loads its own
  // URL module.
  const M =
    self.FacebookLinkShortener ||
    self.InstagramLinkShortener ||
    self.YoutubeLinkShortener ||
    self.TwitterLinkShortener ||
    self.TiktokLinkShortener ||
    self.RedditLinkShortener ||
    self.SpotifyLinkShortener ||
    null;

  // Per-site storage key, taken from the active module. Falls back to
  // `enabledSocial` to preserve the historical key in case someone misuses
  // an older module without STORAGE_KEY set.
  const STORAGE_KEY = (M && M.STORAGE_KEY) || 'enabledSocial';

  // Pessimistic defaults so we never rewrite before storage loads.
  let masterEnabled = false;
  let siteEnabled = false;
  let lastHref = null;
  let pollTimer = null;

  function isOn() { return masterEnabled && siteEnabled && !!M; }

  function cleanCurrentUrl() {
    if (!isOn()) return false;
    try {
      if (!M.needsShortening(location.href)) return false;
      const short = M.shortenUrl(location.href);
      if (!short || short === location.href) return false;
      history.replaceState(history.state, '', short);
      lastHref = short;
      return true;
    } catch (e) {
      console.debug('[Link Shortener] could not rewrite URL:', e);
      return false;
    }
  }

  function startPolling() {
    if (pollTimer) return;
    // 750ms is fast enough that share clicks land on a clean URL while
    // still being far below any noticeable CPU cost.
    pollTimer = setInterval(() => {
      if (!isOn()) return;
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

  // -- Storage / lifecycle --------------------------------------------------

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    const defaults = { enabled: true };
    defaults[STORAGE_KEY] = true;

    chrome.storage.sync.get(defaults, (items) => {
      masterEnabled = items.enabled !== false;
      siteEnabled = items[STORAGE_KEY] !== false;
      doFullPass();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      let touched = false;
      if (Object.prototype.hasOwnProperty.call(changes, 'enabled')) {
        masterEnabled = changes.enabled.newValue !== false;
        touched = true;
      }
      if (Object.prototype.hasOwnProperty.call(changes, STORAGE_KEY)) {
        siteEnabled = changes[STORAGE_KEY].newValue !== false;
        touched = true;
      }
      if (!touched) return;
      doFullPass();
    });
  } else {
    masterEnabled = true;
    siteEnabled = true;
    doFullPass();
  }

  window.addEventListener('popstate', () => {
    if (isOn()) cleanCurrentUrl();
  });

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message && message.type === 'CHECK_URL') {
        const changed = cleanCurrentUrl();
        sendResponse({ changed });
      }
      return false;
    });
  }
})();
