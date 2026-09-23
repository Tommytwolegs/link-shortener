// tickets.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning event-ticketing links. Address-bar-only.
// ONE module covering 4 US ticketing sites (news.js-style host table),
// each with its OWN toggle key (storageKeyFor), shown in the popup under
// an "Event tickets" category with a group switch. v1.14.
//
// SCOPE NOTE (deliberate): a MARKETING-JUNK denylist, not a canonicalizer.
// Event links shared from these sites carry heavy campaign and affiliate
// attribution; the event id lives in the path and is never touched, and a
// denylist never touches what it doesn't name, so functional params
// (quantity selections, seat filters, date filters) survive by
// construction.
//
// Per-site extras, all attested junk on that site only:
//   ticketmaster: camefrom (partner attribution), tm_link (internal link
//                 attribution), c_luid (marketing id), awtrc (Awin)
//   stubhub:      gcid (campaign id), adcampaigngroup, adname (ad landing
//                 attribution)
//   seatgeek:     aid (affiliate id), pcid (partner campaign id), rtid
//                 (transfer id) — SeatGeek's own affiliate-program params
//   axs:          none beyond the universal set. NOTE: irclickid is
//                 deliberately NOT stripped anywhere in this module — on
//                 tix.axs.com it is load-bearing (the AdGuard filter list
//                 carves out exactly this host for exactly this param).
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  // host regex -> per-site toggle key + extra junk params (lowercase)
  const TICKET_SITES = [
    { host: /(?:^|\.)ticketmaster\.com$/i, key: 'enabledTicketmaster',
      extra: ['camefrom', 'tm_link', 'c_luid', 'awtrc'] },
    { host: /(?:^|\.)stubhub\.com$/i, key: 'enabledStubhub',
      extra: ['gcid', 'adcampaigngroup', 'adname'] },
    { host: /(?:^|\.)seatgeek\.com$/i, key: 'enabledSeatgeek',
      extra: ['aid', 'pcid', 'rtid'] },
    { host: /(?:^|\.)axs\.com$/i, key: 'enabledAxs', extra: [] },
  ];

  const UNIVERSAL_PARAMS = new Set([
    'gclid', 'dclid', 'fbclid', 'msclkid', 'ttclid', 'twclid',
    'mc_cid', 'mc_eid', 'cjevent', 'wt.mc_id',
  ]);
  const TRACKING_PREFIXES = ['utm_'];

  function siteFor(hostname) {
    if (!hostname) return null;
    for (const s of TICKET_SITES) {
      if (s.host.test(hostname)) return s;
    }
    return null;
  }

  function isTicketsHost(hostname) {
    return siteFor(hostname) !== null;
  }

  // Per-site toggle key for the dispatcher (news-pack pattern).
  function storageKeyFor(hostname) {
    const s = siteFor(hostname);
    return s ? s.key : null;
  }

  function isTrackingParam(name, site) {
    const lower = name.toLowerCase();
    if (UNIVERSAL_PARAMS.has(lower)) return true;
    if (TRACKING_PREFIXES.some((p) => lower.startsWith(p))) return true;
    return site.extra.indexOf(lower) !== -1;
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    const site = siteFor(url.hostname);
    if (!site) return false;
    return Array.from(url.searchParams.keys())
      .some((n) => isTrackingParam(n, site));
  }

  function shortenTicketsUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : (input && input.href)); } catch (_e) { return null; }
    const site = siteFor(url.hostname);
    if (!site) return null;

    const names = Array.from(url.searchParams.keys());
    for (const name of names) {
      if (isTrackingParam(name, site)) url.searchParams.delete(name);
    }
    const hash = url.hash || '';
    const query = url.search;
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    if (!isTicketsHost(url.hostname)) return false;
    const cleaned = shortenTicketsUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isTicketsHost,
    isPostUrl,
    storageKeyFor,
    shortenTicketsUrl,
    shortenUrl: shortenTicketsUrl,
    needsShortening,
    TICKET_SITES,
    UNIVERSAL_PARAMS,
  };
  global.TicketsLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
