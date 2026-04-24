// asin.js
// ----------------------------------------------------------------------------
// Pure functions for detecting Amazon storefront URLs, pulling the ASIN out of
// the path, and rebuilding the canonical short form (`/dp/ASIN`).
//
// Loaded as:
//   * a classic content script (sets `window.AmazonLinkShortener`)
//   * a service-worker importScripts target (sets `self.AmazonLinkShortener`)
//   * a CommonJS module from the Node-based unit tests (`module.exports`)
//
// Keep this file dependency-free so it can run in all three contexts.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  // Match any *.amazon.<regional-tld> hostname. The capture group returns the
  // TLD so callers can preserve the user's regional storefront.
  const AMAZON_HOST_REGEX =
    /(?:^|\.)amazon\.(com|co\.uk|ca|de|fr|it|es|nl|se|pl|com\.tr|com\.au|co\.jp|in|sg|ae|sa|eg|com\.mx|com\.br|com\.be)$/i;

  // Path patterns where a 10-character ASIN appears. Tried in order; first hit
  // wins. Each pattern is anchored with `/` on the left and a delimiter on the
  // right so we never grab a 10-character chunk out of the middle of a slug.
  const ASIN_PATTERNS = [
    /\/dp\/([A-Z0-9]{10})(?:[/?#]|$)/,
    /\/gp\/product(?:\/glance)?\/([A-Z0-9]{10})(?:[/?#]|$)/,
    /\/gp\/aw\/d\/([A-Z0-9]{10})(?:[/?#]|$)/,
    /\/gp\/aw\/reviews\/([A-Z0-9]{10})(?:[/?#]|$)/,
    /\/gp\/offer-listing\/([A-Z0-9]{10})(?:[/?#]|$)/,
    /\/product-reviews\/([A-Z0-9]{10})(?:[/?#]|$)/,
    /\/exec\/obidos\/(?:tg\/detail\/-\/|ASIN\/)([A-Z0-9]{10})(?:[/?#]|$)/,
  ];

  function isAmazonHost(hostname) {
    if (!hostname) return false;
    return AMAZON_HOST_REGEX.test(hostname);
  }

  // Try each ASIN path pattern against `pathname` and return the match or null.
  function matchAsinPath(pathname) {
    if (!pathname) return null;
    for (const pattern of ASIN_PATTERNS) {
      const match = pattern.exec(pathname);
      if (match) return match[1];
    }
    return null;
  }

  // Returns the 10-character ASIN or null.
  //
  // Accepts either:
  //   * `pathname` — URL path, e.g. "/Some-Slug/dp/B08N5WRWNW"
  //   * `pathname, search` — path plus query string, for wrapper URLs like
  //     Amazon's sponsored-product click tracker `/sspa/click?url=%2Fdp%2F...`
  //     or the various `/gp/…redirect.html?url=…` wrappers. If the path itself
  //     doesn't contain an ASIN, the `url` query parameter (URL-decoded) is
  //     searched as a fallback.
  function extractAsin(pathname, search) {
    const direct = matchAsinPath(pathname);
    if (direct) return direct;

    if (search) {
      let params;
      try {
        params = new URLSearchParams(search);
      } catch (_e) {
        return null;
      }
      // `url` is the parameter Amazon uses on every wrapper we've seen, but
      // check both common casings to be safe.
      const wrapped = params.get('url') || params.get('URL');
      if (wrapped) {
        // URLSearchParams.get returns the decoded value, so the path portion
        // can be fed straight into the ASIN patterns.
        return matchAsinPath(wrapped);
      }
    }
    return null;
  }

  // Build the canonical short URL.
  //
  // Always returns a same-origin URL — we never change protocol or hostname.
  // That matters because the content script uses `history.replaceState`, which
  // throws SecurityError on cross-origin URLs. So a page on `smile.amazon.com`
  // gets shortened to `https://smile.amazon.com/dp/ASIN`, not the www. variant.
  // Returns null if the input isn't an Amazon product URL.
  function shortenAmazonUrl(input) {
    let url;
    try {
      url = typeof input === 'string' ? new URL(input) : input;
    } catch (_e) {
      return null;
    }
    if (!isAmazonHost(url.hostname)) return null;
    const asin = extractAsin(url.pathname, url.search);
    if (!asin) return null;
    return `${url.protocol}//${url.host}/dp/${asin}`;
  }

  // Returns true if `input` points at an Amazon product page that is NOT
  // already in canonical `/dp/ASIN` form (i.e., calling shortenAmazonUrl would
  // produce a different URL). Used to skip pointless replaceState calls.
  function needsShortening(input) {
    let url;
    try {
      url = typeof input === 'string' ? new URL(input) : input;
    } catch (_e) {
      return false;
    }
    if (!isAmazonHost(url.hostname)) return false;
    const asin = extractAsin(url.pathname, url.search);
    if (!asin) return false;
    return !(
      url.pathname === `/dp/${asin}` &&
      url.search === '' &&
      url.hash === ''
    );
  }

  const api = {
    isAmazonHost,
    extractAsin,
    shortenAmazonUrl,
    needsShortening,
    AMAZON_HOST_REGEX,
    ASIN_PATTERNS,
  };

  global.AmazonLinkShortener = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
