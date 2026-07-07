// news.js
// ----------------------------------------------------------------------------
// One compact module covering share-link junk on 13 major news outlets.
// Address-bar-only, DENYLIST strategy per outlet: only that outlet's known
// share-attribution params are stripped, on ANY path of the outlet's host
// (the params below are attribution everywhere they appear). Everything
// unrecognized — including gift/paywall tokens — is left alone:
//   NYT `unlocked_article_code`, Bloomberg `accessToken`, WSJ `st` (gift
//   links) are all PRESERVED precisely because this is a denylist.
//
// Outlets and their junk:
//   nytimes.com        smid, smtyp, referringSource, algo
//   theguardian.com    CMP
//   washingtonpost.com itid
//   bbc.com/.co.uk     at_medium, at_campaign, at_custom1-4, at_link_id,
//                      at_link_origin, at_link_type, at_bbc_team, at_ptr_name
//   cnn.com            cid, iid
//   dailymail.co.uk    ito
//   reuters.com        taid
//   apnews.com         (utm_* only)
//   npr.org            (utm_* only)
//   foxnews.com        intcmp
//   bloomberg.com      cmpid, leadSource, sref
//   wsj.com            mod, reflink
//
// utm_* is stripped on all of them. The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  // [host regex, exact-match denylist (lowercase)]
  const OUTLETS = [
    [/(?:^|\.)nytimes\.com$/i, ['smid', 'smtyp', 'referringsource', 'algo']],
    [/(?:^|\.)theguardian\.com$/i, ['cmp']],
    [/(?:^|\.)washingtonpost\.com$/i, ['itid']],
    [/(?:^|\.)bbc\.(?:com|co\.uk)$/i, ['at_medium', 'at_campaign', 'at_custom1', 'at_custom2', 'at_custom3', 'at_custom4', 'at_link_id', 'at_link_origin', 'at_link_type', 'at_bbc_team', 'at_ptr_name', 'at_format']],
    [/(?:^|\.)cnn\.com$/i, ['cid', 'iid']],
    [/(?:^|\.)dailymail\.co\.uk$/i, ['ito']],
    [/(?:^|\.)reuters\.com$/i, ['taid']],
    [/(?:^|\.)apnews\.com$/i, []],
    [/(?:^|\.)npr\.org$/i, []],
    [/(?:^|\.)foxnews\.com$/i, ['intcmp']],
    [/(?:^|\.)bloomberg\.com$/i, ['cmpid', 'leadsource', 'sref']],
    [/(?:^|\.)wsj\.com$/i, ['mod', 'reflink']],
  ];
  const TRACKING_PREFIXES = ['utm_'];

  function outletFor(hostname) {
    if (!hostname) return null;
    for (const [re, list] of OUTLETS) {
      if (re.test(hostname)) return list;
    }
    return null;
  }

  function isNewsHost(hostname) {
    return outletFor(hostname) !== null;
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    return isNewsHost(url.hostname);
  }

  function shortenNewsUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    const denylist = outletFor(url.hostname);
    if (denylist === null) return null;

    const names = Array.from(url.searchParams.keys());
    for (const name of names) {
      const lower = name.toLowerCase();
      if (denylist.includes(lower) || TRACKING_PREFIXES.some((p) => lower.startsWith(p))) {
        url.searchParams.delete(name);
      }
    }
    const hash = url.hash || '';
    const query = url.search;
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isNewsHost(url.hostname)) return false;
    const cleaned = shortenNewsUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isNewsHost,
    isPostUrl,
    shortenNewsUrl,
    shortenUrl: shortenNewsUrl,
    needsShortening,
    STORAGE_KEY: 'enabledNews',
    OUTLETS,
  };
  global.NewsLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
