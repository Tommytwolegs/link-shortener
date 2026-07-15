// epic.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Epic Games Store URLs. Address-bar-only.
// Gaming-stores pack. Product pages live in the path; creator-code
// affiliate attribution (epic_affiliate) + universal junk are stripped.
// epic_gameId is deliberately KEPT: it rides along on creator links but
// is not confirmed pure-attribution, and the policy is to strip only
// documented junk.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const EPIC_HOST_REGEX = /(?:^|\.)epicgames\.com$/i;

  function isEpicHost(hostname) {
    if (!hostname) return false;
    return EPIC_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'epic_affiliate', 'gclid', 'dclid', 'fbclid',
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
    if (!isEpicHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenEpicUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isEpicHost(url.hostname)) return null;

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
    if (!isEpicHost(url.hostname)) return false;
    const cleaned = shortenEpicUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isEpicHost,
    isPostUrl,
    shortenEpicUrl,
    shortenUrl: shortenEpicUrl,
    needsShortening,
    STORAGE_KEY: 'enabledEpic',
    EPIC_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.EpicLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
