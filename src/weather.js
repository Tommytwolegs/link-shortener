// weather.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Weather.com URLs. Address-bar-only.
//
// Forecast pages carry their identity in the PATH (locale + product +
// place id): weather.com/weather/tenday/l/<placeId>. The query string is
// almost entirely partner and campaign attribution. DENYLIST strategy —
// strip only documented junk, on any path:
//
//   par                    — partner attribution (par=google, par=samsung...)
//   cm_ven/cm_cat/cm_pla/cm_ite — Coremetrics campaign attribution
//   traffic_source         — self-describing
//
// ...plus the universal utm_* / fbclid / gclid click junk. Functional
// params (units/temp overrides, anything unrecognized) survive.
//
// The URL hash is preserved.
//
// Hosts: weather.com and any subdomain.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const WEATHER_HOST_REGEX = /(?:^|\.)weather\.com$/i;

  function isWeatherHost(hostname) {
    if (!hostname) return false;
    return WEATHER_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'par', 'cm_ven', 'cm_cat', 'cm_pla', 'cm_ite', 'traffic_source',
    'fbclid', 'gclid',
  ]);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  // "Post" here = any Weather.com URL carrying at least one strippable param.
  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isWeatherHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenWeatherUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isWeatherHost(url.hostname)) return null;

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
    if (!isWeatherHost(url.hostname)) return false;
    const cleaned = shortenWeatherUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isWeatherHost,
    isPostUrl,
    shortenWeatherUrl,
    shortenUrl: shortenWeatherUrl,
    needsShortening,
    STORAGE_KEY: 'enabledWeather',
    WEATHER_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.WeatherLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
