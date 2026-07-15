// i18n.js
// ----------------------------------------------------------------------------
// Tiny declarative localizer for the extension's HTML pages (popup,
// Advanced settings, bulk cleaner). Elements opt in with data attributes:
//
//   data-i18n='key'              -> textContent
//   data-i18n-html='key'         -> innerHTML (catalog strings with inline
//                                    <em>/<strong> markup; developer-authored)
//   data-i18n-placeholder='key'  -> placeholder attribute
//   data-i18n-title='key'        -> title (and aria-label when present)
//
// The English source text stays in the HTML as the fallback: when the
// active locale has no message for a key (or i18n is unavailable),
// nothing is touched. Loaded before the page's own script.
// ----------------------------------------------------------------------------

(function () {
  'use strict';

  function apply() {
    if (typeof chrome === 'undefined' || !chrome.i18n || !chrome.i18n.getMessage) return;
    for (const el of document.querySelectorAll('[data-i18n]')) {
      const msg = chrome.i18n.getMessage(el.getAttribute('data-i18n'));
      if (msg) el.textContent = msg;
    }
    for (const el of document.querySelectorAll('[data-i18n-html]')) {
      const msg = chrome.i18n.getMessage(el.getAttribute('data-i18n-html'));
      // Catalog messages are developer-authored (reviewed, shipped in the
      // package) -- never user input. They carry inline <em>/<strong>
      // markup, so parse in an inert document and adopt the nodes rather
      // than assigning innerHTML.
      if (msg) {
        const doc = new DOMParser().parseFromString(msg, 'text/html');
        el.replaceChildren(...doc.body.childNodes);
      }
    }
    for (const el of document.querySelectorAll('[data-i18n-placeholder]')) {
      const msg = chrome.i18n.getMessage(el.getAttribute('data-i18n-placeholder'));
      if (msg) el.setAttribute('placeholder', msg);
    }
    for (const el of document.querySelectorAll('[data-i18n-tip]')) {
      const msg = chrome.i18n.getMessage(el.getAttribute('data-i18n-tip'));
      if (msg) {
        el.setAttribute('data-tip', msg);
        if (el.hasAttribute('aria-label')) el.setAttribute('aria-label', msg);
      }
    }
    for (const el of document.querySelectorAll('[data-i18n-title]')) {
      const msg = chrome.i18n.getMessage(el.getAttribute('data-i18n-title'));
      if (msg) {
        el.setAttribute('title', msg);
        if (el.hasAttribute('aria-label')) el.setAttribute('aria-label', msg);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }
})();
