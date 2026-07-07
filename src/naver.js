// naver.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Naver URLs. Address-bar-only.
//
// Naver is Korea's everything-portal: search (search.naver.com), blogs
// (blog.naver.com), cafes (cafe.naver.com), news (news.naver.com /
// n.news.naver.com), shopping. Many legacy Naver URLs carry their IDENTITY
// in the query string (blogId= + logNo=, oid= + aid=, clubid= +
// articleid=, query= + where=), so an allowlist rebuild would be
// dangerous. DENYLIST strategy instead — strip only documented junk, on
// any path, and everything unrecognized survives:
//
//   sm            — "search method" entry-point attribution (sm=top_hty...)
//   tqi           — per-query tracking id
//   oquery        — the user's PREVIOUS query (telemetry, and a privacy
//                   leak when sharing)
//   ackey, qdt, fbm — autocomplete / typing telemetry
//   ie            — charset default (ie=utf8)
//   trackingCode, proxyReferer, fromRss — blog share attribution
//
// ...plus the universal utm_* / fbclid / gclid click junk.
//
// The URL hash is preserved.
//
// Hosts: naver.com and any subdomain.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const NAVER_HOST_REGEX = /(?:^|\.)naver\.com$/i;

  function isNaverHost(hostname) {
    if (!hostname) return false;
    return NAVER_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'sm', 'tqi', 'oquery', 'ackey', 'qdt', 'fbm', 'ie',
    'trackingcode', 'proxyreferer', 'fromrss',
    'fbclid', 'gclid',
  ]);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  // "Post" here = any Naver URL carrying at least one strippable param.
  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isNaverHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenNaverUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isNaverHost(url.hostname)) return null;

    const names = Array.from(url.searchParams.keys());
    for (const name of names) {
      if (isTrackingParam(name)) url.searchParams.delete(name);
    }
    const hash = url.hash || '';
    const query = url.search;
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isNaverHost(url.hostname)) return false;
    const cleaned = shortenNaverUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isNaverHost,
    isPostUrl,
    shortenNaverUrl,
    shortenUrl: shortenNaverUrl,
    needsShortening,
    STORAGE_KEY: 'enabledNaver',
    NAVER_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.NaverLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
