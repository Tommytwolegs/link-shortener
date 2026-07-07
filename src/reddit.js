// reddit.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Reddit share URLs. Address-bar-only.
//
// Recognized forms:
//
//   /r/<sub>/comments/<id>/                  → post permalink (no slug)
//   /r/<sub>/comments/<id>/<slug>/           → post permalink with slug
//   /r/<sub>/comments/<id>/<slug>/<cid>/     → individual comment link
//   /r/<sub>/s/<short>/                      → reddit's "share" short form
//   /user/<u>/comments/<id>/<slug>/          → user-profile post permalink
//   /u/<u>/comments/<id>/<slug>/             → ditto, short form
//   redd.it/<id>                             → redirector short URL
//
// Subreddit front pages (also cleaned):
//
//   /r/<sub>/                                → keep ?sort=, ?t= (sort + time)
//   /r/<sub>/(hot|new|top|rising|controversial)/  → ditto
//
// User-profile front pages (also cleaned):
//
//   /user/<u>/ or /u/<u>/                    → keep ?sort=, ?t=
//   /user/<u>/(comments|submitted|posts|overview)/  → profile tabs, ditto
//
// All other params (utm_*, share_id, correlation_id, context, etc.) are
// stripped. The URL hash is preserved — Reddit doesn't use hashes for
// tracking, and dropping them is the kind of foot-gun that already bit us
// on Amazon's in-page section anchors.
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

  // Post-style forms. The path itself is preserved as-is; per-form keepParams
  // controls which query params survive cleanup.
  const COMMENT_KEEP = ['context'];
  const POST_PATTERNS = [
    // /r/<sub>/comments/<postid>/ — post permalink without slug
    { regex: /^\/r\/[^/]+\/comments\/[^/]+\/?$/, keepParams: [] },
    // /r/<sub>/comments/<postid>/<slug>/ — post permalink with slug
    { regex: /^\/r\/[^/]+\/comments\/[^/]+\/[^/]+\/?$/, keepParams: [] },
    // /r/<sub>/comments/<postid>/<slug>/<commentid>/ — individual comment.
    // ?context=N controls how many parent comments are shown above the
    // linked one (default 3). Sharing "?context=10" preserves more of the
    // thread; stripping it shows just the leaf.
    { regex: /^\/r\/[^/]+\/comments\/[^/]+\/[^/]+\/[^/]+\/?$/, keepParams: COMMENT_KEEP },
    // /r/<sub>/s/<short> — the "share" short form
    { regex: /^\/r\/[^/]+\/s\/[^/?#]+\/?$/, keepParams: [] },
    // User-profile post permalinks
    { regex: /^\/user\/[^/]+\/comments\/[^/]+\/?$/, keepParams: [] },
    { regex: /^\/user\/[^/]+\/comments\/[^/]+\/[^/]+\/?$/, keepParams: [] },
    { regex: /^\/user\/[^/]+\/comments\/[^/]+\/[^/]+\/[^/]+\/?$/, keepParams: COMMENT_KEEP },
    { regex: /^\/u\/[^/]+\/comments\/[^/]+\/?$/, keepParams: [] },
    { regex: /^\/u\/[^/]+\/comments\/[^/]+\/[^/]+\/?$/, keepParams: [] },
    { regex: /^\/u\/[^/]+\/comments\/[^/]+\/[^/]+\/[^/]+\/?$/, keepParams: COMMENT_KEEP },
  ];

  // Subreddit front page forms — keep sort/timeframe params (real user
  // intent), strip everything else (utm_*, share_id, etc.).
  const SUBREDDIT_PATTERN =
    /^\/r\/[^/]+(?:\/(?:hot|new|top|rising|controversial))?\/?$/;
  const SUBREDDIT_KEEP_PARAMS = ['t', 'sort'];

  // User-profile front pages — /user/<u>/ or /u/<u>/, optionally with a
  // tab segment. Post permalinks under /user/.../comments/<id> are matched
  // by POST_PATTERNS first (formFor checks those before this).
  const USER_PROFILE_PATTERN =
    /^\/u(?:ser)?\/[^/]+(?:\/(?:comments|submitted|posts|overview))?\/?$/;

  // redd.it: any single non-trivial path segment is the short ID.
  const REDD_IT_PATH = /^\/[^/?#]+\/?$/;

  // Match the path against the known forms. Returns { keepParams } describing
  // how to clean, or null if the path isn't recognized.
  function formFor(hostname, pathname) {
    if (REDD_IT_HOST_REGEX.test(hostname)) {
      if (REDD_IT_PATH.test(pathname)) return { keepParams: [] };
      return null;
    }
    for (const p of POST_PATTERNS) {
      if (p.regex.test(pathname)) return { keepParams: p.keepParams };
    }
    if (SUBREDDIT_PATTERN.test(pathname)) {
      return { keepParams: SUBREDDIT_KEEP_PARAMS };
    }
    if (USER_PROFILE_PATTERN.test(pathname)) {
      return { keepParams: SUBREDDIT_KEEP_PARAMS };
    }
    return null;
  }

  function isPostPath(hostname, pathname) {
    // Kept for back-compat; matches the original notion of "post-or-share URL".
    if (REDD_IT_HOST_REGEX.test(hostname)) return REDD_IT_PATH.test(pathname);
    return POST_PATTERNS.some((p) => p.regex.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isRedditHost(url.hostname)) return false;
    return isPostPath(url.hostname, url.pathname);
  }


  // Host-scoped tracking params, stripped on ANY matched-host path that
  // doesn't fit a recognized form above (search pages, profiles, shop
  // pages...). Denylist: functional params always survive.
  const FALLBACK_STRIP = new Set(['share_id', 'correlation_id', 'ref_source', 'ref_campaign']);
  const FALLBACK_PREFIXES = [];

  function fallbackClean(url) {
    const clone = new URL(url.href);
    for (const name of Array.from(clone.searchParams.keys())) {
      const lower = name.toLowerCase();
      if (FALLBACK_STRIP.has(lower) || FALLBACK_PREFIXES.some((p) => lower.startsWith(p))) {
        clone.searchParams.delete(name);
      }
    }
    const hash = clone.hash || '';
    return `${clone.protocol}//${clone.host}${clone.pathname}${clone.search}${hash}`;
  }

  function shortenRedditUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isRedditHost(url.hostname)) return null;
    const form = formFor(url.hostname, url.pathname);
    if (!form) return fallbackClean(url);

    const hash = url.hash || '';
    let query = '';
    if (form.keepParams.length > 0) {
      const params = new URLSearchParams();
      for (const k of form.keepParams) {
        const v = url.searchParams.get(k);
        if (v !== null && v !== '') params.set(k, v);
      }
      const s = params.toString();
      if (s) query = '?' + s;
    }
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
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
    SUBREDDIT_PATTERN,
    USER_PROFILE_PATTERN,
  };
  global.RedditLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
