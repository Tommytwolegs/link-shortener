// linkedin.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning LinkedIn share URLs. Address-bar-only.
//
// Recognized post forms (all just have the path preserved + everything else
// stripped):
//
//   /posts/<handle>_<title-and-activity-id>     → public post permalink
//   /feed/update/urn:li:activity:<id>/          → activity URN form
//   /feed/update/urn:li:share:<id>/             → share URN form
//   /pulse/<slug-with-id>/                      → Pulse / newsletter article
//   /jobs/view/<numeric id>/                    → job listing
//   /news/story/<slug>-<id>/                    → LinkedIn News stories
//   /jobs/search/                               → job search results. Keeps
//        currentJobId (the selected job), keywords, geoId, f_TPR (time
//        filter), distance — the params that define what the recipient
//        sees. Strips refId/trackingId/origin/trk and the rest.
//   /events/<numeric id>/                       → event page
//
// Profile pages (/in/<handle>/), company pages (/company/<name>/), and
// school pages (/school/<name>/) are intentionally NOT recognized —
// landing pages get shared with various intent (search filters, etc.) and
// we don't want to second-guess that.
//
// Tracking parameters that get stripped: trackingId, refId, lipi,
// originalSubdomain, midToken, midSig, trk, trkInfo, utm_*, eBP, etc.
//
// FALLBACK: on linkedin.com paths that match NO recognized form (news
// surfaces we haven't enumerated, profile links shared from the feed,
// company pages, ...), a host-scoped denylist still strips LinkedIn's
// own tracking params — lipi, trk, trackingId, refId, midToken, midSig,
// eBP, originalSubdomain, trkInfo, licu, miniProfileUrn,
// original_referer — while leaving everything else (keywords, filters)
// untouched. This is what keeps "Copy clean URL" useful on the long
// tail of LinkedIn pages.
//
// One exception: /feed/update/* deep-links to a specific comment via
// ?commentUrn=urn:li:comment:(activity:...). Without it, the URL still
// loads the post but doesn't scroll to or highlight the linked comment.
// We preserve commentUrn (and replyUrn for reply-to-reply deep-links) on
// the /feed/update/ pattern only.
//
// The URL hash is preserved — LinkedIn doesn't use hashes for tracking.
//
// Hosts: linkedin.com (any subdomain).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const LINKEDIN_HOST_REGEX = /(?:^|\.)linkedin\.com$/i;

  function isLinkedinHost(hostname) {
    if (!hostname) return false;
    return LINKEDIN_HOST_REGEX.test(hostname);
  }

  // Per-pattern keepParams. Most LinkedIn URL forms are clean: the path
  // alone fully identifies the page. /feed/update/ is the exception —
  // comment deep-links survive through the ?commentUrn= / ?replyUrn= pair.
  const POST_PATTERNS = [
    { regex: /^\/posts\/[^/?#]+\/?$/, keepParams: [] },
    { regex: /^\/feed\/update\/urn:li:[^/]+:\d+\/?$/, keepParams: ['commentUrn', 'replyUrn'] },
    { regex: /^\/pulse\/[^/?#]+\/?$/, keepParams: [] },
    { regex: /^\/jobs\/view\/\d+\/?$/, keepParams: [] },
    { regex: /^\/news\/story\/[^/?#]+\/?$/, keepParams: [] },
    { regex: /^\/jobs\/search\/?$/, keepParams: ['currentJobId', 'keywords', 'geoId', 'f_TPR', 'distance'] },
    { regex: /^\/events\/\d+\/?$/, keepParams: [] },
  ];

  // Host-scoped tracking params, stripped on ANY linkedin.com path that
  // doesn't match a recognized form above. Lowercase; matched
  // case-insensitively.
  const FALLBACK_STRIP = new Set([
    'lipi', 'trk', 'trkinfo', 'trackingid', 'refid', 'midtoken', 'midsig',
    'ebp', 'originalsubdomain', 'licu', 'miniprofileurn', 'original_referer',
  ]);

  function specFor(pathname) {
    for (const p of POST_PATTERNS) {
      if (p.regex.test(pathname)) return p;
    }
    return null;
  }

  function isPostPath(pathname) {
    return specFor(pathname) !== null;
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isLinkedinHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  function shortenLinkedinUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isLinkedinHost(url.hostname)) return null;
    const spec = specFor(url.pathname);
    if (spec) {
      const params = new URLSearchParams();
      for (const k of spec.keepParams) {
        const v = url.searchParams.get(k);
        if (v !== null && v !== '') params.set(k, v);
      }
      const q = params.toString();
      const query = q ? '?' + q : '';
      const hash = url.hash || '';
      return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
    }
    // Unrecognized LinkedIn path — fallback denylist (clone; never mutate).
    const clone = new URL(url.href);
    for (const name of Array.from(clone.searchParams.keys())) {
      if (FALLBACK_STRIP.has(name.toLowerCase())) clone.searchParams.delete(name);
    }
    const hash = clone.hash || '';
    return `${clone.protocol}//${clone.host}${clone.pathname}${clone.search}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isLinkedinHost(url.hostname)) return false;
    const cleaned = shortenLinkedinUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isLinkedinHost,
    isPostUrl,
    shortenLinkedinUrl,
    shortenUrl: shortenLinkedinUrl,
    needsShortening,
    STORAGE_KEY: 'enabledLinkedin',
    FALLBACK_STRIP,
    LINKEDIN_HOST_REGEX,
    POST_PATTERNS,
  };
  global.LinkedinLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
