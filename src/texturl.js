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

  // -- Bulk mode: clean EVERY http(s) URL inside a blob of text ------------
  // Used by the bulk paste-cleaner page. `cleanFn` is the full cleanup
  // pipeline (redirect unwrap -> per-site shortener -> UTM strip) supplied
  // by the caller, so this module stays free of cross-module dependencies.
  // Trailing prose punctuation is treated as prose (kept, not cleaned),
  // matching the single-URL extraction rules above.
  const SCHEME_RE_ALL = /https?:\/\/[^\s<>"']+/gi;

  function cleanAllUrlsInText(text, cleanFn) {
    if (!text || typeof text !== 'string' || typeof cleanFn !== 'function') {
      return { text: text || '', found: 0, changed: 0, saved: 0 };
    }
    let found = 0;
    let changed = 0;
    let saved = 0;
    const out = text.replace(SCHEME_RE_ALL, (raw) => {
      const url = trimTrailingProse(raw);
      const tail = raw.slice(url.length);
      let parsed;
      try { parsed = new URL(url); } catch (_e) { return raw; }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return raw;
      found += 1;
      let cleaned = null;
      try { cleaned = cleanFn(url); } catch (_e) { return raw; }
      if (!cleaned || typeof cleaned !== 'string' || cleaned === url) return raw;
      changed += 1;
      saved += Math.max(0, url.length - cleaned.length);
      return cleaned + tail;
    });
    return { text: out, found, changed, saved };
  }

  const api = { extractUrlFromText, cleanAllUrlsInText };
  global.TextUrlExtractor = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
