// tiktok.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning TikTok share URLs. Address-bar-only.
//
// Recognized forms:
//
//   /@<user>/video/<id>           → strip query, keep hash
//   /@<user>/photo/<id>           → photo posts
//   /t/<short>                    → tiktok.com/t short links
//   /share/video/<id>             → TikTok's canonical "share" form
//   /share/photo/<id>             → photo-post share form
//   /share/user/<id>              → user-profile share form
//   vm.tiktok.com/<short>         → mobile share short links
//   vt.tiktok.com/<short>         → another short-link variant
//
// The URL hash is preserved — TikTok doesn't use hashes for tracking.
//
// Hosts: tiktok.com, m.tiktok.com, www.tiktok.com, vm.tiktok.com, vt.tiktok.com.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const TIKTOK_HOST_REGEX = /(?:^|\.)tiktok\.com$/i;

  function isTiktokHost(hostname) {
    if (!hostname) return false;
    return TIKTOK_HOST_REGEX.test(hostname);
  }

  // Hosts that exist purely to issue short share URLs — anything that's a
  // single non-trivial path segment counts.
  const SHORT_HOSTS = new Set(['vm.tiktok.com', 'vt.tiktok.com']);
  const SHORT_PATH = /^\/[^/?#]+\/?$/;

  const POST_PATTERNS = [
    /^\/@[^/]+\/video\/\d+\/?$/,
    /^\/@[^/]+\/photo\/\d+\/?$/,
    /^\/t\/[^/?#]+\/?$/,
    // /share/video/<id> — TikTok's canonical share URL form
    /^\/share\/video\/\d+\/?$/,
    /^\/share\/photo\/\d+\/?$/,
    /^\/share\/user\/\d+\/?$/,
  ];

  function isPostPath(hostname, pathname) {
    if (SHORT_HOSTS.has(hostname.toLowerCase())) {
      return SHORT_PATH.test(pathname);
    }
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isTiktokHost(url.hostname)) return false;
    return isPostPath(url.hostname, url.pathname);
  }


  // Host-scoped tracking params, stripped on ANY matched-host path that
  // doesn't fit a recognized form above (search pages, profiles, shop
  // pages...). Denylist: functional params always survive.
  const FALLBACK_STRIP = new Set(['_t', '_r', 'u_code', 'share_app_id', 'share_link_id', 'share_item_id', 'checksum', 'sender_device', 'sender_web_id', 'is_from_webapp', 'is_copy_url', 'fbclid', 'gclid']);
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

  function shortenTiktokUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isTiktokHost(url.hostname)) return null;
    if (!isPostPath(url.hostname, url.pathname)) return fallbackClean(url);
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isTiktokHost(url.hostname)) return false;
    const cleaned = shortenTiktokUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isTiktokHost,
    isPostUrl,
    shortenTiktokUrl,
    shortenUrl: shortenTiktokUrl,
    needsShortening,
    STORAGE_KEY: 'enabledTiktok',
    TIKTOK_HOST_REGEX,
    POST_PATTERNS,
  };
  global.TiktokLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
