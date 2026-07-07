// roblox.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Roblox URLs. Address-bar-only.
//
//   /games/<placeid>[/<slug>]     → game page
//   /catalog/<id>[/<slug>]        → avatar-shop item
//
// KEEPS `privateServerLinkCode` on game pages — it's a private-server
// invite (functional; stripping it breaks the invite). Strips refPageId,
// gameSearchSessionInfo, isAd, nativeAdData, listName, position,
// universeId, utm_* — everything else.
//
// The URL hash is preserved.
//
// Hosts: roblox.com (any subdomain — www, web).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const ROBLOX_HOST_REGEX = /(?:^|\.)roblox\.com$/i;

  function isRobloxHost(hostname) {
    if (!hostname) return false;
    return ROBLOX_HOST_REGEX.test(hostname);
  }

  const FORMS = [
    { pattern: /^\/games\/\d+(?:\/[^/?#]*)?\/?$/, keepParams: ['privateServerLinkCode'] },
    { pattern: /^\/catalog\/\d+(?:\/[^/?#]*)?\/?$/, keepParams: [] },
  ];

  function formFor(pathname) {
    for (const f of FORMS) {
      if (f.pattern.test(pathname)) return f;
    }
    return null;
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isRobloxHost(url.hostname)) return false;
    return formFor(url.pathname) !== null;
  }

  function shortenRobloxUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isRobloxHost(url.hostname)) return null;
    const form = formFor(url.pathname);
    if (!form) return null;

    const params = new URLSearchParams();
    for (const k of form.keepParams) {
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
    if (!isRobloxHost(url.hostname)) return false;
    const cleaned = shortenRobloxUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isRobloxHost,
    isPostUrl,
    shortenRobloxUrl,
    shortenUrl: shortenRobloxUrl,
    needsShortening,
    STORAGE_KEY: 'enabledRoblox',
    ROBLOX_HOST_REGEX,
    FORMS,
  };
  global.RobloxLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
