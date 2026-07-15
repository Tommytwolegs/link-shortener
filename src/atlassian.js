// atlassian.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Jira + Confluence Cloud URLs. Address-bar-only.
// Work-tools pack.
//
// Every "share" / "copy link" action on Atlassian Cloud appends atlOrigin=,
// an opaque base64 share-tracking token:
//
//   yourco.atlassian.net/browse/PROJ-123?atlOrigin=eyJpIjoi...
//   yourco.atlassian.net/wiki/spaces/ENG/pages/12345/Title?atlOrigin=...
//
// The link works identically without it. DENYLIST strategy: strip
// atlOrigin + universal ad-click junk only. KEEP everything else —
// focusedCommentId (deep-link to a comment), selectedIssue (board view),
// jql (filter searches) are all functional.
//
// Host scope: *.atlassian.net (Jira + Confluence Cloud). Self-hosted
// instances have arbitrary domains and can't be covered by a fixed list.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const ATLASSIAN_HOST_REGEX = /(?:^|\.)atlassian\.net$/i;

  function isAtlassianHost(hostname) {
    if (!hostname) return false;
    return ATLASSIAN_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'atlorigin',
    'gclid', 'dclid', 'fbclid', 'msclkid',
    'mc_cid', 'mc_eid',
  ]);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  // "Post" here = any Atlassian URL carrying at least one strippable param.
  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isAtlassianHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenAtlassianUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isAtlassianHost(url.hostname)) return null;

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
    if (!isAtlassianHost(url.hostname)) return false;
    const cleaned = shortenAtlassianUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isAtlassianHost,
    isPostUrl,
    shortenAtlassianUrl,
    shortenUrl: shortenAtlassianUrl,
    needsShortening,
    STORAGE_KEY: 'enabledAtlassian',
    ATLASSIAN_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.AtlassianLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
