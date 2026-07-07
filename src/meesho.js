// meesho.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Meesho product URLs. Address-bar-only.
//
//   /<slug>/p/<id>       → product page (alphanumeric id)
//   /s/p/<id>            → app share short form
//   /<slug>/pl/<id>      → catalog/listing page
//
// (URL model verified 2026-06-12 against real product pages.) Meesho is
// social commerce — links travel via WhatsApp with heavy tracking; strip
// everything, identity is in the path. Hash preserved.
// Hosts: meesho.com (any subdomain).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const MEESHO_HOST_REGEX = /(?:^|\.)meesho\.com$/i;

  function isMeeshoHost(hostname) {
    if (!hostname) return false;
    return MEESHO_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/[^/?#]+\/p\/[0-9a-z]+\/?$/i,
    /^\/s\/p\/[0-9a-z]+\/?$/i,
    /^\/[^/?#]+\/pl\/[0-9a-z]+\/?$/i,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isMeeshoHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  function shortenMeeshoUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isMeeshoHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;
    const query = '';
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }


  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isMeeshoHost(url.hostname)) return false;
    const cleaned = shortenMeeshoUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isMeeshoHost,
    isPostUrl,
    shortenMeeshoUrl,
    shortenUrl: shortenMeeshoUrl,
    needsShortening,
    STORAGE_KEY: 'enabledMeesho',
    MEESHO_HOST_REGEX,
    POST_PATTERNS,
  };
  global.MeeshoLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
