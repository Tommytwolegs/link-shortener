// appstore.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Apple App Store URLs. Address-bar-only.
// App-stores pack. apps.apple.com/<storefront>/app/<slug>/id<id> — the app
// lives in the path. pt= (provider token), ct= (campaign token), at=
// (affiliate token), itsct/itscg (marketing-tools campaign ids) are
// stripped + universal junk. mt= (legacy media type) and l= (locale) are
// harmless/functional and kept. apple-music links live on music.apple.com
// (separate module, no overlap).
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const APPSTORE_HOST_REGEX = /^apps\.apple\.com$/i;

  function isAppstoreHost(hostname) {
    if (!hostname) return false;
    return APPSTORE_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'pt', 'ct', 'at', 'itsct', 'itscg', 'gclid', 'dclid', 'fbclid',
    'msclkid', 'ttclid', 'twclid', 'mc_cid', 'mc_eid', 'cjevent',
    'cjdata', 'ranmid', 'raneaid', 'ransiteid',
  ]);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  // "Post" here = any covered URL carrying at least one strippable param.
  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isAppstoreHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenAppstoreUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isAppstoreHost(url.hostname)) return null;

    const names = Array.from(url.searchParams.keys());
    for (const name of names) {
      if (isTrackingParam(name)) url.searchParams.delete(name);
    }
    const hash = url.hash || '';
    const query = url.search;
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isAppstoreHost(url.hostname)) return false;
    const cleaned = shortenAppstoreUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isAppstoreHost,
    isPostUrl,
    shortenAppstoreUrl,
    shortenUrl: shortenAppstoreUrl,
    needsShortening,
    STORAGE_KEY: 'enabledAppstore',
    APPSTORE_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.AppstoreLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
