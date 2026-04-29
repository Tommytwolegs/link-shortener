// reddit.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Reddit share URLs. Address-bar-only.
//
// Recognized forms:
//
//   /r/<sub>/comments/<id>/<slug>/        → strip query + fragment
//   /r/<sub>/comments/<id>/<slug>/<cid>/  → individual comment links — same
//   /r/<sub>/s/<short>/                   → reddit's "share" short form
//   redd.it/<id>                          → redirector short URL
//
// Subdomains preserved for fidelity:
//   - reddit.com, www.reddit.com  (canonical)
//   - old.reddit.com              (users may explicitly want old layout)
//   - new.reddit.com              (the now-deprecated "redesign" host)
//   - np.reddit.com               (no-participation links)
//   - i.reddit.com, sh.reddit.com (other subdomains kept by users)
//
// Hosts: reddit.com (any subdomain), redd.it.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const REDDIT_HOST_REGEX = /(?:^|\.)reddit\.com$/i;
  const REDD_IT_HOST_REGEX = /^redd\.it$/i;

  function isRedditHost(hostname) {
    if (!hostname) return false;
    return REDDIT_HOST_REGEX.test(hostname) || REDD_IT_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/r\/[^/]+\/comments\/[^/]+\/?$/,
    /^\/r\/[^/]+\/comments\/[^/]+\/[^/]+\/?$/,
    /^\/r\/[^/]+\/comments\/[^/]+\/[^/]+\/[^/]+\/?$/,
    // /r/<sub>/s/<short> — the "share" short form
    /^\/r\/[^/]+\/s\/[^/?#]+\/?$/,
  ];

  // redd.it: any single non-trivial path segment is the short ID.
  const REDD_IT_PATH = /^\/[^/?#]+\/?$/;

  function isPostPath(hostname, pathname) {
    if (REDD_IT_HOST_REGEX.test(hostname)) {
      return REDD_IT_PATH.test(pathname);
    }
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isRedditHost(url.hostname)) return false;
    return isPostPath(url.hostname, url.pathname);
  }

  function shortenRedditUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isRedditHost(url.hostname)) return null;
    if (!isPostPath(url.hostname, url.pathname)) return null;
    return `${url.protocol}//${url.host}${url.pathname}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isRedditHost(url.hostname)) return false;
    const cleaned = shortenRedditUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isRedditHost,
    isPostUrl,
    shortenRedditUrl,
    shortenUrl: shortenRedditUrl,
    needsShortening,
    STORAGE_KEY: 'enabledReddit',
    REDDIT_HOST_REGEX,
    REDD_IT_HOST_REGEX,
    POST_PATTERNS,
  };
  global.RedditLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
