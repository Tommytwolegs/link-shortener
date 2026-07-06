// temu.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Temu product URLs. Address-bar-only.
//
// Recognized forms:
//
//   /<slug>-g-<goodsid>.html       → canonical product page
//   /g-<goodsid>.html              → slugless variant
//   /goods.html?goods_id=<id>      → query-form product page
//
// One param is PRESERVED: `sku_id` — Temu shares carry it and it pre-selects
// the size/color variant (same category as Amazon th/psc, Target preselect).
// Everything else (_bg_fs, refer_page_name, refer_page_id, refer_page_sn,
// refer_source, _x_sessn_id, top_gallery_url, spec_gallery_id, share_img,
// _x_vst_scene, utm_*) is tracking/session junk and gets stripped.
//
// The URL hash is preserved.
//
// Hosts: temu.com (any subdomain: www, m).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const TEMU_HOST_REGEX = /(?:^|\.)temu\.com$/i;

  function isTemuHost(hostname) {
    if (!hostname) return false;
    return TEMU_HOST_REGEX.test(hostname);
  }

  const FORMS = [
    { pattern: /^\/[^/?#]*-g-\d+\.html\/?$/, keepParams: ['sku_id'] },
    { pattern: /^\/g-\d+\.html\/?$/, keepParams: ['sku_id'] },
    { pattern: /^\/goods\.html\/?$/, keepParams: ['goods_id', 'sku_id'], requiredParams: ['goods_id'] },
  ];

  function formFor(pathname, searchParams) {
    for (const f of FORMS) {
      if (!f.pattern.test(pathname)) continue;
      if (f.requiredParams && searchParams) {
        const ok = f.requiredParams.every((k) => searchParams.has(k) && searchParams.get(k));
        if (!ok) return null;
      }
      return f;
    }
    return null;
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isTemuHost(url.hostname)) return false;
    return !!formFor(url.pathname, url.searchParams);
  }

  function shortenTemuUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isTemuHost(url.hostname)) return null;
    const form = formFor(url.pathname, url.searchParams);
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
    if (!isTemuHost(url.hostname)) return false;
    const cleaned = shortenTemuUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isTemuHost,
    isPostUrl,
    shortenTemuUrl,
    shortenUrl: shortenTemuUrl,
    needsShortening,
    STORAGE_KEY: 'enabledTemu',
    TEMU_HOST_REGEX,
    FORMS,
  };
  global.TemuLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
