// itchio.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning itch.io URLs. Address-bar-only.
// Gaming-stores pack. Games live on developer subdomains
// (<dev>.itch.io/<game>). Universal denylist only.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const ITCHIO_HOST_REGEX = /(?:^|\.)itch\.io$/i;

  function isItchioHost(hostname) {
    if (!hostname) return false;
    return ITCHIO_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'gclid', 'dclid', 'fbclid', 'msclkid', 'ttclid', 'twclid',
    'mc_cid', 'mc_eid', 'cjevent', 'cjdata', 'ranmid', 'raneaid',
    'ransiteid',
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
    if (!isItchioHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenItchioUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isItchioHost(url.hostname)) return null;

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
    if (!isItchioHost(url.hostname)) return false;
    const cleaned = shortenItchioUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isItchioHost,
    isPostUrl,
    shortenItchioUrl,
    shortenUrl: shortenItchioUrl,
    needsShortening,
    STORAGE_KEY: 'enabledItchio',
    ITCHIO_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.ItchioLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
