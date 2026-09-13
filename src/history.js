// history.js
// ----------------------------------------------------------------------------
// Pure helpers for the local "what got stripped" activity history (v1.13).
//
// Privacy is enforced STRUCTURALLY here: makeEntry has fields for a
// hostname, a kind, parameter NAMES, and numbers — there is no field for
// a full URL or a parameter value, so nothing upstream can accidentally
// store one. The list lives in chrome.storage.local only (never sync),
// newest first, capped at MAX entries.
//
// Entry shape:
//   { t: epoch-ms, host: 'example.com', kind: 'rewrite'|'active'|'skip'|
//     'copy'|'bulk', params?: ['utm_source', ...] (≤ MAX_PARAMS),
//     more?: n (params beyond the cap), count?: n, chars?: n }
//
// Loaded as:
//   * a service-worker importScripts target (sets `self.HistoryLog`)
//   * a classic page script on options.html (sets `window.HistoryLog`)
//   * a CommonJS module from Node-based unit tests (`module.exports`)
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const MAX = 50;
  const MAX_PARAMS = 8;
  const KINDS = ['rewrite', 'active', 'skip', 'copy', 'bulk'];

  // Hostname-only extraction; returns '' when the input isn't a URL.
  function hostOf(url) {
    try {
      return new URL(url).hostname;
    } catch (_e) {
      return '';
    }
  }

  // Names of query params present on `before` and gone from `after`.
  // NAMES only, deduped, order of first appearance. Used to describe a
  // rewrite/active-block in the history without storing the URLs.
  function removedParamNames(before, after) {
    let b;
    let a;
    try {
      b = new URL(before);
      a = new URL(after);
    } catch (_e) {
      return [];
    }
    const afterNames = new Set();
    for (const [k] of a.searchParams) afterNames.add(k);
    const out = [];
    const seen = new Set();
    for (const [k] of b.searchParams) {
      if (!afterNames.has(k) && !seen.has(k)) {
        seen.add(k);
        out.push(k);
      }
    }
    return out;
  }

  // Build a minimized entry. Unknown kinds are coerced to 'rewrite';
  // params are capped with an overflow count; empty/zero fields are
  // omitted so the stored list stays small.
  function makeEntry(opts) {
    const o = opts || {};
    const e = {
      t: typeof o.t === 'number' ? o.t : Date.now(),
      host: typeof o.host === 'string' ? o.host.slice(0, 128) : '',
      kind: KINDS.indexOf(o.kind) !== -1 ? o.kind : 'rewrite',
    };
    if (Array.isArray(o.params) && o.params.length) {
      const names = o.params
        .filter((p) => typeof p === 'string' && p.length > 0)
        .map((p) => p.slice(0, 64));
      if (names.length) {
        e.params = names.slice(0, MAX_PARAMS);
        if (names.length > MAX_PARAMS) e.more = names.length - MAX_PARAMS;
      }
    }
    if (typeof o.count === 'number' && o.count > 0) e.count = o.count;
    if (typeof o.chars === 'number' && o.chars > 0) e.chars = o.chars;
    return e;
  }

  // Newest-first push with cap. Returns a NEW array; never mutates.
  function push(list, entry, max) {
    const cap = typeof max === 'number' && max > 0 ? max : MAX;
    const base = Array.isArray(list) ? list : [];
    return [entry].concat(base).slice(0, cap);
  }

  const api = { MAX, MAX_PARAMS, KINDS, hostOf, removedParamNames, makeEntry, push };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.HistoryLog = api;
})(typeof self !== 'undefined' ? self : this);
