// redirect.js
// ----------------------------------------------------------------------------
// Pure redirector-unwrapping for the "Copy clean URL" context menu.
//
// Email clients and social feeds wrap outbound links in tracking
// redirectors. Unwrapping them via the copy pipeline (context menu,
// keyboard shortcut, popup button) means a wrapped link anywhere —
// inside Gmail, Outlook, a Facebook feed, a Bing results page — copies
// the REAL destination, which then gets cleaned by whichever per-site
// module matches it.
//
// Covered wrappers (target embedded IN the URL — zero network needed):
//   google.com/url?q=            Gmail + Google Docs outbound links
//   l.facebook.com/l.php?u=      Facebook (+ lm. and l.messenger.com)
//   l.instagram.com/?u=          Instagram bio/DM links
//   out.reddit.com/?url=         Reddit outbound
//   youtube.com/redirect?q=      YouTube descriptions/comments
//   *.safelinks.protection.outlook.com/?url=   Outlook corporate email
//   bing.com/ck/a?u=a1<b64url>   Bing result click-wrappers (base64)
//   steamcommunity.com/linkfilter/?u=          Steam chat/profiles
//   t.umblr.com/redirect?z=      Tumblr outbound
//   href.li/?<raw target>        Tumblr-ecosystem wrapper (raw query)
//
// De-AMP (same pipeline; target embedded in the PATH):
//   google.com/amp/s/<host>/<path>          Google AMP viewer
//   bing.com/amp/s/<host>/<path>            Bing AMP viewer
//   <pub>.cdn.ampproject.org/c|v/s/<host>/  AMP CDN content/viewer
// The /s/ segment means https (without it, http). AMP transport junk
// (amp_*, usqp params; #amp_tf-style fragments) is stripped from the
// recovered URL. Publisher-side AMP paths (site.com/amp/...) are NOT
// touched — no way to know the canonical form without fetching.
//
// NOT covered on purpose: t.co, bit.ly, a.co and other server-side
// shorteners — resolving those requires a network request, and this
// extension makes none.
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

  // Decode base64url (Bing's u= carries "a1" + base64url(target)).
  // atob + TextDecoder exist in service workers, Firefox event pages,
  // and Node 18+ — every runtime this file loads in.
  function b64urlDecode(s) {
    try {
      let b = s.replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      const bin = atob(b);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder('utf-8').decode(bytes);
    } catch (_e) {
      return null;
    }
  }

  // { host, path, params } — first present param wins. Optional per-entry
  // hooks: `decode(value)` transforms the raw param before validation
  // (Bing's base64); `rawQuery: true` treats the entire query string as
  // the target (href.li has no param name at all).
  const REDIRECTORS = [
    { host: /^(?:www\.)?google\.com$/i, path: /^\/url\/?$/, params: ['q', 'url'] },
    { host: /^l\.facebook\.com$/i, path: /^\/l\.php\/?$/, params: ['u'] },
    { host: /^lm\.facebook\.com$/i, path: /^\/l\.php\/?$/, params: ['u'] },
    { host: /^l\.messenger\.com$/i, path: /^\/l\.php\/?$/, params: ['u'] },
    { host: /^l\.instagram\.com$/i, path: /^\/?$/, params: ['u'] },
    { host: /^out\.reddit\.com$/i, path: /^\/?$/, params: ['url'] },
    { host: /^(?:www\.|m\.)?youtube\.com$/i, path: /^\/redirect\/?$/, params: ['q'] },
    // Outlook SafeLinks: nam12./eur04./gcc02. etc. regional subdomains.
    { host: /(?:^|\.)safelinks\.protection\.outlook\.com$/i, path: /^\/?$/, params: ['url'] },
    // Bing result click-wrapper: /ck/a?...&u=a1<base64url(target)>.
    { host: /^(?:www\.|cn\.)?bing\.com$/i, path: /^\/ck\/a\/?$/i, params: ['u'],
      decode: (v) => (v && v.slice(0, 2) === 'a1') ? b64urlDecode(v.slice(2)) : null },
    { host: /^(?:www\.)?steamcommunity\.com$/i, path: /^\/linkfilter\/?$/i, params: ['u', 'url'] },
    { host: /^t\.umblr\.com$/i, path: /^\/redirect\/?$/i, params: ['z'] },
    { host: /^(?:www\.)?href\.li$/i, path: /^\/?$/, rawQuery: true },
    // AMP viewers: target lives in the PATH. fromPath returns the
    // recovered URL (or null), replacing the params machinery.
    { host: /^(?:www\.)?google\.com$/i, path: /^\/amp\/.+/,
      fromPath: (url) => fromAmpRemainder(url.pathname.slice(5) + url.search + url.hash) },
    { host: /^(?:www\.)?bing\.com$/i, path: /^\/amp\/.+/i,
      fromPath: (url) => fromAmpRemainder(url.pathname.slice(5) + url.search + url.hash) },
    { host: /(?:^|\.)cdn\.ampproject\.org$/i, path: /^\/[cv]\/.+/i,
      fromPath: (url) => fromAmpRemainder(url.pathname.slice(3) + url.search + url.hash) },
  ];

  // Recover the real URL from an AMP viewer path remainder like
  // "s/www.example.com/article?x=1" (or without the leading "s/" for
  // plain http). Strips AMP transport params and fragments.
  const AMP_JUNK_PARAM = /^(?:amp_|usqp$|aoh$|amp$)/i;
  const AMP_JUNK_HASH = /^#(?:amp_|aoh=|csi=)/i;
  function fromAmpRemainder(remainder) {
    if (!remainder) return null;
    let rest = remainder;
    let scheme = 'http://';
    if (/^s\//i.test(rest)) { scheme = 'https://'; rest = rest.slice(2); }
    // Reject an empty host segment: 'amp/s//evil.com/x' would otherwise
    // normalize the path's first segment INTO the hostname.
    if (!rest || rest[0] === '/') return null;
    // AMP cache links often carry the target's query percent-encoded in
    // the path ('article%3fid%3d5'). If there's no literal '?', decode
    // the section after the first %3f so the query works again. On any
    // decode error the remainder is left exactly as it was.
    if (rest.indexOf('?') === -1) {
      const qIdx = rest.search(/%3f/i);
      if (qIdx !== -1) {
        try {
          rest = rest.slice(0, qIdx) + '?' + decodeURIComponent(rest.slice(qIdx + 3));
        } catch (_e) { /* keep rest unchanged */ }
      }
    }
    let t;
    try { t = new URL(scheme + rest); } catch (_e) { return null; }
    for (const name of Array.from(t.searchParams.keys())) {
      if (AMP_JUNK_PARAM.test(name)) t.searchParams.delete(name);
    }
    if (t.hash && AMP_JUNK_HASH.test(t.hash)) t.hash = '';
    return t.href;
  }

  // Validate a candidate target: must parse, must be http(s).
  function sanitizeTarget(target) {
    let t;
    try { t = new URL(target); } catch (_e) { return null; }
    if (t.protocol !== 'http:' && t.protocol !== 'https:') return null;
    return t.href;
  }

  // Unwrap ONE layer. Returns the target URL string, or null if `input`
  // isn't a recognized redirector (or the target isn't a sane http(s) URL).
  function unwrapOnce(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    for (const r of REDIRECTORS) {
      if (!r.host.test(url.hostname)) continue;
      if (!r.path.test(url.pathname)) continue;
      if (r.rawQuery) {
        const t = sanitizeTarget(url.search.slice(1));
        if (t) return t;
        continue;
      }
      if (r.fromPath) {
        const candidate = r.fromPath(url);
        if (candidate) {
          const t = sanitizeTarget(candidate);
          if (t) return t;
        }
        continue;
      }
      for (const p of r.params) {
        let target = url.searchParams.get(p);
        if (!target) continue;
        if (r.decode) {
          target = r.decode(target);
          if (!target) continue;
        }
        const t = sanitizeTarget(target);
        if (t) return t;
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
