// substack.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Substack share URLs. Address-bar-only.
//
// Recognized forms:
//
//   <pub>.substack.com/p/<slug>              → post permalink
//   <pub>.substack.com/p/<slug>/comments     → post comments list
//   <pub>.substack.com/p/<slug>/comment/<id> → individual comment
//   open.substack.com/pub/<pub>/p/<slug>     → app share-redirect form (host
//                                              preserved — we never change
//                                              origin, replaceState forbids it)
//   substack.com/@user/p/<slug>              → profile-routed post
//   substack.com/@user/note/c-<id>           → Notes post
//
// Tracking parameters stripped: r (referral handle), utm_* family,
// triedRedirect, showWelcomeOnShare, postPromoId, etc. — everything; no
// query param on these forms carries reader-facing state.
//
// Publications on custom domains (e.g. astralcodexten.com) can't be matched
// by the manifest's host list, so they're out of scope by design.
//
// The URL hash is preserved (Substack uses #footnote-anchor-1 style anchors).
//
// Hosts: substack.com and any subdomain (publication subdomains,
// open.substack.com).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const SUBSTACK_HOST_REGEX = /(?:^|\.)substack\.com$/i;

  function isSubstackHost(hostname) {
    if (!hostname) return false;
    return SUBSTACK_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    // /p/<slug> on a publication subdomain
    /^\/p\/[^/?#]+\/?$/,
    // /p/<slug>/comments — the post's comments list
    /^\/p\/[^/?#]+\/comments\/?$/,
    // /p/<slug>/comment/<id> — individual comment permalink
    /^\/p\/[^/?#]+\/comment\/\d+\/?$/,
    // open.substack.com/pub/<pub>/p/<slug> — app share-redirect form
    /^\/pub\/[^/]+\/p\/[^/?#]+\/?$/,
    // substack.com/@user/p/<slug> — profile-routed post
    /^\/@[^/]+\/p\/[^/?#]+\/?$/,
    // substack.com/@user/note/c-<id> — Notes
    /^\/@[^/]+\/note\/c-\d+\/?$/,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isSubstackHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  function shortenSubstackUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isSubstackHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isSubstackHost(url.hostname)) return false;
    const cleaned = shortenSubstackUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isSubstackHost,
    isPostUrl,
    shortenSubstackUrl,
    shortenUrl: shortenSubstackUrl,
    needsShortening,
    STORAGE_KEY: 'enabledSubstack',
    SUBSTACK_HOST_REGEX,
    POST_PATTERNS,
  };
  global.SubstackLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
