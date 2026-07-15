// researchgate.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning ResearchGate URLs. Address-bar-only.
// Academic pack. researchgate.net/publication/<id>_<slug> — identity in
// the path. Links from RG emails carry ENORMOUS base64 attribution blobs
// (enrichId, enrichSource — often 300+ chars) plus _sg/_sgd signatures,
// ev= event codes and origin= entry attribution. All stripped, plus
// universal junk. DENYLIST strategy.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const RESEARCHGATE_HOST_REGEX = /(?:^|\.)researchgate\.net$/i;

  function isResearchgateHost(hostname) {
    if (!hostname) return false;
    return RESEARCHGATE_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'enrichid', 'enrichsource', '_sg', '_sgd', 'ev', 'origin',
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
    if (!isResearchgateHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenResearchgateUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isResearchgateHost(url.hostname)) return null;

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
    if (!isResearchgateHost(url.hostname)) return false;
    const cleaned = shortenResearchgateUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isResearchgateHost,
    isPostUrl,
    shortenResearchgateUrl,
    shortenUrl: shortenResearchgateUrl,
    needsShortening,
    STORAGE_KEY: 'enabledResearchgate',
    RESEARCHGATE_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.ResearchgateLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
