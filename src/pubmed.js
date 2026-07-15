// pubmed.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning PubMed URLs. Address-bar-only.
// Academic pack. pubmed.ncbi.nlm.nih.gov/<pmid>/ — article identity lives
// in the path; search URLs keep term/sort/filter (functional). Email-alert
// and feed attribution (fc, ff) and universal campaign junk are stripped.
// otool= (institution access affiliation) is deliberately KEPT — it can
// affect full-text access for the recipient. DENYLIST strategy.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const PUBMED_HOST_REGEX = /^pubmed\.ncbi\.nlm\.nih\.gov$/i;

  function isPubmedHost(hostname) {
    if (!hostname) return false;
    return PUBMED_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'fc', 'ff', 'gclid', 'dclid', 'fbclid', 'msclkid', 'mc_cid',
    'mc_eid',
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
    if (!isPubmedHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenPubmedUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isPubmedHost(url.hostname)) return null;

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
    if (!isPubmedHost(url.hostname)) return false;
    const cleaned = shortenPubmedUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isPubmedHost,
    isPostUrl,
    shortenPubmedUrl,
    shortenUrl: shortenPubmedUrl,
    needsShortening,
    STORAGE_KEY: 'enabledPubmed',
    PUBMED_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.PubmedLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
