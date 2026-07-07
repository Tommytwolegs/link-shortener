// medium.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Medium share URLs. Address-bar-only.
//
// Recognized forms (story slugs always end in an 8-12 char hex id):
//
//   medium.com/@user/<slug>-<hex>        → profile-published story
//   medium.com/<publication>/<slug>-<hex>→ publication story
//   medium.com/p/<hex>                   → short story id form
//   <user>.medium.com/<slug>-<hex>       → user-subdomain story
//
// One param is PRESERVED: `sk` — the Friend Link share key. A URL with
// ?sk=<token> lets non-members read a paywalled story; stripping it breaks
// the gift link. Everything else (source=..., the post-share junk like
// source=friends_link / source=social.tw, utm_*) is attribution and gets
// stripped. Verified against Medium's Friend Links help docs (2026-06).
//
// Publications on custom domains can't be matched by the manifest's host
// list, so they're out of scope by design.
//
// The URL hash is preserved.
//
// Hosts: medium.com and any subdomain (user subdomains like
// <user>.medium.com).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const MEDIUM_HOST_REGEX = /(?:^|\.)medium\.com$/i;
  const BARE_HOST_REGEX = /^(?:www\.)?medium\.com$/i;

  function isMediumHost(hostname) {
    if (!hostname) return false;
    return MEDIUM_HOST_REGEX.test(hostname);
  }

  // Story slugs end in a hex id: "how-to-do-x-3f2a9b1c8d7e".
  const HEX_TAIL = '[^/?#]*-[0-9a-f]{8,12}';

  // Forms on medium.com / www.medium.com.
  const BARE_HOST_PATTERNS = [
    // /@user/<slug>-<hex>
    new RegExp(`^\\/@[^/]+\\/${HEX_TAIL}\\/?$`, 'i'),
    // /<publication>/<slug>-<hex>  (first segment not @user, not p)
    new RegExp(`^\\/(?!@)(?!p\\/)[^/]+\\/${HEX_TAIL}\\/?$`, 'i'),
    // /p/<hex> — short story id
    /^\/p\/[0-9a-f]{8,12}\/?$/i,
  ];

  // Forms on user subdomains (<user>.medium.com): a single slug segment.
  const SUBDOMAIN_PATTERNS = [
    new RegExp(`^\\/${HEX_TAIL}\\/?$`, 'i'),
    /^\/p\/[0-9a-f]{8,12}\/?$/i,
  ];

  function patternsFor(hostname) {
    return BARE_HOST_REGEX.test(hostname) ? BARE_HOST_PATTERNS : SUBDOMAIN_PATTERNS;
  }

  function isPostPath(hostname, pathname) {
    return patternsFor(hostname).some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isMediumHost(url.hostname)) return false;
    return isPostPath(url.hostname, url.pathname);
  }

  // `sk` is the Friend Link share key — the one param that changes what the
  // recipient can read. Preserved on every story form.
  const KEEP_PARAMS = ['sk'];


  // Host-scoped tracking params, stripped on ANY matched-host path that
  // doesn't fit a recognized form above (search pages, profiles, shop
  // pages...). Denylist: functional params always survive.
  const FALLBACK_STRIP = new Set(['source']);
  const FALLBACK_PREFIXES = [];

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

  function shortenMediumUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isMediumHost(url.hostname)) return null;
    if (!isPostPath(url.hostname, url.pathname)) return fallbackClean(url);

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
    if (!isMediumHost(url.hostname)) return false;
    const cleaned = shortenMediumUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isMediumHost,
    isPostUrl,
    shortenMediumUrl,
    shortenUrl: shortenMediumUrl,
    needsShortening,
    STORAGE_KEY: 'enabledMedium',
    MEDIUM_HOST_REGEX,
    KEEP_PARAMS,
  };
  global.MediumLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
