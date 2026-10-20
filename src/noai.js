// noai.js
// ----------------------------------------------------------------------------
// Pure logic for the opt-in "No AI answers in Google searches" switch
// (v1.14, off by default). Google suppresses its AI Overview whenever the
// query carries an exclusion operator, so appending one hides the
// overview. The background's webNavigation listener calls
// transformSearchUrl() and re-navigates the tab once — the same tab-layer
// mechanism as the redirect skip, no new permissions.
//
// WHAT we append: ` -"AI Overview"` — a quoted-phrase exclusion. The
// suppression comes from the operator's PRESENCE, not from which term is
// excluded, so the excluded term is chosen to be nearly free of
// collateral damage: almost no ordinary page contains the literal phrase
// "AI Overview", while excluding the bare token `ai` (the trick as
// usually passed around) silently filters every page that mentions AI
// anywhere — which in 2026 is a lot of the web. A bonus of the phrase
// form: searches ABOUT AI still work, so no AI-topic guard is needed.
//
// transformSearchUrl returns the amended URL, or null when it must stand
// down. It stands down — by construction, which is also what makes the
// rewrite loop-free — when:
//
//   * the host is not google.<tld> / www.google.<tld> (product subdomains
//     like news.google.com and maps.google.com are deliberately excluded);
//   * the path is not /search, or there is no non-empty q=;
//   * the search is a non-web vertical (tbm= or udm= present): Images,
//     News, Shopping, and the udm tabs have their own UIs and no AI
//     Overview;
//   * the query ALREADY carries any exclusion operator (-word or
//     -"phrase"): the overview is already suppressed, so appending would
//     be pure meddling — and since our own suffix is an exclusion, this
//     is the loop guard too. Users who type -ai by hand stay untouched;
//   * the query is about AI Overviews themselves ("ai overview" as a
//     phrase in the query): excluding the phrase would hide exactly the
//     pages the user is looking for.
//
// Loaded as a service-worker importScripts target (and a CommonJS module
// from Node-based unit tests). Never a content script — it acts on
// navigations, not pages.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  // google.com, google.de, google.co.uk, google.com.br, ... with an
  // optional www. — and nothing else in front (news./maps./images.
  // excluded on purpose).
  const HOST_RE = /^(?:www\.)?google\.[a-z]{2,3}(?:\.[a-z]{2})?$/i;

  // Any exclusion operator already present: -word or -"phrase" after the
  // start or whitespace. Hyphenated words (gluten-free) don't match —
  // no leading whitespace before their dash.
  const HAS_EXCLUSION_RE = /(?:^|\s)-["\w]/;

  // The query is about AI Overviews themselves.
  const ABOUT_OVERVIEW_RE = /ai\s+overviews?/i;

  const SUFFIX = ' -"AI Overview"';

  function transformSearchUrl(input) {
    let url;
    try {
      url = new URL(typeof input === 'string' ? input : (input && input.href));
    } catch (_e) {
      return null;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!HOST_RE.test(url.hostname)) return null;
    if (url.pathname !== '/search') return null;
    if (url.searchParams.has('tbm') || url.searchParams.has('udm')) return null;
    const q = url.searchParams.get('q');
    if (!q || !q.trim()) return null;
    if (HAS_EXCLUSION_RE.test(q)) return null;
    if (ABOUT_OVERVIEW_RE.test(q)) return null;
    url.searchParams.set('q', q + SUFFIX);
    return url.href;
  }

  const api = { transformSearchUrl, HOST_RE, SUFFIX };
  global.NoAiSearch = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
