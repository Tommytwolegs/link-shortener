// twitch.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Twitch URLs. Address-bar-only.
//
// Recognized forms:
//
//   /videos/<id>                 → VOD. Keeps ?t= (timestamp, e.g. t=1h2m3s)
//                                    and ?collection= (queue context — the
//                                    Twitch analog of Spotify's ?context=)
//   /<channel>/clip/<slug>       → clip (channel-scoped form)
//   clips.twitch.tv/<slug>       → clip (short host form)
//
// Channel pages (/<channel>) are NOT canonicalized — a single generic path
// segment is too collision-prone to treat as a permalink. But their share
// junk (tt_content, tt_medium) is NOT in the universal strip list, so a
// host-scoped fallback denylist cleans it without needing to "recognize"
// the page: it just removes known Twitch tracking from any non-form path.
//
// Tracking stripped: tt_content, tt_medium, featured, filter, sort, sig,
// token (never functional on these forms), utm_* — everything except the
// VOD timestamp. On non-form paths the fallback strips tt_content/tt_medium
// + utm_* only, leaving any functional query state intact.
//
// The URL hash is preserved.
//
// Hosts: twitch.tv (any subdomain — www, m, clips).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const TWITCH_HOST_REGEX = /(?:^|\.)twitch\.tv$/i;
  const CLIPS_HOST_REGEX = /^clips\.twitch\.tv$/i;

  function isTwitchHost(hostname) {
    if (!hostname) return false;
    return TWITCH_HOST_REGEX.test(hostname);
  }

  const FORMS = [
    { pattern: /^\/videos\/\d+\/?$/, keepParams: ['t', 'collection'] },
    { pattern: /^\/[^/?#]+\/clip\/[^/?#]+\/?$/, keepParams: [] },
  ];
  const CLIP_SHORT_PATH = /^\/[^/?#]+\/?$/;

  function formFor(hostname, pathname) {
    if (CLIPS_HOST_REGEX.test(hostname)) {
      if (CLIP_SHORT_PATH.test(pathname)) return { keepParams: [] };
      return null;
    }
    for (const f of FORMS) {
      if (f.pattern.test(pathname)) return f;
    }
    return null;
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    if (!isTwitchHost(url.hostname)) return false;
    return !!formFor(url.hostname, url.pathname);
  }

  // Host-scoped tracking params, stripped on ANY twitch.tv path that isn't a
  // recognized VOD/clip form (channel pages, directory...). Denylist:
  // functional params (sort/filter on directory pages, etc.) always survive.
  const FALLBACK_STRIP = new Set(['tt_content', 'tt_medium', 'fbclid', 'gclid']);
  const FALLBACK_PREFIXES = ['utm_'];

  function fallbackClean(url) {
    const clone = new URL(url.href);
    for (const name of Array.from(clone.searchParams.keys())) {
      const lower = name.toLowerCase();
      if (FALLBACK_STRIP.has(lower) || FALLBACK_PREFIXES.some((p) => lower.startsWith(p))) {
        clone.searchParams.delete(name);
      }
    }
    const hash = clone.hash || '';
    return `${clone.protocol}//${clone.host}${clone.pathname}${clone.search}${hash}`;
  }

  function shortenTwitchUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return null; }
    if (!isTwitchHost(url.hostname)) return null;
    const form = formFor(url.hostname, url.pathname);
    if (!form) return fallbackClean(url);

    const params = new URLSearchParams();
    for (const k of form.keepParams) {
      const v = url.searchParams.get(k);
      if (v !== null && v !== '') params.set(k, v);
    }
    const q = params.toString();
    const query = q ? '?' + q : '';
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    if (!isTwitchHost(url.hostname)) return false;
    const cleaned = shortenTwitchUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isTwitchHost,
    isPostUrl,
    shortenTwitchUrl,
    shortenUrl: shortenTwitchUrl,
    needsShortening,
    STORAGE_KEY: 'enabledTwitch',
    TWITCH_HOST_REGEX,
    CLIPS_HOST_REGEX,
    FORMS,
    FALLBACK_STRIP,
  };
  global.TwitchLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
