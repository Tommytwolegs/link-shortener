// zalando.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Zalando article URLs. Address-bar-only.
//
//   /<slug>-<sku9>-<sku3>.html   → article page (sku like ni112o0cs-q11)
//
// KEEPS `size` — it preselects the size (variant class, like Amazon
// th/psc). Strips wmc, cd_*, opc, utm_* — everything else.
// Hash preserved. Hosts: 16 European zalando TLDs.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const ZALANDO_HOST_REGEX = /(?:^|\.)zalando\.(?:de|fr|it|es|nl|pl|co\.uk|at|ch|be|se|dk|fi|no|cz|ie)$/i;

  function isZalandoHost(hostname) {
    if (!hostname) return false;
    return ZALANDO_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/[^/?#]+-[a-z0-9]{9}-[a-z0-9]{3}\.html\/?$/i,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isZalandoHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  const KEEP_PARAMS = ['size'];

  function shortenZalandoUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isZalandoHost(url.hostname)) return null;
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
    if (!isZalandoHost(url.hostname)) return false;
    const cleaned = shortenZalandoUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isZalandoHost,
    isPostUrl,
    shortenZalandoUrl,
    shortenUrl: shortenZalandoUrl,
    needsShortening,
    STORAGE_KEY: 'enabledZalando',
    ZALANDO_HOST_REGEX,
    POST_PATTERNS,
    KEEP_PARAMS,
  };
  global.ZalandoLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
