// quora.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Quora share URLs. Address-bar-only.
//
// Recognized forms:
//
//   /<Question-Slug>                     → question page
//   /<Question-Slug>/answer/<answerer>   → specific answer
//   /unanswered/<Question-Slug>          → unanswered-question form
//
// Question slugs are always multi-word ("How-do-X-affect-Y"), so a slug must
// contain at least one hyphen to be recognized — that keeps single-word
// navigational routes (/spaces, /notifications) out. A blocklist guards the
// reserved first segments that could plausibly collide.
//
// Tracking parameters stripped: share (the share=1 from the share button),
// ch, oid, ans_frid, srid, target_type, q_aid — everything; question and
// answer pages carry no functional query state.
//
// The URL hash is preserved.
//
// Hosts: quora.com and any subdomain (www, language subdomains like
// es.quora.com, Space subdomains).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const QUORA_HOST_REGEX = /(?:^|\.)quora\.com$/i;

  function isQuoraHost(hostname) {
    if (!hostname) return false;
    return QUORA_HOST_REGEX.test(hostname);
  }

  // Reserved first path segments that are navigational, not question slugs.
  const SLUG_BLOCKLIST = new Set([
    'profile', 'topic', 'search', 'spaces', 'space', 'q', 'qemail',
    'about', 'careers', 'press', 'contact', 'answer', 'notifications',
    'settings', 'subscriptions', 'following', 'followers', 'drafts',
    'stats', 'content', 'login', 'signup', 'sitemap', 'press-kit',
  ]);

  const QUESTION_SEG = '[^/?#]+-[^/?#]+'; // at least one hyphen

  const QUESTION_PATTERN = new RegExp(`^\\/(${QUESTION_SEG})\\/?$`);
  const ANSWER_PATTERN = new RegExp(`^\\/(${QUESTION_SEG})\\/answer\\/[^/?#]+\\/?$`);
  const UNANSWERED_PATTERN = new RegExp(`^\\/unanswered\\/(${QUESTION_SEG})\\/?$`);

  function isPostPath(pathname) {
    let m = UNANSWERED_PATTERN.exec(pathname);
    if (m) return true;
    m = QUESTION_PATTERN.exec(pathname) || ANSWER_PATTERN.exec(pathname);
    if (!m) return false;
    const firstSeg = m[1].toLowerCase();
    return !SLUG_BLOCKLIST.has(firstSeg);
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isQuoraHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  function shortenQuoraUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isQuoraHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isQuoraHost(url.hostname)) return false;
    const cleaned = shortenQuoraUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isQuoraHost,
    isPostUrl,
    shortenQuoraUrl,
    shortenUrl: shortenQuoraUrl,
    needsShortening,
    STORAGE_KEY: 'enabledQuora',
    QUORA_HOST_REGEX,
    SLUG_BLOCKLIST,
  };
  global.QuoraLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
