// youtube.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning YouTube share URLs. Address-bar-only.
//
// Recognized forms and how each is cleaned:
//
//   /watch?v=ID&t=N&list=PL&...   → keep ?v= and ?t= (timestamp); drop si,
//                                    pp, feature, list, index, ab_channel,
//                                    utm_*, etc.
//   /shorts/ID?si=X               → /shorts/ID
//   /playlist?list=PLID&...       → keep ?list= only
//   /live/ID?si=X                 → /live/ID
//   /embed/ID?si=X                → /embed/ID
//   youtu.be/ID?si=X&t=N          → youtu.be/ID, with ?t= preserved if set
//
// Hosts: youtube.com, m.youtube.com, music.youtube.com, youtu.be.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const YOUTUBE_HOST_REGEX = /(?:^|\.)youtube\.com$/i;
  const YOUTU_BE_HOST_REGEX = /^youtu\.be$/i;

  function isYoutubeHost(hostname) {
    if (!hostname) return false;
    return YOUTUBE_HOST_REGEX.test(hostname) || YOUTU_BE_HOST_REGEX.test(hostname);
  }

  // YouTube path patterns. allowedParams is what we keep; requiredParams
  // (if present) must all be set with non-empty values for the URL to count
  // as a post.
  const YT_PATTERNS = [
    // /watch — needs v=, optionally keeps t=
    { pattern: /^\/watch\/?$/, allowedParams: new Set(['v', 't']), requiredParams: ['v'] },
    // /shorts/<id>
    { pattern: /^\/shorts\/[^/?#]+\/?$/, allowedParams: new Set(['t']) },
    // /live/<id>
    { pattern: /^\/live\/[^/?#]+\/?$/, allowedParams: new Set(['t']) },
    // /embed/<id>
    { pattern: /^\/embed\/[^/?#]+\/?$/, allowedParams: new Set(['t', 'start']) },
    // /playlist — needs list=
    { pattern: /^\/playlist\/?$/, allowedParams: new Set(['list']), requiredParams: ['list'] },
    // /clip/<clipid>
    { pattern: /^\/clip\/[^/?#]+\/?$/, allowedParams: new Set() },
  ];

  // youtu.be: the entire path is /<videoId>. Keeps ?t= for timestamps.
  const YOUTU_BE_PATH = /^\/[^/?#]+\/?$/;

  function postSpecFor(hostname, pathname, searchParams) {
    if (YOUTU_BE_HOST_REGEX.test(hostname)) {
      if (YOUTU_BE_PATH.test(pathname)) {
        return { allowedParams: new Set(['t']) };
      }
      return null;
    }
    for (const spec of YT_PATTERNS) {
      if (!spec.pattern.test(pathname)) continue;
      if (spec.requiredParams && searchParams) {
        const ok = spec.requiredParams.every((k) => searchParams.has(k) && searchParams.get(k));
        if (!ok) return null;
      }
      return spec;
    }
    return null;
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isYoutubeHost(url.hostname)) return false;
    return !!postSpecFor(url.hostname, url.pathname, url.searchParams);
  }

  function shortenYoutubeUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isYoutubeHost(url.hostname)) return null;
    const spec = postSpecFor(url.hostname, url.pathname, url.searchParams);
    if (!spec) return null;

    const allowed = spec.allowedParams;
    let newSearch = '';
    if (allowed.size > 0) {
      const orig = url.searchParams;
      const params = new URLSearchParams();
      for (const k of allowed) {
        const v = orig.get(k);
        if (v !== null && v !== '') params.set(k, v);
      }
      const s = params.toString();
      if (s) newSearch = '?' + s;
    }
    return `${url.protocol}//${url.host}${url.pathname}${newSearch}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isYoutubeHost(url.hostname)) return false;
    const cleaned = shortenYoutubeUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isYoutubeHost,
    isPostUrl,
    shortenYoutubeUrl,
    shortenUrl: shortenYoutubeUrl,
    needsShortening,
    STORAGE_KEY: 'enabledYoutube',
    YOUTUBE_HOST_REGEX,
    YOUTU_BE_HOST_REGEX,
    YT_PATTERNS,
  };
  global.YoutubeLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
