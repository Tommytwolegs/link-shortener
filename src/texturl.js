// texturl.js
// ----------------------------------------------------------------------------
// Extract a usable http(s) URL from arbitrary selected text — for the
// "Copy clean URL" selection context menu and the omnibox keyword. URLs
// pasted into emails/documents arrive as plain prose: surrounded by
// words, wrapped in parentheses or quotes, with trailing sentence
// punctuation, or missing their scheme entirely ("example.com/page").
//
// Rules:
//   1. First https?:// substring wins (prose around it is ignored).
//   2. No scheme? A lone domain-looking token ("host.tld/path") gets
//      https:// prepended — but only when the WHOLE trimmed selection
//      is that token (we never guess mid-sentence).
//   3. Trailing prose punctuation is stripped: . , ; : ! ? ' " and any
//      closing bracket that has no matching opener inside the URL
//      (so "(see https://x.com/a)" loses the ")", but a Wikipedia-style
//      "/wiki/Foo_(bar)" keeps it).
//   4. Result must parse as http(s), else null.
//
// Loaded as a service-worker importScripts target and a CommonJS module
// from Node-based unit tests. Not a content script.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const SCHEME_RE = /https?:\/\/[^\s<>"']+/i;
  // Final label must be an alphabetic TLD — '1.2.3' is not a URL guess.
  const BARE_DOMAIN_RE = /^[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}(?:\/\S*)?$/i;
  const PAIRS = { ')': '(', ']': '[', '}': '{' };

  function trimTrailingProse(candidate) {
    let out = candidate;
    for (;;) {
      const last = out[out.length - 1];
      if (!last) break;
      if ('.,;:!?\'"'.includes(last)) {
        out = out.slice(0, -1);
        continue;
      }
      if (PAIRS[last]) {
        // Keep a closer only if its opener appears inside the URL.
        const opens = out.split(PAIRS[last]).length - 1;
        const closes = out.split(last).length - 1;
        if (closes > opens) {
          out = out.slice(0, -1);
          continue;
        }
      }
      break;
    }
    return out;
  }

  function extractUrlFromText(text) {
    if (!text || typeof text !== 'string') return null;
    let candidate = null;
    const m = text.match(SCHEME_RE);
    if (m) {
      candidate = m[0];
    } else {
      const t = text.trim();
      if (BARE_DOMAIN_RE.test(t)) candidate = 'https://' + t;
    }
    if (!candidate) return null;
    candidate = trimTrailingProse(candidate);
    let url;
    try { url = new URL(candidate); } catch (_e) { return null; }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.href;
  }

  const api = { extractUrlFromText };
  global.TextUrlExtractor = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
