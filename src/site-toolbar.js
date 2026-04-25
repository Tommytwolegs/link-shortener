// site-toolbar.js
// ----------------------------------------------------------------------------
// Generic floating "Link Shortener" toolbar for sites where we want
// click-to-copy short URLs rather than (or in addition to) auto-rewriting the
// address bar. Each supported site (agoda, booking, expedia, airbnb, ...)
// loads this module + a small site-specific module that builds a config and
// calls SiteToolbar.init(config).
//
// A config:
//   {
//     siteName: 'Agoda',                   // for diagnostic logging only
//     storageKey: 'enabledAgoda',          // per-site toggle key in
//                                           // chrome.storage.sync (default true)
//     isListingPage: (string) => boolean,  // when true, toolbar appears
//     addressBarShort: (string) => string | null,  // optional auto-shortener
//     buttons: [
//       {
//         label: 'Share Property',
//         shortUrl: (string) => string | null,    // null => button disabled
//         disabledTooltip: 'Pick check-in dates first',  // optional
//       },
//       ...
//     ],
//   }
//
// The toolbar is gated on BOTH the master `enabled` flag and the per-site
// `storageKey` flag (both default true). Either being false hides the toolbar
// and skips address-bar cleanup.
//
// Loaded as a classic content script -- sets `self.SiteToolbar = { init }`.
// All UI lives inside a closed Shadow DOM so the host site's CSS can't reach
// us and our styles can't leak out.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const STYLES = `
    :host { all: initial; }
    .box {
      position: fixed;
      top: 80px;
      left: 12px;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 5px;
      align-items: stretch;
      padding: 8px;
      min-width: 120px;
      background: #ffffff;
      color: #1b2a4e;
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 9px;
      font: 500 12px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.12);
    }
    .label {
      padding: 1px 3px 5px 3px;
      margin-bottom: 1px;
      color: rgba(27, 42, 78, 0.7);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
      text-align: center;
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
    }
    .btn {
      appearance: none;
      border: 0;
      padding: 6px 10px;
      border-radius: 5px;
      background: #FF9900;
      color: #1b2a4e;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      text-align: center;
      transition: background 120ms ease, transform 50ms ease;
    }
    .btn:hover:not(:disabled) { background: #FFAD33; }
    .btn:active:not(:disabled) { transform: translateY(1px); }
    .btn:disabled {
      background: rgba(15, 23, 42, 0.06);
      color: rgba(15, 23, 42, 0.4);
      cursor: not-allowed;
    }
    .btn.copied { background: #0F7B8A; color: #fff; }
  `;

  function init(config) {
    // Master toggle ("Shorten All Links") AND per-site toggle must both be
    // true for the toolbar to appear. Pessimistic defaults until storage
    // resolves so we never flash UI before reading state.
    let masterEnabled = false;
    let siteEnabled = false;
    let hideToolbar = false;
    const siteKey = config.storageKey;

    function isOn() {
      return masterEnabled && siteEnabled;
    }

    let host = null;
    let buttonEls = []; // [{ el, originalLabel, def }]
    let toastTimer = null;
    let lastHref = location.href;

    // -- UI lifecycle ------------------------------------------------------

    function buildUI() {
      if (host) return;
      host = document.createElement('div');
      host.id = 'lso-toolbar-root';
      // Keep the host element invisible to the page's CSS -- everything
      // visible lives inside the shadow root.
      host.style.all = 'initial';

      const shadow = host.attachShadow({ mode: 'closed' });
      const style = document.createElement('style');
      style.textContent = STYLES;
      shadow.appendChild(style);

      const box = document.createElement('div');
      box.className = 'box';

      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = 'Link Shortener';
      box.appendChild(label);

      buttonEls = config.buttons.map((def) => {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.type = 'button';
        btn.textContent = def.label;
        btn.addEventListener('click', () => onCopy(btn, def));
        box.appendChild(btn);
        return { el: btn, originalLabel: def.label, def };
      });

      shadow.appendChild(box);
      // documentElement is always available; body may not be at document_idle
      // on some pages. Either anchor works -- both live for the page lifetime.
      (document.body || document.documentElement).appendChild(host);
    }

    function destroyUI() {
      if (!host) return;
      host.remove();
      host = null;
      buttonEls = [];
      clearTimeout(toastTimer);
      toastTimer = null;
    }

    function refreshButtonStates() {
      for (const { el, def } of buttonEls) {
        const target = def.shortUrl(location.href);
        const btnEnabled = target !== null;
        el.disabled = !btnEnabled;
        el.title = btnEnabled ? '' : (def.disabledTooltip || '');
      }
    }

    // -- Clipboard + toast -------------------------------------------------

    function onCopy(btnEl, def) {
      const url = def.shortUrl(location.href);
      if (!url) return;
      // Clipboard API works in MV3 content scripts on Chrome 102+.
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(
          () => showCopied(btnEl),
          () => legacyCopy(url, btnEl),
        );
      } else {
        legacyCopy(url, btnEl);
      }
    }

    function legacyCopy(url, btnEl) {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
        showCopied(btnEl);
      } catch (_e) {
        // swallow -- nothing useful we can do
      }
      ta.remove();
    }

    function showCopied(btnEl) {
      if (!btnEl) return;
      const found = buttonEls.find((b) => b.el === btnEl);
      if (!found) return;
      btnEl.classList.add('copied');
      btnEl.textContent = 'Copied!';
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        btnEl.classList.remove('copied');
        btnEl.textContent = found.originalLabel;
      }, 1500);
    }

    // -- Address-bar shortening --------------------------------------------

    function cleanAddressBar() {
      if (!isOn()) return;
      if (!config.addressBarShort) return;
      const target = config.addressBarShort(location.href);
      if (!target) return;
      if (target === location.href) return;
      try {
        history.replaceState(history.state, '', target);
      } catch (_e) {
        // swallow -- page may block history mutation in some edge cases
      }
    }

    // -- Reconciliation ----------------------------------------------------

    // Idempotent: decides whether the UI should exist on this URL, syncs it,
    // and (when on a listing page) cleans up the address bar in place. The
    // address-bar cleanup runs even when the floating toolbar is hidden via
    // the master "Hide travel popup" preference -- that toggle only suppresses
    // the floating widget, not URL shortening.
    function reconcile() {
      if (!isOn() || !config.isListingPage(location.href)) {
        destroyUI();
        lastHref = location.href;
        return;
      }
      cleanAddressBar();
      if (hideToolbar) {
        destroyUI();
      } else {
        buildUI();
        refreshButtonStates();
      }
      // Record the post-clean href so the polling watchdog below doesn't
      // immediately fire a redundant reconcile from our own URL change.
      lastHref = location.href;
    }

    // -- Boot --------------------------------------------------------------

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      const defaults = { enabled: true, hideTravelPopup: false };
      if (siteKey) defaults[siteKey] = true;
      chrome.storage.sync.get(defaults, (items) => {
        masterEnabled = items.enabled !== false;
        siteEnabled = siteKey ? items[siteKey] !== false : true;
        hideToolbar = items.hideTravelPopup === true;
        reconcile();
      });
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync') return;
        let touched = false;
        if (Object.prototype.hasOwnProperty.call(changes, 'enabled')) {
          masterEnabled = changes.enabled.newValue !== false;
          touched = true;
        }
        if (siteKey && Object.prototype.hasOwnProperty.call(changes, siteKey)) {
          siteEnabled = changes[siteKey].newValue !== false;
          touched = true;
        }
        if (Object.prototype.hasOwnProperty.call(changes, 'hideTravelPopup')) {
          hideToolbar = changes.hideTravelPopup.newValue === true;
          touched = true;
        }
        if (touched) reconcile();
      });
    } else {
      masterEnabled = true;
      siteEnabled = true;
      hideToolbar = false;
      reconcile();
    }

    // Classic back/forward within the same document.
    window.addEventListener('popstate', reconcile);

    // Service worker nudge on webNavigation history-state updates.
    if (
      typeof chrome !== 'undefined' &&
      chrome.runtime &&
      chrome.runtime.onMessage
    ) {
      chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message && message.type === 'CHECK_URL') {
          reconcile();
          sendResponse({ ok: true });
        }
        return false;
      });
    }

    // Safety-net polling for SPA transitions that don't fire a webNavigation
    // event we can see (calendar pickers, in-page filter changes, etc).
    // Content scripts run in an isolated world so we can't monkey-patch the
    // page's history API directly.
    setInterval(() => {
      if (location.href !== lastHref) {
        lastHref = location.href;
        reconcile();
      }
    }, 500);
  }

  global.SiteToolbar = { init };
})(typeof globalThis !== 'undefined' ? globalThis : this);
