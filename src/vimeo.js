// vimeo.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Vimeo share URLs. Address-bar-only.
//
// Recognized forms:
//
//   vimeo.com/<id>                       → public video permalink
//   vimeo.com/<id>/<hash>                → UNLISTED video. The second path
//                                          segment is the privacy hash and is
//                                          REQUIRED — without it the video
//                                          shows "Sorry, this video does not
//                                          exist." It lives in the path, so it
//                                          survives by construction.
//   player.vimeo.com/video/<id>?h=<hash> → embed player. ?h= is the same
//                                          privacy hash and is PRESERVED.
//
// For the watch forms every query param is share/tracking junk (?share=copy,
// utm_*, fbclid...) and is stripped; the timestamp deep-link is a URL
// fragment (#t=1m30s), which is always preserved. Non-video paths (profiles,
// /channels, /ondemand...) run through a host-scoped fallback denylist.
//
// The URL hash is preserved.
//
// Hosts: vimeo.com (any subdomain incl. player.vimeo.com).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const VIMEO_HOST_REGEX = /(?:^|\.)vimeo\.com$/i;
  const PLAYER_HOST_REGEX = /^player\.vimeo\.com$/i;

  function isVimeoHost(hostname) {
    if (!hostname) return false;
    return VIMEO_HOST_REGEX.test(hostname);
  }

  // vimeo.com/<id> or vimeo.com/<id>/<unlisted-hash> (id numeric; hash alnum).
  const VIDEO_PATH = /^\/\d+(?:\/[0-9A-Za-z]+)?\/?$/;
  // player.vimeo.com/video/<id>
  const PLAYER_PATH = /^\/video\/\d+\/?$/;

  function formFor(hostname, pathname) {
    if (PLAYER_HOST_REGEX.test(hostname)) {
      if (PLAYER_PATH.test(pathname)) return { keepParams: ['h'] };
      return null;
    }
    if (VIDEO_PATH.test(pathname)) return { keepParams: [] };
    return null;
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    if (!isVimeoHost(url.hostname)) return false;
    return !!formFor(url.hostname, url.pathname);
  }

  // Host-scoped tracking params, stripped on ANY vimeo path that isn't a
  // recognized video form (profiles, /channels, /ondemand...). Denylist:
  // functional params survive.
  const FALLBACK_STRIP = new Set(['fbclid', 'gclid']);
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

  function shortenVimeoUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return null; }
    if (!isVimeoHost(url.hostname)) return null;
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
    if (!isVimeoHost(url.hostname)) return false;
    const cleaned = shortenVimeoUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isVimeoHost,
    isPostUrl,
    shortenVimeoUrl,
    shortenUrl: shortenVimeoUrl,
    needsShortening,
    STORAGE_KEY: 'enabledVimeo',
    VIMEO_HOST_REGEX,
    PLAYER_HOST_REGEX,
    FALLBACK_STRIP,
  };
  global.VimeoLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
