// applemusic.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Apple Music / Apple Podcasts URLs.
// Address-bar-only.
//
// Recognized forms (all with a 2-letter storefront country prefix):
//
//   music.apple.com/<cc>/album/<slug>/<id>       → keeps ?i= (track id —
//                                                   the "share song" deep link)
//   music.apple.com/<cc>/song/<slug>/<id>        → strip all
//   music.apple.com/<cc>/playlist/<slug>/pl.<id> → strip all
//   music.apple.com/<cc>/artist/<slug>/<id>      → strip all
//   podcasts.apple.com/<cc>/podcast/<slug>/id<n> → keeps ?i= (episode id)
//
// Tracking stripped: at, ct (affiliate/campaign tokens), itsct, itscg,
// app, ls, uo, mt, lId, cId, sr, src — everything except `i`.
//
// The URL hash is preserved.
//
// Hosts: music.apple.com, podcasts.apple.com (exact).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const APPLEMUSIC_HOST_REGEX = /^(?:music|podcasts)\.apple\.com$/i;

  function isAppleMusicHost(hostname) {
    if (!hostname) return false;
    return APPLEMUSIC_HOST_REGEX.test(hostname);
  }

  const FORMS = [
    { pattern: /^\/[a-z]{2}\/album\/[^/?#]+\/\d+\/?$/i, keepParams: ['i'] },
    { pattern: /^\/[a-z]{2}\/podcast\/[^/?#]+\/id\d+\/?$/i, keepParams: ['i'] },
    { pattern: /^\/[a-z]{2}\/song\/[^/?#]+\/\d+\/?$/i, keepParams: [] },
    { pattern: /^\/[a-z]{2}\/playlist\/[^/?#]+\/pl\.[^/?#]+\/?$/i, keepParams: [] },
    { pattern: /^\/[a-z]{2}\/artist\/[^/?#]+\/\d+\/?$/i, keepParams: [] },
    { pattern: /^\/[a-z]{2}\/music-video\/[^/?#]+\/\d+\/?$/i, keepParams: [] },
  ];

  function formFor(pathname) {
    for (const f of FORMS) {
      if (f.pattern.test(pathname)) return f;
    }
    return null;
  }

  function isPostPath(pathname) {
    return formFor(pathname) !== null;
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isAppleMusicHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  function shortenAppleMusicUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isAppleMusicHost(url.hostname)) return null;
    const form = formFor(url.pathname);
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
    if (!isAppleMusicHost(url.hostname)) return false;
    const cleaned = shortenAppleMusicUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isAppleMusicHost,
    isPostUrl,
    shortenAppleMusicUrl,
    shortenUrl: shortenAppleMusicUrl,
    needsShortening,
    STORAGE_KEY: 'enabledAppleMusic',
    APPLEMUSIC_HOST_REGEX,
    FORMS,
  };
  global.AppleMusicLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
