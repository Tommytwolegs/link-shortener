// playstore.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Google Play Store URLs. Address-bar-only.
// App-stores pack. play.google.com/store/apps/details?id=<pkg> — id= IS
// the app and must survive. referrer= (install attribution payload) and
// pcampaignid= (web_share and campaign ids) are stripped, plus universal
// ad-click junk. Host is EXACTLY play.google.com — google.js owns
// www.google.com; no overlap (collision matrix verified).
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const PLAYSTORE_HOST_REGEX = /^play\.google\.com$/i;

  function isPlaystoreHost(hostname) {
    if (!hostname) return false;
    return PLAYSTORE_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'referrer', 'pcampaignid', 'gclid', 'dclid', 'fbclid', 'msclkid',
    'ttclid', 'twclid', 'mc_cid', 'mc_eid', 'cjevent', 'cjdata',
    'ranmid', 'raneaid', 'ransiteid',
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
    if (!isPlaystoreHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenPlaystoreUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isPlaystoreHost(url.hostname)) return null;

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
    if (!isPlaystoreHost(url.hostname)) return false;
    const cleaned = shortenPlaystoreUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isPlaystoreHost,
    isPostUrl,
    shortenPlaystoreUrl,
    shortenUrl: shortenPlaystoreUrl,
    needsShortening,
    STORAGE_KEY: 'enabledPlaystore',
    PLAYSTORE_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.PlaystoreLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
