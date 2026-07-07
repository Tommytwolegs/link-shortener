// redirect.js
// ----------------------------------------------------------------------------
// Pure redirector-unwrapping for the "Copy clean URL" context menu.
//
// Email clients and social feeds wrap outbound links in tracking
// redirectors (Gmail/Google wrap links as google.com/url?q=<target>,
// Facebook as l.facebook.com/l.php?u=, Reddit as out.reddit.com?url=,
// YouTube descriptions as youtube.com/redirect?q=). Unwrapping them via
// the context menu means right-clicking a wrapped link anywhere — inside
// Gmail, a Facebook feed, a YouTube description — copies the REAL
// destination, which then gets cleaned by whichever per-site module
// matches it.
//
// This is used ONLY by the background context menu (cleanAnyUrl); the
// address bar never sees these URLs (they redirect instantly), and no
// content script or host permission is involved.
//
// Safety: only http(s) targets are accepted; unwrapping is capped at 3
// hops to avoid loops; on any doubt the original URL is returned.
//
// Loaded as a service-worker importScripts target and a CommonJS module
// from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  // { host, path, params } — first present param wins.
  const REDIRECTORS = [
    { host: /^(?:www\.)?google\.com$/i, path: /^\/url\/?$/, params: ['q', 'url'] },
    { host: /^l\.facebook\.com$/i, path: /^\/l\.php\/?$/, params: ['u'] },
    { host: /^lm\.facebook\.com$/i, path: /^\/l\.php\/?$/, params: ['u'] },
    { host: /^out\.reddit\.com$/i, path: /^\/?$/, params: ['url'] },
    { host: /^(?:www\.|m\.)?youtube\.com$/i, path: /^\/redirect\/?$/, params: ['q'] },
  ];

  // Unwrap ONE layer. Returns the target URL string, or null if `input`
  // isn't a recognized redirector (or the target isn't a sane http(s) URL).
  function unwrapOnce(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    for (const r of REDIRECTORS) {
      if (!r.host.test(url.hostname)) continue;
      if (!r.path.test(url.pathname)) continue;
      for (const p of r.params) {
        const target = url.searchParams.get(p);
        if (!target) continue;
        let t;
        try { t = new URL(target); } catch (_e) { continue; }
        if (t.protocol !== 'http:' && t.protocol !== 'https:') continue;
        return t.href;
      }
    }
    return null;
  }

  // Unwrap up to 3 nested layers. Returns the innermost target, or the
  // input unchanged when it isn't a redirector.
  function unwrapRedirects(input) {
    let current = typeof input === 'string' ? input : input.href;
    for (let i = 0; i < 3; i++) {
      const next = unwrapOnce(current);
      if (next === null) break;
      current = next;
    }
    return current;
  }

  const api = {
    unwrapOnce,
    unwrapRedirects,
    REDIRECTORS,
  };
  global.RedirectUnwrapper = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
