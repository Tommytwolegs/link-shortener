// threads.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Threads share URLs. Address-bar-only.
//
// Recognized forms:
//
//   /@<user>/post/<id>             → canonical post permalink
//
// Tracking parameters stripped: xmt, igshid, hl, etc.
//
// Profile pages (/@<user>) are intentionally NOT recognized — landing
// pages get shared with various intent and we don't want to strip query
// state that might mean something.
//
// The URL hash is preserved.
//
// Hosts: threads.net, threads.com (the latter is Meta's newer alias).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const THREADS_HOST_REGEX = /(?:^|\.)threads\.(?:net|com)$/i;

  function isThreadsHost(hostname) {
    if (!hostname) return false;
    return THREADS_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/@[^/]+\/post\/[^/?#]+\/?$/,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isThreadsHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  function shortenThreadsUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isThreadsHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isThreadsHost(url.hostname)) return false;
    const cleaned = shortenThreadsUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isThreadsHost,
    isPostUrl,
    shortenThreadsUrl,
    shortenUrl: shortenThreadsUrl,
    needsShortening,
    STORAGE_KEY: 'enabledThreads',
    THREADS_HOST_REGEX,
    POST_PATTERNS,
  };
  global.ThreadsLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
