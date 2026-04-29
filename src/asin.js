// asin.js
// ----------------------------------------------------------------------------
// Pure functions for detecting Amazon storefront URLs, pulling the ASIN out of
// the path, and rebuilding the canonical short form (`/dp/ASIN`).
//
// With the optional `{ slug }` option, `shortenAmazonUrl` instead produces
// `/<slug>/dp/ASIN` — Amazon's own "title slug + ASIN" canonical form. The
// slug segment is purely cosmetic to Amazon's router; it just makes the URL
// human-readable. `extractTitleSlug` and `slugifyTitle` are exposed so the
// content script can derive a slug either from the existing URL or from the
// page DOM (#productTitle / document.title).
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

  // -- Title slug -----------------------------------------------------------

  // Path patterns that reveal a single human-readable slug segment immediately
  // before the ASIN. Mirrors the most common slug-bearing URL forms; matches
  // the slug as group 1.
  const SLUG_PATH_PATTERNS = [
    /^\/([^/]+)\/dp\/[A-Z0-9]{10}(?:[/?#]|$)/,
    /^\/([^/]+)\/gp\/product(?:\/glance)?\/[A-Z0-9]{10}(?:[/?#]|$)/,
  ];

  // Path keywords that look like single-segment values but are Amazon route
  // markers, not user-facing slugs. Reject these as candidate slugs.
  const SLUG_BLOCKLIST = new Set([
    'dp', 'gp', 'product', 'product-reviews', 'exec', 'sspa', 's', 'b',
    'hz', 'ref', 'ap', 'shop', 'stores', 'sf',
  ]);

  // Try to read the existing title slug out of an Amazon URL's path. Returns
  // the slug string (e.g. "Acme-Smoked-Fish-Whitefish-Portion") or null. Does
  // NOT touch the DOM — purely string-level extraction.
  function extractTitleSlug(pathname) {
    if (!pathname) return null;
    for (const pat of SLUG_PATH_PATTERNS) {
      const m = pat.exec(pathname);
      if (m && m[1]) {
        const seg = m[1];
        if (!SLUG_BLOCKLIST.has(seg.toLowerCase())) return seg;
      }
    }
    return null;
  }

  // Convenience: pull the slug out of either pathname directly or, for wrapper
  // URLs (sspa/click?url=…, gp/slredirect/?url=…), out of the wrapped `url`
  // query parameter.
  function extractSlug(pathname, search) {
    const direct = extractTitleSlug(pathname);
    if (direct) return direct;
    if (!search) return null;
    let params;
    try {
      params = new URLSearchParams(search);
    } catch (_e) {
      return null;
    }
    const wrapped = params.get('url') || params.get('URL');
    if (!wrapped) return null;
    let wrappedPath;
    try {
      // Wrapped value may be either a path (e.g. "/Foo/dp/ASIN") or an
      // absolute URL. URL() handles both when given a base.
      wrappedPath = new URL(wrapped, 'https://amazon.com').pathname;
    } catch (_e) {
      return null;
    }
    return extractTitleSlug(wrappedPath);
  }

  // Convert a free-form product title (e.g. from `#productTitle` or
  // `document.title`) into a slug formatted like Amazon's own slugs:
  // ASCII letters/digits/hyphens, hyphen-separated words, trimmed. Returns
  // null when the result would be empty.
  function slugifyTitle(text) {
    if (typeof text !== 'string' || !text.trim()) return null;
    let s = text;
    // Strip a trailing " : Amazon.<tld>" or " - Amazon.<tld>" if present
    // (typical of document.title content).
    s = s.replace(/\s*[:|\-–—]\s*Amazon[.\w]*\s*$/i, '');
    // Strip a leading "Amazon.<tld> : " too.
    s = s.replace(/^Amazon[.\w]*\s*[:|\-–—]\s*/i, '');
    // Drop characters Amazon's slugs never include: punctuation, accents,
    // typographic quotes, trademark marks. Keep ASCII alphanumerics, spaces,
    // and hyphens.
    s = s
      .replace(/[‘’‚‛“”„‟]/g, '')
      .replace(/[®™©]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^A-Za-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!s) return null;
    // Cap at ~80 chars and back off to the previous word boundary so we never
    // truncate mid-word. Amazon's own slugs sit comfortably below this.
    if (s.length > 80) {
      s = s.slice(0, 80).replace(/-[^-]*$/, '');
    }
    return s || null;
  }

  // -- URL builders ---------------------------------------------------------

  // Build the canonical short URL.
  //
  // With no options (or `{ slug: null }`), produces the minimal `/dp/ASIN`
  // form. With `{ slug: "Some-Title" }`, produces `/<slug>/dp/ASIN` —
  // Amazon's "title slug + ASIN" form, which Amazon resolves identically but
  // reads more clearly when shared.
  //
  // Always returns a same-origin URL — we never change protocol or hostname.
  // That matters because the content script uses `history.replaceState`, which
  // throws SecurityError on cross-origin URLs. So a page on `smile.amazon.com`
  // gets shortened to `https://smile.amazon.com/dp/ASIN`, not the www. variant.
  // Returns null if the input isn't an Amazon product URL.
  function shortenAmazonUrl(input, options) {
    let url;
    try {
      url = typeof input === 'string' ? new URL(input) : input;
    } catch (_e) {
      return null;
    }
    if (!isAmazonHost(url.hostname)) return null;
    const asin = extractAsin(url.pathname, url.search);
    if (!asin) return null;
    const slug = options && options.slug ? options.slug : null;
    if (slug) {
      return `${url.protocol}//${url.host}/${slug}/dp/${asin}`;
    }
    return `${url.protocol}//${url.host}/dp/${asin}`;
  }

  // Returns true if `input` points at an Amazon product page that is NOT
  // already in the canonical form for the given options (i.e., calling
  // shortenAmazonUrl with the same options would produce a different URL).
  // Used to skip pointless replaceState calls.
  function needsShortening(input, options) {
    let url;
    try {
      url = typeof input === 'string' ? new URL(input) : input;
    } catch (_e) {
      return false;
    }
    if (!isAmazonHost(url.hostname)) return false;
    const asin = extractAsin(url.pathname, url.search);
    if (!asin) return false;
    const slug = options && options.slug ? options.slug : null;
    const expectedPath = slug ? `/${slug}/dp/${asin}` : `/dp/${asin}`;
    return !(
      url.pathname === expectedPath &&
      url.search === '' &&
      url.hash === ''
    );
  }

  const api = {
    isAmazonHost,
    extractAsin,
    extractTitleSlug,
    extractSlug,
    slugifyTitle,
    shortenAmazonUrl,
    needsShortening,
    AMAZON_HOST_REGEX,
    ASIN_PATTERNS,
    SLUG_BLOCKLIST,
  };

  global.AmazonLinkShortener = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
