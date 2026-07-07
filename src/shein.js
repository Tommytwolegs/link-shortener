// shein.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning SHEIN product URLs. Address-bar-only.
//
//   /<slug>-p-<id>.html                → product page
//   /<slug>-p-<id>-cat-<catid>.html    → product page with category id
//
// Strips src_identifier, src_module, src_tab_page_id, mallCode, imgratio,
// pageListType, ici, scici, ref, utm_* — everything; identity is in the
// path.
//
// The URL hash is preserved.
//
// Hosts: shein.com (country subdomains us./de./fr./m. etc.) plus the main
// regional ccTLDs (co.uk, com.mx, com.br, tw, se, pl).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const SHEIN_HOST_REGEX =
    /(?:^|\.)shein\.(?:com|co\.uk|com\.mx|com\.br|tw|se|pl)$/i;

  function isSheinHost(hostname) {
    if (!hostname) return false;
    return SHEIN_HOST_REGEX.test(hostname);
  }

  const PRODUCT_PATH_REGEX = /^\/[^/?#]*-p-\d+(?:-cat-\d+)?\.html\/?$/i;

  function isProductPath(pathname) {
    return PRODUCT_PATH_REGEX.test(pathname);
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isSheinHost(url.hostname)) return false;
    return isProductPath(url.pathname);
  }

  function shortenSheinUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isSheinHost(url.hostname)) return null;
    if (!isProductPath(url.pathname)) return null;
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isSheinHost(url.hostname)) return false;
    const cleaned = shortenSheinUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isSheinHost,
    isPostUrl,
    shortenSheinUrl,
    shortenUrl: shortenSheinUrl,
    needsShortening,
    STORAGE_KEY: 'enabledShein',
    SHEIN_HOST_REGEX,
    PRODUCT_PATH_REGEX,
  };
  global.SheinLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
