// netsuite.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning NetSuite record URLs. Address-bar-only.
// First member of the work-tools pack (links shared in Slack/Teams/tickets
// between colleagues who all have access).
//
// NetSuite account instances live on subdomains of app.netsuite.com
// (e.g. 3356652.app.netsuite.com). Record URLs carry the record in id=
// but arrive drenched in "search in app" breadcrumb state:
//
//   /app/common/item/item.nl?id=86757
//     &siaT=1783620245509   — search timestamp
//     &siaWhc=%2Fapp%2F...  — where-came-from path
//     &siaPs=0&siaPfx=      — nav state
//     &siaQ=23005MAL        — THE SEARCH QUERY THE USER TYPED (leaks intent!)
//     &siaNv=gs
//   whence=                 — another back-navigation breadcrumb
//
// The record loads fine with just id=. DENYLIST strategy: strip the six
// documented sia* params + whence + universal ad-click junk. KEEP id=,
// e=T (edit mode is functional), compid, script, deploy and everything
// else. Login/SSO lives on system.netsuite.com — outside this host scope,
// untouchable by construction.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const NETSUITE_HOST_REGEX = /(?:^|\.)app\.netsuite\.com$/i;

  function isNetsuiteHost(hostname) {
    if (!hostname) return false;
    return NETSUITE_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'siat', 'siawhc', 'siaps', 'siapfx', 'siaq', 'sianv',
    'whence',
    'gclid', 'dclid', 'fbclid', 'msclkid',
    'mc_cid', 'mc_eid',
  ]);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  // "Post" here = any NetSuite URL carrying at least one strippable param.
  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isNetsuiteHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenNetsuiteUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isNetsuiteHost(url.hostname)) return null;

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
    if (!isNetsuiteHost(url.hostname)) return false;
    const cleaned = shortenNetsuiteUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isNetsuiteHost,
    isPostUrl,
    shortenNetsuiteUrl,
    shortenUrl: shortenNetsuiteUrl,
    needsShortening,
    STORAGE_KEY: 'enabledNetsuite',
    NETSUITE_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.NetsuiteLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
