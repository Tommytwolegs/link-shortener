// asin.js
// ----------------------------------------------------------------------------
// Pure functions for detecting Amazon storefront URLs, pulling the ASIN out of
// the path, and rebuilding the canonical form for each recognized URL shape.
//
// Amazon URLs that contain an ASIN aren't all the same page. For example:
//   /dp/<ASIN>                    — the product page
//   /gp/product/<ASIN>            — also the product page (legacy form)
//   /product-reviews/<ASIN>       — the reviews list page (different page!)
//   /gp/aw/reviews/<ASIN>         — mobile reviews list (different page!)
//   /gp/offer-listing/<ASIN>      — third-party sellers list (different page!)
//
// Collapsing all of these to /dp/<ASIN> would break in-page "5 star" filter
// links, "see all offers" links, etc. — they'd navigate the user to the bare
// product page they were already on. So each form has its own canonical
// destination, and an allowlist of query params worth preserving (e.g.
// filterByStar + pageNumber on the reviews page).
//
// With the optional `{ slug }` option, `shortenAmazonUrl` prepends the title
// slug (`/<slug>/dp/ASIN`, `/<slug>/product-reviews/ASIN`, etc.) — Amazon's
// own readable URL shape. `extractTitleSlug` and `slugifyTitle` are exposed
// so the content script can derive a slug from the URL or DOM.
//
// The URL hash is always preserved — Amazon uses fragments for in-page
// section anchors (`#customerReviews`, `#productDescription`, `#aplus`)
// and never for tracking.
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

  // Each form describes a recognized URL shape that contains an ASIN, the
  // canonical path it should be rewritten to (with the ASIN substituted in),
  // and the allowlist of query params worth keeping after the rewrite.
  //
  // The regex captures the ASIN as group 1 and is anchored with a delimiter
  // on the right so we never grab a 10-character chunk out of the middle of
  // a slug. The leading `\/` (any position) means slug prefixes like
  // `/Some-Slug/dp/ASIN` still match — the slug, if any, is detected
  // separately by extractTitleSlug.
  //
  // canonical: a path template like "dp" or "product-reviews" or
  // "gp/offer-listing" — the rebuilt URL is `/<slug?>/<canonical>/<ASIN>`.
  // keepParams: query params preserved on the rewritten URL. Empty = strip.
  const URL_FORMS = [
    // ----- Product page forms — all canonicalize to /dp/ASIN.
    // th=1 + psc=1 are kept because they pre-lock the variant selector
    // (size/color/etc.) on child-ASIN URLs. Without them, a shared link
    // to "red, size M" snaps back to the default variant.
    { regex: /\/dp\/([A-Z0-9]{10})(?:[/?#]|$)/,
      canonical: 'dp',
      keepParams: ['th', 'psc'] },
    { regex: /\/gp\/product(?:\/glance)?\/([A-Z0-9]{10})(?:[/?#]|$)/,
      canonical: 'dp',
      keepParams: ['th', 'psc'] },
    { regex: /\/gp\/aw\/d\/([A-Z0-9]{10})(?:[/?#]|$)/,
      canonical: 'dp',
      keepParams: ['th', 'psc'] },
    { regex: /\/exec\/obidos\/(?:tg\/detail\/-\/|ASIN\/)([A-Z0-9]{10})(?:[/?#]|$)/,
      canonical: 'dp',
      keepParams: ['th', 'psc'] },

    // ----- Reviews list page. Different destination than the product page —
    // we must keep the path. Filter / sort / pagination params are meaningful
    // user intent (e.g. "show me 5-star reviews, page 2"); everything else
    // (ie=UTF8, ref=cm_cr_*, etc.) is tracking junk and gets stripped.
    { regex: /\/product-reviews\/([A-Z0-9]{10})(?:[/?#]|$)/,
      canonical: 'product-reviews',
      keepParams: ['filterByStar', 'pageNumber', 'sortBy', 'reviewerType', 'formatType', 'mediaType'] },

    // ----- Mobile reviews list. Same intent as /product-reviews.
    { regex: /\/gp\/aw\/reviews\/([A-Z0-9]{10})(?:[/?#]|$)/,
      canonical: 'gp/aw/reviews',
      keepParams: ['filterByStar', 'pageNumber', 'sortBy', 'reviewerType'] },

    // ----- Third-party sellers list. The condition / "new vs used"
    // selectors are real user intent. Other params (ref=*, etc.) are
    // tracking and get stripped.
    { regex: /\/gp\/offer-listing\/([A-Z0-9]{10})(?:[/?#]|$)/,
      canonical: 'gp/offer-listing',
      keepParams: ['condition', 'f_new', 'f_used', 'f_collectible', 'f_refurbished', 'startIndex'] },
  ];

  // The /dp/ form, used as the fallback for sponsored-click wrappers (where
  // the wrapper itself isn't a real navigable form but the wrapped URL
  // points at a product page).
  const DP_FORM = URL_FORMS[0];

  function isAmazonHost(hostname) {
    if (!hostname) return false;
    return AMAZON_HOST_REGEX.test(hostname);
  }

  // Try each URL_FORM against `pathname` and return {asin, form} for the
  // first match, or null.
  function matchUrlForm(pathname) {
    if (!pathname) return null;
    for (const form of URL_FORMS) {
      const m = form.regex.exec(pathname);
      if (m) return { asin: m[1], form };
    }
    return null;
  }

  // Recognize a URL form on the path, falling back to inspecting wrapped
  // URLs in `?url=` params (Amazon's sponsored-product clicktracker
  // `/sspa/click?url=...` and `/gp/slredirect/...?url=...`). Wrapped URLs
  // are always treated as /dp/ — sponsored clickthroughs land on product
  // pages, and the wrapped tracking params aren't real UI state.
  function matchUrlFormWithWrapper(pathname, search) {
    const direct = matchUrlForm(pathname);
    if (direct) return direct;

    if (search) {
      let params;
      try {
        params = new URLSearchParams(search);
      } catch (_e) {
        return null;
      }
      const wrapped = params.get('url') || params.get('URL');
      if (wrapped) {
        let wrappedPath;
        try {
          // Wrapped value may be a path or absolute URL; URL() handles both.
          wrappedPath = new URL(wrapped, 'https://amazon.com').pathname;
        } catch (_e) {
          return null;
        }
        const wrappedMatch = matchUrlForm(wrappedPath);
        if (wrappedMatch) {
          return { asin: wrappedMatch.asin, form: DP_FORM };
        }
      }
    }
    return null;
  }

  // Returns the 10-character ASIN or null. Public API; preserves the
  // historical shape for callers that just want the ASIN.
  function extractAsin(pathname, search) {
    const matched = matchUrlFormWithWrapper(pathname, search);
    return matched ? matched.asin : null;
  }

  // -- Title slug -----------------------------------------------------------

  // Path patterns that reveal a single human-readable slug segment immediately
  // before the form-defining path component. One per slug-bearing form.
  const SLUG_PATH_PATTERNS = [
    /^\/([^/]+)\/dp\/[A-Z0-9]{10}(?:[/?#]|$)/,
    /^\/([^/]+)\/gp\/product(?:\/glance)?\/[A-Z0-9]{10}(?:[/?#]|$)/,
    /^\/([^/]+)\/product-reviews\/[A-Z0-9]{10}(?:[/?#]|$)/,
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

  // Build the canonical short URL for whichever form `input` matches.
  //
  // With no options (or `{ slug: null }`), produces the minimal form, e.g.
  // /dp/ASIN, /product-reviews/ASIN. With `{ slug: "Some-Title" }`,
  // prepends the slug to give /<slug>/dp/ASIN, /<slug>/product-reviews/ASIN.
  //
  // The URL hash is preserved. The query string is filtered to the form's
  // allowlist of meaningful params (e.g. filterByStar + pageNumber for
  // /product-reviews/), with everything else stripped.
  //
  // Always returns a same-origin URL — we never change protocol or hostname.
  // That matters because the content script uses `history.replaceState`,
  // which throws SecurityError on cross-origin URLs.
  // Returns null if the input isn't a recognized Amazon URL.
  function shortenAmazonUrl(input, options) {
    let url;
    try {
      url = typeof input === 'string' ? new URL(input) : input;
    } catch (_e) {
      return null;
    }
    if (!isAmazonHost(url.hostname)) return null;
    const matched = matchUrlFormWithWrapper(url.pathname, url.search);
    if (!matched) return null;
    const { asin, form } = matched;

    const slug = options && options.slug ? options.slug : null;
    const slugPrefix = slug ? `/${slug}` : '';
    const hash = url.hash || '';

    // Filter query string to the form's allowlist.
    let query = '';
    if (form.keepParams && form.keepParams.length > 0) {
      const params = new URLSearchParams();
      for (const k of form.keepParams) {
        const v = url.searchParams.get(k);
        if (v !== null && v !== '') params.set(k, v);
      }
      const s = params.toString();
      if (s) query = `?${s}`;
    }

    return `${url.protocol}//${url.host}${slugPrefix}/${form.canonical}/${asin}${query}${hash}`;
  }

  // Returns true if `input` is a recognized Amazon URL whose canonical form
  // for the given options would differ from `input` itself. Used to skip
  // pointless replaceState calls. Compares the full rebuilt URL — pathname,
  // filtered query string, AND hash — to the original.
  function needsShortening(input, options) {
    let url;
    try {
      url = typeof input === 'string' ? new URL(input) : input;
    } catch (_e) {
      return false;
    }
    if (!isAmazonHost(url.hostname)) return false;
    const cleaned = shortenAmazonUrl(url, options);
    if (!cleaned) return false;
    return cleaned !== url.href;
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
    URL_FORMS,
    SLUG_BLOCKLIST,
  };

  global.AmazonLinkShortener = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
