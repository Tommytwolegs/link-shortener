// indeed.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Indeed job URLs. Address-bar-only.
//
//   indeed.com/viewjob?jk=<job-key>   → job posting. jk IS the stable job id
//                                       and MUST survive; only the referral /
//                                       session junk around it is stripped.
//   indeed.com/jobs?q=&l=             → search results (q + l are the query
//                                       and location — kept).
//
// DENYLIST strategy: Indeed packs the job identity (jk / vjk) and the search
// state (q, l) into the query, so those survive. Stripped: from, tk, advn,
// vjs, indpubnum, camk, sjdu, acatk, empref, utm_*, fbclid, gclid.
//
// The URL hash is preserved.
//
// Hosts: indeed.com (any subdomain).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const INDEED_HOST_REGEX = /(?:^|\.)indeed\.com$/i;

  function isIndeedHost(hostname) {
    if (!hostname) return false;
    return INDEED_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'from', 'tk', 'advn', 'vjs', 'indpubnum', 'camk', 'sjdu', 'acatk',
    'empref', 'fbclid', 'gclid',
  ]);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  // "Post" here = any indeed URL carrying at least one strippable param.
  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    if (!isIndeedHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenIndeedUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : (input && input.href)); } catch (_e) { return null; }
    if (!isIndeedHost(url.hostname)) return null;

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
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    if (!isIndeedHost(url.hostname)) return false;
    const cleaned = shortenIndeedUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isIndeedHost,
    isPostUrl,
    shortenIndeedUrl,
    shortenUrl: shortenIndeedUrl,
    needsShortening,
    STORAGE_KEY: 'enabledIndeed',
    INDEED_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.IndeedLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
