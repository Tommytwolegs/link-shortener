// spotify.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Spotify share URLs. Address-bar-only.
//
// Recognized forms (all on open.spotify.com):
//
//   /track/<id>          → keeps ?t= (timestamp); strips si, utm_*, etc.
//   /episode/<id>        → keeps ?t= (podcast moment-share); strips the rest
//   /album/<id>          → strips all query params
//   /playlist/<id>       → ditto
//   /artist/<id>         → ditto
//   /show/<id>           → ditto (podcast show)
//   /user/<id>           → ditto
//   /collection/<id>     → ditto
//   /intl-<lang>/<kind>/<id>  → locale-prefixed; same allowlist per kind.
//   /embed/<kind>/<id>   → embed player URLs. Keeps ?theme= (the embed's
//                          visual theme — functional) and ?t= on track/episode;
//                          strips utm_source=generator and the rest.
//
// The URL hash is preserved. Spotify doesn't use hashes for tracking, and a
// future redesign that adopts hash routing won't be broken by us.
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

  // Per-form patterns and allowed query params. The `t` param is a timestamp
  // in seconds (e.g. ?t=600 = jump to 10:00); Spotify uses it on tracks and
  // podcast episodes for "share at this moment". Everything else is tracking
  // or session-bound state and gets stripped.
  const FORMS = [
    // Tracks — keep timestamp + context (the context URI determines what
    // plays after this track ends: ?context=spotify:playlist:<id> means
    // "queue up the rest of <playlist>". Without it, the track plays in
    // isolation regardless of how the user encountered it.)
    { pattern: /^\/track\/[^/?#]+\/?$/i, allowedParams: new Set(['t', 'context']) },
    { pattern: /^\/intl-[a-z]{2,3}\/track\/[^/?#]+\/?$/i, allowedParams: new Set(['t', 'context']) },
    // Podcast episodes — keep timestamp (this is the big one — podcast
    // listeners often share a specific moment) + context for show continuity
    { pattern: /^\/episode\/[^/?#]+\/?$/i, allowedParams: new Set(['t', 'context']) },
    { pattern: /^\/intl-[a-z]{2,3}\/episode\/[^/?#]+\/?$/i, allowedParams: new Set(['t', 'context']) },
    // Embed player forms — ?theme= is functional (visual theme); ?t= is the
    // timestamp on playable kinds. utm_source=generator etc. gets stripped.
    { pattern: /^\/embed\/(?:track|episode)\/[^/?#]+\/?$/i, allowedParams: new Set(['t', 'theme']) },
    { pattern: /^\/embed\/(?:album|playlist|artist|show)\/[^/?#]+\/?$/i, allowedParams: new Set(['theme']) },
    // Everything else — strip all params
    { pattern: /^\/(?:album|playlist|artist|show|user|collection)\/[^/?#]+\/?$/i, allowedParams: new Set() },
    { pattern: /^\/intl-[a-z]{2,3}\/(?:album|playlist|artist|show|user|collection)\/[^/?#]+\/?$/i, allowedParams: new Set() },
  ];

  function formFor(pathname) {
    for (const f of FORMS) {
      if (f.pattern.test(pathname)) return f;
    }
    return null;
  }

  function isPostPath(pathname) {
    return formFor(pathname) !== null;
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isSpotifyHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }


  // Host-scoped tracking params, stripped on ANY matched-host path that
  // doesn't fit a recognized form above (search pages, profiles, shop
  // pages...). Denylist: functional params always survive.
  const FALLBACK_STRIP = new Set(['si', 'nd', 'fbclid', 'gclid']);
  const FALLBACK_PREFIXES = ['utm_'];

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

  function shortenSpotifyUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isSpotifyHost(url.hostname)) return null;
    const form = formFor(url.pathname);
    if (!form) return fallbackClean(url);

    const hash = url.hash || '';
    let query = '';
    if (form.allowedParams.size > 0) {
      const params = new URLSearchParams();
      for (const k of form.allowedParams) {
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
    FORMS,
  };
  global.SpotifyLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
