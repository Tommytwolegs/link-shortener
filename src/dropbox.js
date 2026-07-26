// dropbox.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Dropbox shared-link URLs. Address-bar-only.
//
//   dropbox.com/scl/fi/<id>/<name>?rlkey=<key>&st=<token>&dl=0
//   dropbox.com/s/<id>/<name>?dl=0                          (legacy form)
//
// CRITICAL: `rlkey` is the access grant — removing it forces the recipient to
// sign in and request access, so it is KEPT. `dl` (0 = preview, 1 = force
// download) is user intent and is KEPT. Only the `st` token is stripped: it
// is a website-added session/referrer token, NOT part of the access grant —
// the Dropbox desktop app generates working links that carry `rlkey` but no
// `st`, which proves a link without `st` still opens. utm_*/fbclid/gclid go
// too. Everything else (including the file path and name) is untouched.
//
// The URL hash is preserved.
//
// Hosts: dropbox.com (any subdomain: www, www.dropbox.com).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const DROPBOX_HOST_REGEX = /(?:^|\.)dropbox\.com$/i;

  function isDropboxHost(hostname) {
    if (!hostname) return false;
    return DROPBOX_HOST_REGEX.test(hostname);
  }

  // st = website session/referrer token (safe to strip; not the access key).
  const TRACKING_PARAMS = new Set(['st', 'fbclid', 'gclid']);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    if (!isDropboxHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenDropboxUrl(input) {
    let url;
    try { url = new URL(typeof input === 'string' ? input : (input && input.href)); } catch (_e) { return null; }
    if (!isDropboxHost(url.hostname)) return null;
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
    if (!isDropboxHost(url.hostname)) return false;
    const cleaned = shortenDropboxUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isDropboxHost,
    isPostUrl,
    shortenDropboxUrl,
    shortenUrl: shortenDropboxUrl,
    needsShortening,
    STORAGE_KEY: 'enabledDropbox',
    DROPBOX_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.DropboxLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
