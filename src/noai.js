// noai.js
// ----------------------------------------------------------------------------
// Pure logic for the opt-in "No AI answers in Google searches" switch
// (v1.14, off by default). Google suppresses its AI Overview whenever the
// query carries a negative search operator, so appending ` -ai` to the
// query hides the overview. The background's webNavigation listener calls
// transformSearchUrl() and re-navigates the tab once — the same tab-layer
// mechanism as the redirect skip, no new permissions.
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
//     Overview, and -ai would distort their results for nothing;
//   * the query ALREADY carries -ai (the rewritten navigation itself —
//     this is the loop guard);
//   * the query is itself about AI ("ai" appears as a standalone token:
//     'what is ai', 'ai-generated art'). The minus operator is a real
//     exclusion — appending it to an AI query would filter out exactly
//     the results the user wants. Better to show the overview than to
//     break the search. Token-wise, 'openai', 'bonsai', and 'air fryer'
//     do NOT count as being about AI and still get the suffix.
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

  // The query already excludes ai (bare or quoted): nothing to do.
  const ALREADY_RE = /(?:^|\s)-(?:"ai"|ai)(?=\s|$)/i;

  // "ai" as a standalone token anywhere in the query (not a substring of
  // another word).
  const ABOUT_AI_RE = /(?:^|[^a-z0-9])ai(?=[^a-z0-9]|$)/i;

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
    if (ALREADY_RE.test(q)) return null;
    if (ABOUT_AI_RE.test(q)) return null;
    url.searchParams.set('q', q + ' -ai');
    return url.href;
  }

  const api = { transformSearchUrl, HOST_RE, ABOUT_AI_RE };
  global.NoAiSearch = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
