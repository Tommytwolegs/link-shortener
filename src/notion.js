// notion.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Notion page URLs. Address-bar-only.
// Work-tools pack.
//
// Notion's share links carry the page identity in the path slug
// (notion.so/workspace/Page-Title-<32hex>) and append view-state junk:
//
//   pvs=    — share/view provenance token ("copy link" adds pvs=4)
//
// DENYLIST strategy: strip pvs + universal ad-click junk only. KEEP
// everything else — v= (database view id) and p= (peeked page id) change
// what the recipient sees and are functional.
//
// Hosts: notion.so, www.notion.so, and public sites on *.notion.site.
//
// The URL hash is preserved (block anchors live there).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const NOTION_HOST_REGEX = /(?:^|\.)(?:notion\.so|notion\.site)$/i;

  function isNotionHost(hostname) {
    if (!hostname) return false;
    return NOTION_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'pvs',
    'gclid', 'dclid', 'fbclid', 'msclkid',
    'mc_cid', 'mc_eid',
  ]);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  // "Post" here = any Notion URL carrying at least one strippable param.
  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isNotionHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenNotionUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isNotionHost(url.hostname)) return null;

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
    if (!isNotionHost(url.hostname)) return false;
    const cleaned = shortenNotionUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isNotionHost,
    isPostUrl,
    shortenNotionUrl,
    shortenUrl: shortenNotionUrl,
    needsShortening,
    STORAGE_KEY: 'enabledNotion',
    NOTION_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.NotionLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
