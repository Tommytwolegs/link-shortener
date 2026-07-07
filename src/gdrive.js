// gdrive.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Google Drive / Docs / Sheets / Slides / Forms
// share links. Address-bar-only.
//
//   docs.google.com/document|spreadsheets|presentation/d/<id>/edit|view|preview
//   docs.google.com/forms/d/e/<id>/viewform
//   docs.google.com/<kind>/d/e/<id>/pub|pubhtml   (published docs)
//   drive.google.com/file/d/<id>/view|preview
//   drive.google.com/drive/[u/<n>/]folders/<id>
//
// Stripped: usp (share-source attribution: usp=sharing/drive_link/drivesdk),
// ts, urp, sd, dls — and notably `ouid`, which is the SHARING USER'S account
// id (a small privacy leak on every copied link).
//
// PRESERVED: `resourcekey` (REQUIRED for access to many pre-2021 shared
// files — stripping it breaks the link entirely), `gid` (sheet-tab
// selector), `range`, `disco` (comment-thread deep links — the URL a
// "comment" notification email opens), `tab` (document-tab deep links,
// t.<id>), and on published sheets `single`/`widget`/`headers`.
// The hash is preserved (#gid=..., #heading=h.abc, #fvid=...).
//
// Hosts: docs.google.com and drive.google.com exactly — no other Google
// property is ever touched.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const GDRIVE_HOST_REGEX = /^(?:docs|drive)\.google\.com$/i;

  function isGdriveHost(hostname) {
    if (!hostname) return false;
    return GDRIVE_HOST_REGEX.test(hostname);
  }

  const FORMS = [
    // Editor docs (document/spreadsheets/presentation/forms) — /d/<id>/...
    { pattern: /^\/(?:document|spreadsheets|presentation|forms)\/d\/[^/]+(?:\/(?:edit|view|preview|copy|htmlview))?\/?$/,
      keepParams: ['resourcekey', 'gid', 'range', 'disco', 'tab'] },
    // Published docs — /d/e/<id>/pub|pubhtml|viewform
    { pattern: /^\/(?:document|spreadsheets|presentation)\/d\/e\/[^/]+\/(?:pub|pubhtml)\/?$/,
      keepParams: ['resourcekey', 'gid', 'single', 'widget', 'headers'] },
    { pattern: /^\/forms\/d\/e\/[^/]+\/viewform\/?$/,
      keepParams: ['resourcekey'] },
    // Drive files and folders
    { pattern: /^\/file\/d\/[^/]+(?:\/(?:view|preview|edit))?\/?$/,
      keepParams: ['resourcekey'] },
    { pattern: /^\/drive\/(?:u\/\d+\/)?folders\/[^/?#]+\/?$/,
      keepParams: ['resourcekey'] },
  ];

  function formFor(pathname) {
    for (const f of FORMS) {
      if (f.pattern.test(pathname)) return f;
    }
    return null;
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isGdriveHost(url.hostname)) return false;
    return formFor(url.pathname) !== null;
  }

  function shortenGdriveUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isGdriveHost(url.hostname)) return null;
    const form = formFor(url.pathname);
    if (!form) return null;

    const params = new URLSearchParams();
    for (const k of form.keepParams) {
      const v = url.searchParams.get(k);
      if (v !== null && v !== '') params.set(k, v);
    }
    const q = params.toString();
    const query = q ? '?' + q : '';
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isGdriveHost(url.hostname)) return false;
    const cleaned = shortenGdriveUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isGdriveHost,
    isPostUrl,
    shortenGdriveUrl,
    shortenUrl: shortenGdriveUrl,
    needsShortening,
    STORAGE_KEY: 'enabledGdrive',
    GDRIVE_HOST_REGEX,
    FORMS,
  };
  global.GdriveLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
