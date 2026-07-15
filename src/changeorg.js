// changeorg.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Change.org petition URLs. Address-bar-only.
// Petition shares carry PERSONAL identifiers: recruiter= and
// recruited_by_id= tie the link to the account of whoever shared it,
// and source_location/pt/psf_variant/share_intent record where and how.
// Petition identity lives in the /p/<slug> path; all attribution goes.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const CHANGEORG_HOST_REGEX = /(?:^|\.)change\.org$/i;

  function isChangeorgHost(hostname) {
    if (!hostname) return false;
    return CHANGEORG_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'recruiter', 'recruited_by_id', 'source_location', 'pt',
    'psf_variant', 'share_intent',
    'gclid', 'dclid', 'fbclid', 'msclkid', 'mc_cid', 'mc_eid',
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
    if (!isChangeorgHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenChangeorgUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isChangeorgHost(url.hostname)) return null;

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
    if (!isChangeorgHost(url.hostname)) return false;
    const cleaned = shortenChangeorgUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isChangeorgHost,
    isPostUrl,
    shortenChangeorgUrl,
    shortenUrl: shortenChangeorgUrl,
    needsShortening,
    STORAGE_KEY: 'enabledChangeorg',
    CHANGEORG_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.ChangeorgLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
