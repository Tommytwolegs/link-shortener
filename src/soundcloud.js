// soundcloud.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning SoundCloud URLs. Address-bar-only.
//
// Recognized forms:
//
//   /<user>/<track>              → track page
//   /<user>/sets/<playlist>      → playlist page
//   on.soundcloud.com/<code>     → app share short link
//
// DENYLIST strategy for the generic two-segment track form (an accidental
// match can only lose known tracking params): strips si (the app share
// token), ref, p, c, in_system_playlist, utm_* — but PRESERVES `in`
// (playlist-context queue continuity, like Spotify's ?context=).
//
// A blocklist keeps navigational first segments (discover, search, you,
// stream, ...) from being treated as user names.
//
// The URL hash is preserved.
//
// Hosts: soundcloud.com (any subdomain), on.soundcloud.com.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const SOUNDCLOUD_HOST_REGEX = /(?:^|\.)soundcloud\.com$/i;
  const ON_HOST_REGEX = /^on\.soundcloud\.com$/i;

  function isSoundcloudHost(hostname) {
    if (!hostname) return false;
    return SOUNDCLOUD_HOST_REGEX.test(hostname);
  }

  const USER_BLOCKLIST = new Set([
    'discover', 'search', 'you', 'stream', 'upload', 'charts', 'tags',
    'stations', 'pages', 'messages', 'notifications', 'settings', 'pro',
    'premium', 'terms-of-use', 'jobs', 'imprint', 'popular', 'mobile',
    'login', 'signin', 'logout', 'people', 'feed',
  ]);

  const TRACK_REGEX = /^\/([^/?#]+)\/[^/?#]+\/?$/;
  const SET_REGEX = /^\/([^/?#]+)\/sets\/[^/?#]+\/?$/;
  const SHORT_PATH = /^\/[^/?#]+\/?$/;

  function isPostPath(hostname, pathname) {
    if (ON_HOST_REGEX.test(hostname)) return SHORT_PATH.test(pathname);
    let m = SET_REGEX.exec(pathname);
    if (!m) m = TRACK_REGEX.exec(pathname);
    if (!m) return false;
    return !USER_BLOCKLIST.has(m[1].toLowerCase());
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isSoundcloudHost(url.hostname)) return false;
    return isPostPath(url.hostname, url.pathname);
  }

  const TRACKING_PARAMS = new Set(['si', 'ref', 'p', 'c', 'in_system_playlist']);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((pfx) => lower.startsWith(pfx));
  }

  function shortenSoundcloudUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isSoundcloudHost(url.hostname)) return null;
    if (!isPostPath(url.hostname, url.pathname)) return null;

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
    if (!isSoundcloudHost(url.hostname)) return false;
    const cleaned = shortenSoundcloudUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isSoundcloudHost,
    isPostUrl,
    shortenSoundcloudUrl,
    shortenUrl: shortenSoundcloudUrl,
    needsShortening,
    STORAGE_KEY: 'enabledSoundcloud',
    SOUNDCLOUD_HOST_REGEX,
    USER_BLOCKLIST,
    TRACKING_PARAMS,
  };
  global.SoundcloudLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
