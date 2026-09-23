// siteopts.js
// ----------------------------------------------------------------------------
// Per-site options layer (v1.13). Pure resolvers over the `siteOpts`
// storage map, so site-specific preferences don't each become a new
// global toggle.
//
// Storage shape (storage.sync):
//
//   siteOpts: {
//     <siteKey>: { keepTitles?: 'always'|'never', hideWidget?: true }
//   }
//
// where <siteKey> is the same `enabledXxx` id used by the per-site
// on/off toggles. Only non-default values are stored; empty per-site
// objects are pruned by sanitizeSiteOpts on every write and import.
//
// Resolution rule, everywhere: site override beats global, absence
// falls through to the global setting.
//
//   * keepTitles  — tri-state. 'always'/'never' override the global
//     "Keep item titles in links" switch (which itself still honors the
//     legacy includeAmazonTitle read-either).
//   * hideWidget  — site-level hide for the floating travel widget.
//     true hides the widget on that site even when the global
//     hideTravelPopup switch is off. (There is deliberately no
//     site-level "show" override of a global hide — one mental model:
//     hide wins.) Since v1.14 the GLOBAL default is hidden: an absent
//     hideTravelPopup means hide; only an explicit false shows the
//     widget. Users who never touched the switch get the quieter
//     default; anyone who had un-hidden it keeps their stored false.
//
// Loaded as:
//   * a classic content script (sets `window.SiteOpts`)
//   * a service-worker importScripts target (sets `self.SiteOpts`)
//   * a CommonJS module from Node-based unit tests (`module.exports`)
//
// Keep this file dependency-free so it can run in all three contexts.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  // Same shape policy as the import sanitizer's per-site toggle regex:
  // ids are `enabled` + CamelCase tail. Unknown ids are dropped rather
  // than validated against a live module list, so the sanitizer stays
  // dependency-free (a stale id in storage is harmless — nothing reads it).
  const SITE_KEY_RE = /^enabled[A-Z][A-Za-z0-9]*$/;

  const KEEP_TITLES_VALUES = ['always', 'never'];

  // Strict-shape cleanup for storage writes and settings import. Returns
  // a NEW object containing only known keys with known values; per-site
  // entries that end up empty are pruned.
  function sanitizeSiteOpts(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    for (const id of Object.keys(raw)) {
      if (!SITE_KEY_RE.test(id)) continue;
      const v = raw[id];
      if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
      const clean = {};
      if (KEEP_TITLES_VALUES.indexOf(v.keepTitles) !== -1) clean.keepTitles = v.keepTitles;
      if (v.hideWidget === true) clean.hideWidget = true;
      if (Object.keys(clean).length) out[id] = clean;
    }
    return out;
  }

  function siteOpt(siteKey, settings, key) {
    const so = settings && settings.siteOpts;
    if (!so || typeof so !== 'object') return undefined;
    const v = so[siteKey];
    return v && typeof v === 'object' ? v[key] : undefined;
  }

  // -> boolean. Site tri-state beats the global switch; the global read
  // keeps the keepTitles || includeAmazonTitle legacy behavior.
  function resolveKeepTitles(siteKey, settings) {
    const o = siteOpt(siteKey, settings, 'keepTitles');
    if (o === 'always') return true;
    if (o === 'never') return false;
    return !!(settings
      && (settings.keepTitles === true || settings.includeAmazonTitle === true));
  }

  // -> boolean. Site-level hide ORs with the global hide. The global
  // default is HIDDEN (v1.14): only an explicit false shows the widget.
  function resolveHideWidget(siteKey, settings) {
    if (siteOpt(siteKey, settings, 'hideWidget') === true) return true;
    return !(settings && settings.hideTravelPopup === false);
  }

  const api = {
    SITE_KEY_RE,
    KEEP_TITLES_VALUES,
    sanitizeSiteOpts,
    resolveKeepTitles,
    resolveHideWidget,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.SiteOpts = api;
})(typeof self !== 'undefined' ? self : this);
