// news.js
// ----------------------------------------------------------------------------
// One module covering share-link junk on 51 news outlets worldwide,
// each with its OWN popup toggle (per-outlet storage keys) so a single
// misbehaving outlet can be switched off without losing the rest.
//
// DENYLIST strategy per outlet: only that outlet's known share-attribution
// params (plus utm_* everywhere) are stripped, on ANY path of the outlet's
// host. Everything unrecognized is left alone — which is what guarantees
// gift/paywall tokens survive (NYT unlocked_article_code, Bloomberg
// accessToken, WSJ st, FT shareType, The Times shareToken, ...).
//
// The dispatcher (social-content.js) calls `storageKeyFor(hostname)` to
// resolve which toggle governs the current tab — see the dispatcher notes.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  // One entry per outlet: host regex, per-outlet storage key, exact-match
  // denylist (lowercase), extra prefix families (utm_ is implied for all).
  const OUTLETS = [
    { host: /(?:^|\.)nytimes\.com$/i, key: 'enabledNewsNyt', strip: ['smid', 'smtyp', 'referringsource', 'algo'], prefixes: [] },
    { host: /(?:^|\.)washingtonpost\.com$/i, key: 'enabledNewsWapo', strip: ['itid'], prefixes: [] },
    { host: /(?:^|\.)wsj\.com$/i, key: 'enabledNewsWsj', strip: ['mod', 'reflink'], prefixes: [] },
    { host: /(?:^|\.)bloomberg\.com$/i, key: 'enabledNewsBloomberg', strip: ['cmpid', 'leadsource', 'sref'], prefixes: [] },
    { host: /(?:^|\.)cnn\.com$/i, key: 'enabledNewsCnn', strip: ['cid', 'iid'], prefixes: [] },
    { host: /(?:^|\.)foxnews\.com$/i, key: 'enabledNewsFox', strip: ['intcmp'], prefixes: [] },
    { host: /(?:^|\.)npr\.org$/i, key: 'enabledNewsNpr', strip: [], prefixes: [] },
    { host: /(?:^|\.)cbc\.ca$/i, key: 'enabledNewsCbc', strip: ['cmp', '__vfz'], prefixes: [] },
    { host: /(?:^|\.)theglobeandmail\.com$/i, key: 'enabledNewsGlobemail', strip: ['cmpid'], prefixes: [] },
    { host: /(?:^|\.)globo\.com$/i, key: 'enabledNewsGlobo', strip: [], prefixes: [] },
    { host: /(?:^|\.)clarin\.com$/i, key: 'enabledNewsClarin', strip: [], prefixes: [] },
    { host: /(?:^|\.)infobae\.com$/i, key: 'enabledNewsInfobae', strip: [], prefixes: [] },
    { host: /(?:^|\.)theguardian\.com$/i, key: 'enabledNewsGuardian', strip: ['cmp'], prefixes: [] },
    { host: /(?:^|\.)bbc\.(?:com|co\.uk)$/i, key: 'enabledNewsBbc', strip: ['xtor'], prefixes: ['at_'] },
    { host: /(?:^|\.)dailymail\.co\.uk$/i, key: 'enabledNewsDailymail', strip: ['ito'], prefixes: [] },
    { host: /(?:^|\.)telegraph\.co\.uk$/i, key: 'enabledNewsTelegraph', strip: ['wt.mc_id', 'icid', 'li_source', 'li_medium'], prefixes: [] },
    { host: /(?:^|\.)independent\.co\.uk$/i, key: 'enabledNewsIndependent', strip: [], prefixes: [] },
    { host: /(?:^|\.)ft\.com$/i, key: 'enabledNewsFt', strip: ['ftcamp', 'segmentid'], prefixes: [] },
    { host: /(?:^|\.)economist\.com$/i, key: 'enabledNewsEconomist', strip: ['fsrc', 'etear'], prefixes: [] },
    { host: /(?:^|\.)lemonde\.fr$/i, key: 'enabledNewsLemonde', strip: ['xtor'], prefixes: [] },
    { host: /(?:^|\.)lefigaro\.fr$/i, key: 'enabledNewsLefigaro', strip: ['xtor'], prefixes: [] },
    { host: /(?:^|\.)france24\.com$/i, key: 'enabledNewsFrance24', strip: ['xtor'], prefixes: ['at_'] },
    { host: /(?:^|\.)euronews\.com$/i, key: 'enabledNewsEuronews', strip: [], prefixes: [] },
    { host: /(?:^|\.)dw\.com$/i, key: 'enabledNewsDw', strip: ['maca'], prefixes: [] },
    { host: /(?:^|\.)spiegel\.de$/i, key: 'enabledNewsSpiegel', strip: ['sara_ref'], prefixes: [] },
    { host: /(?:^|\.)bild\.de$/i, key: 'enabledNewsBild', strip: ['wtmc'], prefixes: [] },
    { host: /(?:^|\.)elpais\.com$/i, key: 'enabledNewsElpais', strip: ['prm', 'ssm'], prefixes: [] },
    { host: /(?:^|\.)elmundo\.es$/i, key: 'enabledNewsElmundo', strip: ['emk'], prefixes: [] },
    { host: /(?:^|\.)corriere\.it$/i, key: 'enabledNewsCorriere', strip: [], prefixes: [] },
    { host: /(?:^|\.)repubblica\.it$/i, key: 'enabledNewsRepubblica', strip: ['ref'], prefixes: [] },
    { host: /(?:^|\.)indiatimes\.com$/i, key: 'enabledNewsToi', strip: ['frmapp'], prefixes: [] },
    { host: /(?:^|\.)thehindu\.com$/i, key: 'enabledNewsThehindu', strip: [], prefixes: [] },
    { host: /(?:^|\.)ndtv\.com$/i, key: 'enabledNewsNdtv', strip: ['pfrom'], prefixes: [] },
    { host: /(?:^|\.)indianexpress\.com$/i, key: 'enabledNewsIndianexpress', strip: [], prefixes: [] },
    { host: /(?:^|\.)asahi\.com$/i, key: 'enabledNewsAsahi', strip: ['iref'], prefixes: [] },
    { host: /(?:^|\.)nikkei\.com$/i, key: 'enabledNewsNikkei', strip: ['i_cid', 'n_cid'], prefixes: [] },
    { host: /(?:^|\.)nhk\.or\.jp$/i, key: 'enabledNewsNhk', strip: [], prefixes: [] },
    { host: /(?:^|\.)news\.yahoo\.co\.jp$/i, key: 'enabledNewsYahoojp', strip: ['source'], prefixes: [] },
    { host: /(?:^|\.)scmp\.com$/i, key: 'enabledNewsScmp', strip: ['module', 'pgtype'], prefixes: [] },
    { host: /(?:^|\.)straitstimes\.com$/i, key: 'enabledNewsStraitstimes', strip: [], prefixes: [] },
    { host: /(?:^|\.)channelnewsasia\.com$/i, key: 'enabledNewsCna', strip: ['cid'], prefixes: [] },
    { host: /(?:^|\.)abc\.net\.au$/i, key: 'enabledNewsAbcAu', strip: ['sf'], prefixes: [] },
    { host: /(?:^|\.)smh\.com\.au$/i, key: 'enabledNewsSmh', strip: [], prefixes: [] },
    { host: /(?:^|\.)news\.com\.au$/i, key: 'enabledNewsNewscomau', strip: [], prefixes: [] },
    { host: /(?:^|\.)chosun\.com$/i, key: 'enabledNewsChosun', strip: [], prefixes: [] },
    { host: /(?:^|\.)aljazeera\.com$/i, key: 'enabledNewsAljazeera', strip: ['traffic_source'], prefixes: [] },
    { host: /(?:^|\.)timesofisrael\.com$/i, key: 'enabledNewsTimesofisrael', strip: [], prefixes: [] },
    { host: /(?:^|\.)haaretz\.com$/i, key: 'enabledNewsHaaretz', strip: [], prefixes: [] },
    { host: /(?:^|\.)arabnews\.com$/i, key: 'enabledNewsArabnews', strip: [], prefixes: [] },
    { host: /(?:^|\.)news24\.com$/i, key: 'enabledNewsNews24', strip: [], prefixes: [] },
    { host: /(?:^|\.)reuters\.com$/i, key: 'enabledNewsReuters', strip: ['taid'], prefixes: [] },
    { host: /(?:^|\.)apnews\.com$/i, key: 'enabledNewsAp', strip: [], prefixes: [] },
  ];
  const GLOBAL_PREFIXES = ['utm_'];

  function outletFor(hostname) {
    if (!hostname) return null;
    for (const o of OUTLETS) {
      if (o.host.test(hostname)) return o;
    }
    return null;
  }

  function isNewsHost(hostname) {
    return outletFor(hostname) !== null;
  }

  // Per-outlet toggle key for the dispatcher. Null for non-news hosts.
  function storageKeyFor(hostname) {
    const o = outletFor(hostname);
    return o ? o.key : null;
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
    const o = outletFor(url.hostname);
    if (o === null) return null;

    const prefixes = GLOBAL_PREFIXES.concat(o.prefixes);
    const names = Array.from(url.searchParams.keys());
    for (const name of names) {
      const lower = name.toLowerCase();
      if (o.strip.includes(lower) || prefixes.some((p) => lower.startsWith(p))) {
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
    storageKeyFor,
    shortenNewsUrl,
    shortenUrl: shortenNewsUrl,
    needsShortening,
    OUTLETS,
  };
  global.NewsLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
