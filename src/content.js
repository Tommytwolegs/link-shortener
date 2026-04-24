// content.js
// ----------------------------------------------------------------------------
// Runs at document_start on every Amazon storefront page. Does two things:
//
//   1. Rewrites the address bar URL to the canonical short form via
//      history.replaceState (no reload, no flicker).
//   2. Rewrites the `href` attribute of every product-page link on the page
//      so that right-click → Copy link address gives the short form. A
//      MutationObserver handles dynamically-added links (carousels, search
//      pagination, SPA transitions).
//
// Respects the `enabled` flag in chrome.storage.sync. The initial pass is
// deferred until storage.get resolves, so turning the toggle off actually
// turns the extension off (no sneaky first-pass rewrite before state loads).
// ----------------------------------------------------------------------------

(function () {
  'use strict';

  const { needsShortening, shortenAmazonUrl } = self.AmazonLinkShortener;

  // Start pessimistic — assume disabled until storage tells us otherwise.
  // This guarantees that if the user has turned the extension off, we never
  // do a "just in case" rewrite before we've read the flag.
  let enabled = false;
  let observer = null;

  // -------- Address bar rewriting ----------------------------------------

  function cleanCurrentUrl() {
    if (!enabled) return false;
    try {
      if (!needsShortening(location.href)) return false;
      const short = shortenAmazonUrl(location.href);
      if (!short || short === location.href) return false;
      history.replaceState(history.state, '', short);
      return true;
    } catch (e) {
      console.debug('[Amazon Link Shortener] could not rewrite URL:', e);
      return false;
    }
  }

  // -------- In-page link rewriting ---------------------------------------

  // Rewrite a single <a> if its href points to an Amazon product page.
  function rewriteAnchor(a) {
    if (!enabled || !a) return;
    const href = a.getAttribute('href');
    if (!href) return;
    let absolute;
    try {
      // Resolve relative URLs (e.g. "/dp/ASIN/ref=...") against current page.
      absolute = new URL(href, location.href).href;
    } catch {
      return;
    }
    if (!needsShortening(absolute)) return;
    const short = shortenAmazonUrl(absolute);
    if (!short || short === absolute) return;
    try {
      a.setAttribute('href', short);
    } catch {
      // Some anchors in shadow DOM or with exotic setters may throw; ignore.
    }
  }

  function rewriteAnchorsIn(root) {
    if (!enabled || !root || typeof root.querySelectorAll !== 'function') return;
    const anchors = root.querySelectorAll('a[href]');
    for (const a of anchors) rewriteAnchor(a);
  }

  function startLinkObserver() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      if (!enabled) return;
      for (const m of mutations) {
        if (m.type === 'attributes') {
          // href changed on an existing anchor (Amazon does this on
          // carousel/pagination updates).
          if (m.target && m.target.tagName === 'A') rewriteAnchor(m.target);
          continue;
        }
        // Nodes added to the DOM.
        for (const node of m.addedNodes) {
          if (!node || node.nodeType !== 1 /* ELEMENT_NODE */) continue;
          if (node.tagName === 'A') rewriteAnchor(node);
          // Descendant anchors inside added subtrees.
          if (typeof node.querySelectorAll === 'function') {
            const descendants = node.querySelectorAll('a[href]');
            for (const d of descendants) rewriteAnchor(d);
          }
        }
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href'],
    });
  }

  // -------- Lifecycle -----------------------------------------------------

  // Everything the content script does when it's newly enabled or when a new
  // page lands: fix the address bar, sweep existing links, and make sure the
  // observer is watching for future ones.
  function doFullPass() {
    cleanCurrentUrl();
    rewriteAnchorsIn(document);
    startLinkObserver();
  }

  // Load the enabled flag, then (and only then) do the initial pass.
  // storage.get resolves in well under a millisecond in practice, so this
  // still beats page render by a large margin.
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get({ enabled: true }, (items) => {
      enabled = items.enabled !== false;
      doFullPass();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && Object.prototype.hasOwnProperty.call(changes, 'enabled')) {
        enabled = changes.enabled.newValue !== false;
        if (enabled) doFullPass();
        // Note: on toggle-off we don't un-rewrite past links. Original hrefs
        // are gone the moment we replace them. The toggle governs future
        // rewrites only.
      }
    });
  } else {
    // No storage API available (shouldn't happen in a real extension context,
    // but don't leave the user permanently disabled if something's weird).
    enabled = true;
    doFullPass();
  }

  // Browser back/forward navigation within the same document.
  window.addEventListener('popstate', cleanCurrentUrl);

  // Service worker tells us when an SPA navigation happens.
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message && message.type === 'CHECK_URL') {
        const changed = cleanCurrentUrl();
        if (enabled) rewriteAnchorsIn(document);
        sendResponse({ changed });
      }
      return false;
    });
  }
})();
