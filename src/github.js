// github.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning GitHub share URLs. Address-bar-only.
//
// Recognized forms (tight allowlist — GitHub uses functional query params on
// many routes, so only unambiguous permalink shapes are cleaned):
//
//   /<owner>/<repo>/issues/<number>          → issue permalink
//   /<owner>/<repo>/pull/<number>            → pull-request permalink
//   /<owner>/<repo>/discussions/<number>     → discussion permalink
//   /<owner>/<repo>/commit/<sha>             → commit permalink
//   /<owner>/<repo>/releases/tag/<tag>       → release page
//
// Tracking parameters stripped: notification_referrer_id (added when you
// open an issue/PR from the notifications inbox), notifications_query,
// email_source, email_token — everything; none of these forms carries
// reader-facing query state.
//
// NOT recognized (on purpose): repo home (?tab=), file views (?plain=1),
// /pull/<n>/files (?diff=split&w=1), issue lists (?q=is%3Aopen) — those
// query params are all functional.
//
// The URL hash is preserved — it does the heavy lifting on GitHub
// (#issuecomment-<id>, #discussion_r<id>, #pullrequestreview-<id>,
// #diff-<hash>, #L10-L20).
//
// Hosts: github.com, www.github.com (subdomains like gist.github.com have
// different URL shapes and are out of scope).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const GITHUB_HOST_REGEX = /^(?:www\.)?github\.com$/i;

  function isGithubHost(hostname) {
    if (!hostname) return false;
    return GITHUB_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/[^/]+\/[^/]+\/issues\/\d+\/?$/,
    /^\/[^/]+\/[^/]+\/pull\/\d+\/?$/,
    /^\/[^/]+\/[^/]+\/discussions\/\d+\/?$/,
    /^\/[^/]+\/[^/]+\/commit\/[0-9a-f]{7,40}\/?$/i,
    /^\/[^/]+\/[^/]+\/releases\/tag\/[^/?#]+\/?$/,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isGithubHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  function shortenGithubUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isGithubHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isGithubHost(url.hostname)) return false;
    const cleaned = shortenGithubUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isGithubHost,
    isPostUrl,
    shortenGithubUrl,
    shortenUrl: shortenGithubUrl,
    needsShortening,
    STORAGE_KEY: 'enabledGithub',
    GITHUB_HOST_REGEX,
    POST_PATTERNS,
  };
  global.GithubLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
