// spotify.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Spotify share URLs. Address-bar-only.
//
// Recognized forms (all on open.spotify.com):
//
//   /track/<id>          → strip query + fragment
//   /album/<id>          → ditto
//   /playlist/<id>       → ditto
//   /artist/<id>         → ditto
//   /episode/<id>        → ditto (podcast episodes)
//   /show/<id>           → ditto (podcast shows)
//   /user/<userid>       → ditto
//   /intl-<lang>/<kind>/<id>  → locale-prefixed; preserved as-is, just the
//                              query is stripped (removing the locale would
//                              technically still resolve, but it changes the
//                              structure and is more invasive than needed).
//
// Hosts: open.spotify.com (the only canonical share host).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const SPOTIFY_HOST_REGEX = /^open\.spotify\.com$/i;

  function isSpotifyHost(hostname) {
    if (!hostname) return false;
    return SPOTIFY_HOST_REGEX.test(hostname);
  }

  const KINDS = '(?:track|album|playlist|artist|episode|show|user|collection)';
  const POST_PATTERNS = [
    new RegExp(`^/${KINDS}/[^/?#]+/?$`),
    // Locale-prefixed (e.g. /intl-de/track/abc123)
    new RegExp(`^/intl-[a-z]{2,3}/${KINDS}/[^/?#]+/?$`, 'i'),
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isSpotifyHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  function shortenSpotifyUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isSpotifyHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;
    return `${url.protocol}//${url.host}${url.pathname}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isSpotifyHost(url.hostname)) return false;
    const cleaned = shortenSpotifyUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isSpotifyHost,
    isPostUrl,
    shortenSpotifyUrl,
    shortenUrl: shortenSpotifyUrl,
    needsShortening,
    STORAGE_KEY: 'enabledSpotify',
    SPOTIFY_HOST_REGEX,
    POST_PATTERNS,
  };
  global.SpotifyLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
