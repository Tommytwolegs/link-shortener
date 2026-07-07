// taobao.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Taobao and Tmall item URLs. Address-bar-only.
//
// Unlike most supported sites, item identity lives in the QUERY:
//
//   item.taobao.com/item.htm?id=<numeric>     → Taobao item
//   detail.tmall.com/item.htm?id=<numeric>    → Tmall item
//
// KEEPS `id` (required — it IS the item) and `skuId` (variant selector).
// Strips the spm/scm click-path family, ali_refid, ali_trackid, ut_sk,
// sourceType, suid, un, share_crt_v, sp_tk, cpp, shareurl, short_name,
// app, utm_* — everything else.
//
// The URL hash is preserved.
//
// Hosts: taobao.com and tmall.com (any subdomain — item., detail., world.,
// m.). Audience caveat: mainland users largely aren't on the Chrome/AMO
// stores; this mainly serves diaspora shoppers.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const TAOBAO_HOST_REGEX = /(?:^|\.)(?:taobao|tmall)\.com$/i;

  function isTaobaoHost(hostname) {
    if (!hostname) return false;
    return TAOBAO_HOST_REGEX.test(hostname);
  }

  const ITEM_PATH_REGEX = /^\/item\.htm\/?$/i;

  // An item URL needs BOTH the /item.htm path AND a numeric ?id=.
  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isTaobaoHost(url.hostname)) return false;
    if (!ITEM_PATH_REGEX.test(url.pathname)) return false;
    const id = url.searchParams.get('id');
    return !!(id && /^\d+$/.test(id));
  }

  const KEEP_PARAMS = ['id', 'skuId'];

  function shortenTaobaoUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isPostUrl(url)) return null;

    const params = new URLSearchParams();
    for (const k of KEEP_PARAMS) {
      const v = url.searchParams.get(k);
      if (v !== null && v !== '') params.set(k, v);
    }
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}?${params.toString()}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isTaobaoHost(url.hostname)) return false;
    const cleaned = shortenTaobaoUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isTaobaoHost,
    isPostUrl,
    shortenTaobaoUrl,
    shortenUrl: shortenTaobaoUrl,
    needsShortening,
    STORAGE_KEY: 'enabledTaobao',
    TAOBAO_HOST_REGEX,
    ITEM_PATH_REGEX,
    KEEP_PARAMS,
  };
  global.TaobaoLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
