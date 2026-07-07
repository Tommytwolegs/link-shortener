// bilibili.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Bilibili video URLs. Address-bar-only.
//
//   /video/BV<id>        → video page (modern BV ids)
//   /video/av<digits>    → video page (legacy av ids)
//   b23.tv/<code>        → app share short link
//
// KEEPS `t` (timestamp) and `p` (part number on multi-part videos) — both
// functional. Strips the notoriously long share junk: spm_id_from,
// vd_source, share_source, share_medium, share_plat, share_session_id,
// share_tag, share_from, timestamp, unique_k, bbid, ts, from_spmid,
// utm_* — everything else.
//
// The URL hash is preserved.
//
// Hosts: bilibili.com (any subdomain — www, m), b23.tv.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const BILIBILI_HOST_REGEX = /(?:^|\.)bilibili\.com$/i;
  const B23_HOST_REGEX = /^b23\.tv$/i;

  function isBilibiliHost(hostname) {
    if (!hostname) return false;
    return BILIBILI_HOST_REGEX.test(hostname) || B23_HOST_REGEX.test(hostname);
  }

  const VIDEO_PATH_REGEX = /^\/video\/(?:BV[0-9A-Za-z]+|av\d+)\/?$/;
  const SHORT_PATH = /^\/[^/?#]+\/?$/;

  function isPostPath(hostname, pathname) {
    if (B23_HOST_REGEX.test(hostname)) return SHORT_PATH.test(pathname);
    return VIDEO_PATH_REGEX.test(pathname);
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isBilibiliHost(url.hostname)) return false;
    return isPostPath(url.hostname, url.pathname);
  }

  const KEEP_PARAMS = ['t', 'p'];

  function shortenBilibiliUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isBilibiliHost(url.hostname)) return null;
    if (!isPostPath(url.hostname, url.pathname)) return null;

    // b23.tv short links: identity is the whole path; strip all params.
    const keep = B23_HOST_REGEX.test(url.hostname) ? [] : KEEP_PARAMS;
    const params = new URLSearchParams();
    for (const k of keep) {
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
    if (!isBilibiliHost(url.hostname)) return false;
    const cleaned = shortenBilibiliUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isBilibiliHost,
    isPostUrl,
    shortenBilibiliUrl,
    shortenUrl: shortenBilibiliUrl,
    needsShortening,
    STORAGE_KEY: 'enabledBilibili',
    BILIBILI_HOST_REGEX,
    B23_HOST_REGEX,
    KEEP_PARAMS,
  };
  global.BilibiliLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
