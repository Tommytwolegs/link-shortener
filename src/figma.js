// figma.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Figma file URLs. Address-bar-only.
// Work-tools pack.
//
// Figma file links carry identity in the path (/design/<key>/<Name>,
// legacy /file/<key>/, /proto/, /board/, /slides/) with a mix of
// functional params and one tracker:
//
//   node-id=   — which frame/layer is focused  (FUNCTIONAL — keep)
//   m=         — viewer mode (dev/design)      (FUNCTIONAL — keep)
//   viewport / scaling / page-id               (FUNCTIONAL — keep)
//   t=         — share telemetry token added by "copy link" (JUNK)
//
// DENYLIST strategy: t= is stripped ONLY on the file-ish paths above
// (elsewhere on figma.com the name is unverified); universal ad-click
// junk is stripped host-wide.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const FIGMA_HOST_REGEX = /(?:^|\.)figma\.com$/i;
  const FILE_PATH_REGEX = /^\/(?:design|file|proto|board|slides|deck)\//i;

  function isFigmaHost(hostname) {
    if (!hostname) return false;
    return FIGMA_HOST_REGEX.test(hostname);
  }

  const UNIVERSAL_PARAMS = new Set([
    'gclid', 'dclid', 'fbclid', 'msclkid',
    'mc_cid', 'mc_eid',
  ]);
  const TRACKING_PREFIXES = ['utm_'];
  const FILE_ONLY_PARAMS = new Set(['t']);

  function isTrackingParam(name, pathname) {
    const lower = name.toLowerCase();
    if (UNIVERSAL_PARAMS.has(lower)) return true;
    if (TRACKING_PREFIXES.some((p) => lower.startsWith(p))) return true;
    if (FILE_PATH_REGEX.test(pathname || '') && FILE_ONLY_PARAMS.has(lower)) return true;
    return false;
  }

  // "Post" here = any Figma URL carrying at least one strippable param.
  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isFigmaHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys())
      .some((n) => isTrackingParam(n, url.pathname));
  }

  function shortenFigmaUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isFigmaHost(url.hostname)) return null;

    const names = Array.from(url.searchParams.keys());
    for (const name of names) {
      if (isTrackingParam(name, url.pathname)) url.searchParams.delete(name);
    }
    const hash = url.hash || '';
    const query = url.search;
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isFigmaHost(url.hostname)) return false;
    const cleaned = shortenFigmaUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isFigmaHost,
    isPostUrl,
    shortenFigmaUrl,
    shortenUrl: shortenFigmaUrl,
    needsShortening,
    STORAGE_KEY: 'enabledFigma',
    FIGMA_HOST_REGEX,
    UNIVERSAL_PARAMS,
  };
  global.FigmaLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
