// steam.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Steam store URLs. Address-bar-only.
//
// Recognized forms:
//
//   /app/<id>/<slug>/     → game page (slug optional)
//   /sub/<id>/            → package page
//   /bundle/<id>/<slug>/  → bundle page (slug optional)
//
// One param PRESERVED: `l` — Steam's display-language override
// (?l=japanese); stripping it would flip the store back to the default
// language on refresh. Tracking stripped: snr (Steam's click-path
// breadcrumb — present on nearly every internally-navigated link),
// curator_clanid, utm_* — everything else.
//
// The URL hash is preserved.
//
// Host: store.steampowered.com only (steamcommunity.com has different URL
// shapes and is out of scope for now).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const STEAM_HOST_REGEX = /^store\.steampowered\.com$/i;

  function isSteamHost(hostname) {
    if (!hostname) return false;
    return STEAM_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/app\/\d+(?:\/[^/?#]*)?\/?$/,
    /^\/sub\/\d+(?:\/[^/?#]*)?\/?$/,
    /^\/bundle\/\d+(?:\/[^/?#]*)?\/?$/,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isSteamHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  const KEEP_PARAMS = ['l'];


  // Host-scoped tracking params, stripped on ANY matched-host path that
  // doesn't fit a recognized form above (search pages, profiles, shop
  // pages...). Denylist: functional params always survive.
  const FALLBACK_STRIP = new Set(['snr', 'curator_clanid', 'fbclid', 'gclid']);
  const FALLBACK_PREFIXES = ['utm_'];

  function fallbackClean(url) {
    const clone = new URL(url.href);
    for (const name of Array.from(clone.searchParams.keys())) {
      const lower = name.toLowerCase();
      if (FALLBACK_STRIP.has(lower) || FALLBACK_PREFIXES.some((p) => lower.startsWith(p))) {
        clone.searchParams.delete(name);
      }
    }
    const hash = clone.hash || '';
    return `${clone.protocol}//${clone.host}${clone.pathname}${clone.search}${hash}`;
  }

  function shortenSteamUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isSteamHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return fallbackClean(url);
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
    if (!isSteamHost(url.hostname)) return false;
    const cleaned = shortenSteamUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isSteamHost,
    isPostUrl,
    shortenSteamUrl,
    shortenUrl: shortenSteamUrl,
    needsShortening,
    STORAGE_KEY: 'enabledSteam',
    KEEP_PARAMS,
    STEAM_HOST_REGEX,
    POST_PATTERNS,
  };
  global.SteamLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
