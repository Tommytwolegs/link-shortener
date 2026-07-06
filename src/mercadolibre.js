// mercadolibre.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Mercado Libre / Mercado Livre item URLs.
// Address-bar-only.
//
// Recognized forms:
//
//   /ML<X>-<digits>-<slug>-_JM      → item page (articulo./produto. subdomains)
//   /p/ML<X><digits>                → catalog product page
//
// One param is PRESERVED: `searchVariation` — it pre-selects the variant
// (size/color) card the user picked from search results.
//
// IMPORTANT EXCEPTION — the URL hash is NOT preserved on Mercado Libre.
// Unlike every other supported site, ML puts pure tracking in the fragment
// (#polycard_client=..., #position=...&type=item&tracking_id=...), so this
// module deliberately drops it. Don't "fix" this to match the other modules.
//
// Query junk stripped: pdp_filters, deal_print_id, tracking_id, wid, sid,
// reco_*, c_id, c_uid, utm_* — everything except searchVariation.
//
// Hosts: mercadolibre.<latam-tld> (AR/MX/CL/CO/PE/UY/VE/EC + .com),
// mercadolivre.com.br (Brazil, Portuguese spelling).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const MERCADOLIBRE_HOST_REGEX =
    /(?:^|\.)(?:mercadolibre\.(?:com|com\.ar|com\.mx|cl|com\.co|com\.pe|com\.uy|com\.ve|com\.ec)|mercadolivre\.com\.br)$/i;

  function isMercadolibreHost(hostname) {
    if (!hostname) return false;
    return MERCADOLIBRE_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    // /MLA-1234567890-producto-increible-_JM (item pages)
    /^\/ML[A-Z]-\d+-[^/?#]+-_JM\/?$/,
    // /p/MLA12345678 (catalog pages)
    /^\/p\/ML[A-Z]\d+\/?$/,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isMercadolibreHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  const KEEP_PARAMS = ['searchVariation'];

  function shortenMercadolibreUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isMercadolibreHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;

    const params = new URLSearchParams();
    for (const k of KEEP_PARAMS) {
      const v = url.searchParams.get(k);
      if (v !== null && v !== '') params.set(k, v);
    }
    const q = params.toString();
    const query = q ? '?' + q : '';
    // NO hash — ML uses the fragment for tracking (see header comment).
    return `${url.protocol}//${url.host}${url.pathname}${query}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isMercadolibreHost(url.hostname)) return false;
    const cleaned = shortenMercadolibreUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isMercadolibreHost,
    isPostUrl,
    shortenMercadolibreUrl,
    shortenUrl: shortenMercadolibreUrl,
    needsShortening,
    STORAGE_KEY: 'enabledMercadolibre',
    MERCADOLIBRE_HOST_REGEX,
    POST_PATTERNS,
    KEEP_PARAMS,
  };
  global.MercadolibreLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
