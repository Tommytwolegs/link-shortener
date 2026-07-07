// wayfair.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Wayfair product URLs. Address-bar-only.
//
//   /pdp/<slug>-<sku>.html   → product page
//
// KEEPS `piid` — comma-separated variant option ids (fabric/size/color);
// stripping it snaps a shared link back to the default variant. Strips
// everything else (search attribution, categoryId, placement junk).
// Hash preserved. Hosts: wayfair.com/.ca/.co.uk/.de.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const WAYFAIR_HOST_REGEX = /(?:^|\.)wayfair\.(?:com|ca|co\.uk|de)$/i;

  function isWayfairHost(hostname) {
    if (!hostname) return false;
    return WAYFAIR_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/pdp\/[^/?#]+\.html\/?$/i,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isWayfairHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  const KEEP_PARAMS = ['piid'];

  function shortenWayfairUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isWayfairHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;
    const params = new URLSearchParams();
    for (const k of KEEP_PARAMS) {
      const v = url.searchParams.get(k);
      if (v !== null && v !== '') params.set(k, v);
    }
    const q = params.toString();
    const query = q ? '?' + q : '';
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }


  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isWayfairHost(url.hostname)) return false;
    const cleaned = shortenWayfairUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isWayfairHost,
    isPostUrl,
    shortenWayfairUrl,
    shortenUrl: shortenWayfairUrl,
    needsShortening,
    STORAGE_KEY: 'enabledWayfair',
    WAYFAIR_HOST_REGEX,
    POST_PATTERNS,
    KEEP_PARAMS,
  };
  global.WayfairLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
