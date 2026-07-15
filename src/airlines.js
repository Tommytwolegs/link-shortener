// airlines.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning airline marketing links. Address-bar-only.
// ONE module covering 12 carriers (news.js-style host table, single toggle).
//
// SCOPE NOTE (deliberate): this is a MARKETING-JUNK denylist, not an
// itinerary cleaner. Airline booking searches run through session state
// (no shareable URL), and manage-booking links carry PNR codes that should
// never be "cleaned and shared" anyway. What IS shared: promo/deal links
// from airline emails and ads, drenched in campaign attribution. We strip
// only params that are never functional anywhere:
//
//   universal ad-click ids  — gclid, dclid, fbclid, msclkid, ttclid,
//                             twclid, mc_cid, mc_eid, cjevent, utm_*
//   WT.mc_id                — Webtrends marketing click id (united & co.)
//   per-carrier extras      — delta: cmp, mkcpgn; southwest: clk
//
// Functional params (dateOut=, originIata= on Ryanair/easyJet deep links,
// check-in tokens, locale pickers) survive by construction — a denylist
// never touches what it doesn't name. Auth/check-in flows are exercised in
// the test battery.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  // host regex -> extra per-carrier junk params (lowercase)
  const AIRLINES = [
    { host: /(?:^|\.)delta\.com$/i, extra: ['cmp', 'mkcpgn'] },
    { host: /(?:^|\.)united\.com$/i, extra: [] },
    { host: /(?:^|\.)aa\.com$/i, extra: [] },
    { host: /(?:^|\.)southwest\.com$/i, extra: ['clk'] },
    { host: /(?:^|\.)jetblue\.com$/i, extra: [] },
    { host: /(?:^|\.)alaskaair\.com$/i, extra: [] },
    { host: /(?:^|\.)ryanair\.com$/i, extra: [] },
    { host: /(?:^|\.)easyjet\.com$/i, extra: [] },
    { host: /(?:^|\.)lufthansa\.com$/i, extra: [] },
    { host: /(?:^|\.)britishairways\.com$/i, extra: [] },
    { host: /(?:^|\.)emirates\.com$/i, extra: [] },
    { host: /(?:^|\.)qatarairways\.com$/i, extra: [] },
  ];

  const UNIVERSAL_PARAMS = new Set([
    'gclid', 'dclid', 'fbclid', 'msclkid', 'ttclid', 'twclid',
    'mc_cid', 'mc_eid', 'cjevent', 'wt.mc_id',
  ]);
  const TRACKING_PREFIXES = ['utm_'];

  function airlineFor(hostname) {
    if (!hostname) return null;
    for (const a of AIRLINES) {
      if (a.host.test(hostname)) return a;
    }
    return null;
  }

  function isAirlineHost(hostname) {
    return airlineFor(hostname) !== null;
  }

  function isTrackingParam(name, airline) {
    const lower = name.toLowerCase();
    if (UNIVERSAL_PARAMS.has(lower)) return true;
    if (TRACKING_PREFIXES.some((p) => lower.startsWith(p))) return true;
    return airline.extra.indexOf(lower) !== -1;
  }

  // "Post" here = any covered airline URL carrying at least one strippable param.
  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    const airline = airlineFor(url.hostname);
    if (!airline) return false;
    return Array.from(url.searchParams.keys())
      .some((n) => isTrackingParam(n, airline));
  }

  function shortenAirlineUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    const airline = airlineFor(url.hostname);
    if (!airline) return null;

    const names = Array.from(url.searchParams.keys());
    for (const name of names) {
      if (isTrackingParam(name, airline)) url.searchParams.delete(name);
    }
    const hash = url.hash || '';
    const query = url.search;
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isAirlineHost(url.hostname)) return false;
    const cleaned = shortenAirlineUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isAirlineHost,
    isPostUrl,
    shortenAirlineUrl,
    shortenUrl: shortenAirlineUrl,
    needsShortening,
    STORAGE_KEY: 'enabledAirlines',
    AIRLINES,
    UNIVERSAL_PARAMS,
  };
  global.AirlinesLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
