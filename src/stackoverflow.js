// stackoverflow.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Stack Overflow (and Stack Exchange network)
// URLs. Address-bar-only — but with one twist: PATH rewriting.
//
// Stack Overflow's "Share" buttons generate short links with the sharing
// user's id appended as an extra path segment for attribution:
//
//   /q/<question-id>/<user-id>   → rewritten to /q/<question-id>
//   /a/<answer-id>/<user-id>     → rewritten to /a/<answer-id>
//
// Long question URLs are kept as-is (path already canonical):
//
//   /questions/<id>/<slug>       → strip query junk, keep hash
//
// On question pages, `page` (big questions paginate their answers),
// `answertab`, and `tab` (answer-sort state) are PRESERVED — stripping
// ?page=2 would snap a reader back to page 1 on refresh/share. Tracking
// stripped: noredirect, r, so_medium, so_source, cb, utm_* — everything
// else. Hash preserved — answer anchors (#12345678) and comment anchors
// (#comment123_456) are how deep links work here.
//
// Hosts: stackoverflow.com, stackexchange.com (any site subdomain),
// superuser.com, serverfault.com, askubuntu.com.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const STACKOVERFLOW_HOST_REGEX =
    /(?:^|\.)(?:stackoverflow\.com|stackexchange\.com|superuser\.com|serverfault\.com|askubuntu\.com)$/i;

  function isStackoverflowHost(hostname) {
    if (!hostname) return false;
    return STACKOVERFLOW_HOST_REGEX.test(hostname);
  }

  // Share short links: capture the id, drop the attribution user-id segment.
  const SHARE_Q_REGEX = /^\/q\/(\d+)(?:\/\d+)?\/?$/;
  const SHARE_A_REGEX = /^\/a\/(\d+)(?:\/\d+)?\/?$/;
  // Long form: path is already canonical.
  const QUESTION_REGEX = /^\/questions\/\d+\/[^/?#]+\/?$/;

  // Answer pagination + sort state on question pages — user-visible state,
  // never stripped.
  const QUESTION_KEEP = ['page', 'answertab', 'tab'];

  function canonicalFor(pathname) {
    let m = SHARE_Q_REGEX.exec(pathname);
    if (m) return { path: '/q/' + m[1], keepParams: [] };
    m = SHARE_A_REGEX.exec(pathname);
    if (m) return { path: '/a/' + m[1], keepParams: [] };
    if (QUESTION_REGEX.test(pathname)) return { path: pathname, keepParams: QUESTION_KEEP };
    return null;
  }

  function isPostPath(pathname) {
    return canonicalFor(pathname) !== null;
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isStackoverflowHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  function shortenStackoverflowUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isStackoverflowHost(url.hostname)) return null;
    const form = canonicalFor(url.pathname);
    if (form === null) return null;
    const params = new URLSearchParams();
    for (const k of form.keepParams) {
      const v = url.searchParams.get(k);
      if (v !== null && v !== '') params.set(k, v);
    }
    const q = params.toString();
    const query = q ? '?' + q : '';
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${form.path}${query}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isStackoverflowHost(url.hostname)) return false;
    const cleaned = shortenStackoverflowUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isStackoverflowHost,
    isPostUrl,
    shortenStackoverflowUrl,
    shortenUrl: shortenStackoverflowUrl,
    needsShortening,
    STORAGE_KEY: 'enabledStackoverflow',
    STACKOVERFLOW_HOST_REGEX,
  };
  global.StackoverflowLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
