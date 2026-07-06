// allegro.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Allegro offer URLs. Address-bar-only.
//
// Recognized form:
//
//   /oferta/<slug>-<id>      → offer page
//
// Tracking stripped: bi_s, bi_m, bi_c, bi_t, ref, reco_id, sid, utm_* —
// everything; offer identity is entirely in the path.
//
// The URL hash is preserved.
//
// Hosts: allegro.pl, allegro.cz, allegro.sk, allegro.hu.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const ALLEGRO_HOST_REGEX = /(?:^|\.)allegro\.(?:pl|cz|sk|hu)$/i;

  function isAllegroHost(hostname) {
    if (!hostname) return false;
    return ALLEGRO_HOST_REGEX.test(hostname);
  }

  const OFFER_PATH_REGEX = /^\/oferta\/[^/?#]*\d+\/?$/;

  function isOfferPath(pathname) {
    return OFFER_PATH_REGEX.test(pathname);
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isAllegroHost(url.hostname)) return false;
    return isOfferPath(url.pathname);
  }

  function shortenAllegroUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isAllegroHost(url.hostname)) return null;
    if (!isOfferPath(url.pathname)) return null;
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isAllegroHost(url.hostname)) return false;
    const cleaned = shortenAllegroUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isAllegroHost,
    isPostUrl,
    shortenAllegroUrl,
    shortenUrl: shortenAllegroUrl,
    needsShortening,
    STORAGE_KEY: 'enabledAllegro',
    ALLEGRO_HOST_REGEX,
    OFFER_PATH_REGEX,
  };
  global.AllegroLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
