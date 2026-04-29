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
// Respects three flags in chrome.storage.sync:
//   • `enabled`             — master "Shorten All Links" toggle (default true)
//   • `enabledAmazon`       — per-site toggle for Amazon (default true)
//   • `includeAmazonTitle`  — keep product title slug in URLs (default false).
//                             When true, /<slug>/dp/ASIN replaces /dp/ASIN.
//                             Slug is taken from the URL itself when present;
//                             we fall back to #productTitle / document.title
//                             after DOMContentLoaded.
//
// The initial pass is deferred until storage.get resolves, so turning either
// toggle off actually turns the extension off (no sneaky first-pass rewrite
// before state loads).
// ----------------------------------------------------------------------------

(function () {
  'use strict';

  const {
    needsShortening,
    shortenAmazonUrl,
    extractSlug,
    slugifyTitle,
  } = self.AmazonLinkShortener;

  // Start pessimistic — assume disabled until storage tells us otherwise.
  // This guarantees that if the user has turned the extension off, we never
  // do a "just in case" rewrite before we've read the flags.
  let masterEnabled = false;
  let siteEnabled = false;
  let includeTitle = false;
  let observer = null;
  let domReadyHooked = false;

  function isOn() {
    return masterEnabled && siteEnabled;
  }

  // -------- Slug derivation ----------------------------------------------

  // For an arbitrary anchor URL, just look at the URL itself. We don't read
  // the DOM per-link; if the link doesn't already include a slug, we fall
  // back to the bare /dp/ASIN form for that anchor.
  function slugForUrl(url) {
    if (!includeTitle) return null;
    let parsed;
    try {
      parsed = typeof url === 'string' ? new URL(url, location.href) : url;
    } catch {
      return null;
    }
    return extractSlug(parsed.pathname, parsed.search);
  }

  // For the address-bar rewrite, we have more places to look: the current URL
  // first, then the page DOM. The DOM lookups won't return anything until
  // DOMContentLoaded, which is fine — at document_start we still rewrite
  // using the URL slug (or no slug), and the post-DOM pass picks up the rest.
  function slugForAddressBar() {
    if (!includeTitle) return null;
    const fromUrl = extractSlug(location.pathname, location.search);
    if (fromUrl) return fromUrl;
    // DOM fallbacks — only meaningful once the document has loaded enough.
    const titleEl =
      typeof document !== 'undefined' && document.getElementById
        ? document.getElementById('productTitle')
        : null;
    if (titleEl && titleEl.textContent) {
      const s = slugifyTitle(titleEl.textContent);
      if (s) return s;
    }
    if (typeof document !== 'undefined' && document.title) {
      const s = slugifyTitle(document.title);
      if (s) return s;
    }
    return null;
  }

  // -------- Address bar rewriting ----------------------------------------

  function cleanCurrentUrl() {
    if (!isOn()) return false;
    try {
      const slug = slugForAddressBar();
      const opts = slug ? { slug } : undefined;
      if (!needsShortening(location.href, opts)) return false;
      const short = shortenAmazonUrl(location.href, opts);
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
    if (!isOn() || !a) return;
    const href = a.getAttribute('href');
    if (!href) return;
    let absolute;
    try {
      // Resolve relative URLs (e.g. "/dp/ASIN/ref=...") against current page.
      absolute = new URL(href, location.href);
    } catch {
      return;
    }
    const slug = slugForUrl(absolute);
    const opts = slug ? { slug } : undefined;
    if (!needsShortening(absolute, opts)) return;
    const short = shortenAmazonUrl(absolute, opts);
    if (!short || short === absolute.href) return;
    try {
      a.setAttribute('href', short);
    } catch {
      // Some anchors in shadow DOM or with exotic setters may throw; ignore.
    }
  }

  function rewriteAnchorsIn(root) {
    if (!isOn() || !root || typeof root.querySelectorAll !== 'function') return;
    const anchors = root.querySelectorAll('a[href]');
    for (const a of anchors) rewriteAnchor(a);
  }

  function startLinkObserver() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      if (!isOn()) return;
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
    hookDomReady();
  }

  // When `includeAmazonTitle` is on AND the URL currently has no slug we can
  // derive at document_start, we need a second pass once the DOM is ready so
  // we can pull the title out of #productTitle / document.title. Cheap to
  // wire up; only does work if the relevant flag is on and the URL still
  // needs a slug.
  function hookDomReady() {
    if (domReadyHooked) return;
    domReadyHooked = true;
    if (typeof document === 'undefined') return;
    const onReady = () => {
      if (!isOn() || !includeTitle) return;
      cleanCurrentUrl();
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onReady, { once: true });
    } else {
      // Already past document_start; run on the next microtask so this
      // doesn't synchronously re-enter the calling code path.
      Promise.resolve().then(onReady);
    }
  }

  // Load all flags, then (and only then) do the initial pass. storage.get
  // resolves in well under a millisecond in practice, so this still beats
  // page render by a large margin.
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(
      { enabled: true, enabledAmazon: true, includeAmazonTitle: false },
      (items) => {
        masterEnabled = items.enabled !== false;
        siteEnabled = items.enabledAmazon !== false;
        includeTitle = items.includeAmazonTitle === true;
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
      if (Object.prototype.hasOwnProperty.call(changes, 'enabledAmazon')) {
        siteEnabled = changes.enabledAmazon.newValue !== false;
        touched = true;
      }
      if (Object.prototype.hasOwnProperty.call(changes, 'includeAmazonTitle')) {
        includeTitle = changes.includeAmazonTitle.newValue === true;
        touched = true;
      }
      if (!touched) return;
      if (isOn()) doFullPass();
      // Note: on toggle-off we don't un-rewrite past links. Original hrefs
      // are gone the moment we replace them. The toggles govern future
      // rewrites only.
    });
  } else {
    // No storage API available (shouldn't happen in a real extension context,
    // but don't leave the user permanently disabled if something's weird).
    masterEnabled = true;
    siteEnabled = true;
    includeTitle = false;
    doFullPass();
  }

  // Browser back/forward navigation within the same document.
  window.addEventListener('popstate', cleanCurrentUrl);

  // Service worker tells us when an SPA navigation happens.
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message && message.type === 'CHECK_URL') {
        const changed = cleanCurrentUrl();
        if (isOn()) rewriteAnchorsIn(document);
        sendResponse({ changed });
      }
      return false;
    });
  }
})();
