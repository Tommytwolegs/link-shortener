// twitch.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Twitch URLs. Address-bar-only.
//
// Recognized forms:
//
//   /videos/<id>                 → VOD. Keeps ?t= (timestamp, e.g. t=1h2m3s)
//   /<channel>/clip/<slug>       → clip (channel-scoped form)
//   clips.twitch.tv/<slug>       → clip (short host form)
//
// Channel pages (/<channel>) are intentionally NOT recognized — a single
// generic path segment is too collision-prone, and their share junk is
// already handled by the opt-in universal strip.
//
// Tracking stripped: tt_content, tt_medium, featured, filter, sort, sig,
// token (never functional on these forms), utm_* — everything except the
// VOD timestamp.
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
    { pattern: /^\/videos\/\d+\/?$/, keepParams: ['t'] },
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
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isTwitchHost(url.hostname)) return false;
    return !!formFor(url.hostname, url.pathname);
  }

  function shortenTwitchUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isTwitchHost(url.hostname)) return null;
    const form = formFor(url.hostname, url.pathname);
    if (!form) return null;

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
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
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
  };
  global.TwitchLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
