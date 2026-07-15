// niconico.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Niconico URLs. Address-bar-only.
// International pack (Japan). ref= share/discovery attribution is
// stripped. DELIBERATELY KEPT: from= — it is the playback-start offset
// (seconds) on watch pages, i.e. a timestamp deep-link.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const NICONICO_HOST_REGEX = /(?:^|\.)nicovideo\.jp$/i;

  function isNiconicoHost(hostname) {
    if (!hostname) return false;
    return NICONICO_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'ref', 'gclid', 'dclid', 'fbclid', 'msclkid', 'ttclid',
    'twclid', 'mc_cid', 'mc_eid', 'cjevent', 'cjdata', 'ranmid',
    'raneaid', 'ransiteid',
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
    if (!isNiconicoHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenNiconicoUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isNiconicoHost(url.hostname)) return null;

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
    if (!isNiconicoHost(url.hostname)) return false;
    const cleaned = shortenNiconicoUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isNiconicoHost,
    isPostUrl,
    shortenNiconicoUrl,
    shortenUrl: shortenNiconicoUrl,
    needsShortening,
    STORAGE_KEY: 'enabledNiconico',
    NICONICO_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.NiconicoLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
