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
      cursor: grab;
      user-select: none;
      touch-action: none;
    }
    .box.dragging { box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2); }
    .box.dragging .label { cursor: grabbing; }
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
      return masterEnabled && siteEnabled && !tabPaused;
    }

    // Per-tab pause (v1.13): asked once per page load; takes full effect
    // after a reload.
    let tabPaused = false;
    try {
      chrome.runtime.sendMessage({ type: 'pause-info' }, (resp) => {
        void chrome.runtime.lastError;
        if (resp && resp.paused === true) tabPaused = true;
      });
    } catch (_e) { /* extension context gone; leave unpaused */ }

    let host = null;
    let boxEl = null;
    let buttonEls = []; // [{ el, originalLabel, def, toastTimer }]
    let pollTimer = null;
    let lastHref = location.href;
    let savedPos = null; // { x, y } viewport fractions (0..1), from storage

    function validPos(v) {
      return v && typeof v === 'object'
        && typeof v.x === 'number' && typeof v.y === 'number'
        && v.x >= 0 && v.x <= 1 && v.y >= 0 && v.y <= 1
        ? { x: v.x, y: v.y } : null;
    }

    // -- Drag-to-move ------------------------------------------------------
    // The header strip doubles as a drag handle. Position persists as
    // viewport FRACTIONS in storage.sync (`travelPopupPos`), so it follows
    // the user across tabs and devices, adapts to different window sizes,
    // and survives the destroy/rebuild cycle reconcile() runs on every SPA
    // navigation. Buttons stay plain clicks: the drag only arms on the
    // header, and only after the pointer travels ~4px, so a sloppy click
    // never teleports the box. Clamped to the viewport on both drag and
    // re-apply -- the box can't be parked off-screen.

    function applyPosition() {
      if (!boxEl || !savedPos) return;
      const w = boxEl.offsetWidth || 140;
      const h = boxEl.offsetHeight || 80;
      const maxL = Math.max(4, window.innerWidth - w - 4);
      const maxT = Math.max(4, window.innerHeight - h - 4);
      boxEl.style.left = Math.round(Math.max(4, Math.min(savedPos.x * maxL, maxL))) + 'px';
      boxEl.style.top = Math.round(Math.max(4, Math.min(savedPos.y * maxT, maxT))) + 'px';
    }

    function attachDrag(handle, box) {
      let startX = 0;
      let startY = 0;
      let baseL = 0;
      let baseT = 0;
      let dragging = false;
      let pid = null;

      handle.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const r = box.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        baseL = r.left;
        baseT = r.top;
        dragging = false;
        pid = e.pointerId;
        try { handle.setPointerCapture(pid); } catch (_e) { /* fine */ }
      });

      handle.addEventListener('pointermove', (e) => {
        if (pid === null || e.pointerId !== pid) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (!dragging && (dx * dx + dy * dy) < 16) return; // 4px arm threshold
        dragging = true;
        box.classList.add('dragging');
        const maxL = Math.max(4, window.innerWidth - box.offsetWidth - 4);
        const maxT = Math.max(4, window.innerHeight - box.offsetHeight - 4);
        box.style.left = Math.round(Math.max(4, Math.min(baseL + dx, maxL))) + 'px';
        box.style.top = Math.round(Math.max(4, Math.min(baseT + dy, maxT))) + 'px';
      });

      const endDrag = (e) => {
        if (pid === null || e.pointerId !== pid) return;
        try { handle.releasePointerCapture(pid); } catch (_e) { /* fine */ }
        pid = null;
        if (!dragging) return;
        dragging = false;
        box.classList.remove('dragging');
        const maxL = Math.max(1, window.innerWidth - box.offsetWidth - 4);
        const maxT = Math.max(1, window.innerHeight - box.offsetHeight - 4);
        const r = box.getBoundingClientRect();
        savedPos = {
          x: Math.max(0, Math.min(1, r.left / maxL)),
          y: Math.max(0, Math.min(1, r.top / maxT)),
        };
        try {
          chrome.storage.sync.set({ travelPopupPos: savedPos });
        } catch (_e) { /* context gone; position still holds on this page */ }
      };
      handle.addEventListener('pointerup', endDrag);
      handle.addEventListener('pointercancel', endDrag);
    }

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
      label.title = 'Drag to move';
      box.appendChild(label);
      attachDrag(label, box);

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
      boxEl = box;
      // documentElement is always available; body may not be at document_idle
      // on some pages. Either anchor works -- both live for the page lifetime.
      (document.body || document.documentElement).appendChild(host);
      applyPosition();
    }

    function destroyUI() {
      if (!host) return;
      host.remove();
      host = null;
      boxEl = null;
      for (const b of buttonEls) clearTimeout(b.toastTimer);
      buttonEls = [];
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
      // Per-button timer — a shared one would cancel the first button's
      // reset when a second button is clicked within the toast window,
      // leaving it stuck on "Copied!".
      clearTimeout(found.toastTimer);
      found.toastTimer = setTimeout(() => {
        btnEl.classList.remove('copied');
        btnEl.textContent = found.originalLabel;
      }, 1500);
    }

    // -- Address-bar shortening --------------------------------------------

    function cleanAddressBar() {
      if (!isOn()) return;
      if (!config.addressBarShort) return;
      // Navigation-API guard (see social-content.js for the full story):
      // mutating history while the page's own SPA transition is in flight
      // aborts that transition and kills the user's click. Skip this pass;
      // the reconciliation loop re-runs and catches up once it settles.
      try {
        if (self.navigation && self.navigation.transition) return;
      } catch (_e) { /* Navigation API absent -- proceed */ }
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
    // The floating toolbar is awkward on phone-sized viewports — it overlaps
    // mobile site UI and the buttons end up too small for comfortable touch
    // targets. Auto-hide on narrow viewports; the user can still flip the
    // "Hide travel popup" toggle off to bring it back, but they're more
    // likely to want it gone. Threshold matches the typical break between
    // tablet (≥600 CSS px) and phone-portrait widths.
    function isNarrowViewport() {
      return typeof window !== 'undefined' && window.innerWidth < 600;
    }

    function reconcile() {
      // Polling only runs while the site is enabled — mirrors
      // social-content.js. (It must run on non-listing pages too, so an
      // SPA navigation INTO a listing page is still detected.)
      if (isOn()) startPolling();
      else stopPolling();
      if (!isOn() || !config.isListingPage(location.href)) {
        destroyUI();
        lastHref = location.href;
        return;
      }
      cleanAddressBar();
      if (hideToolbar || isNarrowViewport()) {
        destroyUI();
      } else {
        buildUI();
        refreshButtonStates();
        // Re-clamp the dragged position: reconcile() also runs on window
        // resize, so a box parked bottom-right stays reachable when the
        // window shrinks.
        applyPosition();
      }
      // Record the post-clean href so the polling watchdog below doesn't
      // immediately fire a redundant reconcile from our own URL change.
      lastHref = location.href;
    }

    // -- Boot --------------------------------------------------------------

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      // Widget visibility = global "Hide travel popup" OR the per-site
      // hideWidget override (siteOpts, resolved by siteopts.js which the
      // manifest injects before this file on every travel site).
      const hideSettings = { hideTravelPopup: false, siteOpts: {} };
      const resolveHide = () => (
        window.SiteOpts && siteKey
          ? window.SiteOpts.resolveHideWidget(siteKey, hideSettings)
          : hideSettings.hideTravelPopup === true
      );
      const defaults = { enabled: true, hideTravelPopup: false, travelPopupPos: null, siteOpts: {} };
      if (siteKey) defaults[siteKey] = true;
      chrome.storage.sync.get(defaults, (items) => {
        masterEnabled = items.enabled !== false;
        siteEnabled = siteKey ? items[siteKey] !== false : true;
        hideSettings.hideTravelPopup = items.hideTravelPopup === true;
        hideSettings.siteOpts = items.siteOpts || {};
        hideToolbar = resolveHide();
        savedPos = validPos(items.travelPopupPos);
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
        let hideTouched = false;
        if (Object.prototype.hasOwnProperty.call(changes, 'hideTravelPopup')) {
          hideSettings.hideTravelPopup = changes.hideTravelPopup.newValue === true;
          hideTouched = true;
        }
        if (Object.prototype.hasOwnProperty.call(changes, 'siteOpts')) {
          hideSettings.siteOpts = changes.siteOpts.newValue || {};
          hideTouched = true;
        }
        if (hideTouched) {
          hideToolbar = resolveHide();
          touched = true;
        }
        if (Object.prototype.hasOwnProperty.call(changes, 'travelPopupPos')) {
          // Position dragged in another tab (or synced from another device):
          // adopt it in place, no full reconcile needed.
          savedPos = validPos(changes.travelPopupPos.newValue);
          applyPosition();
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

    // Re-evaluate on viewport resize so a user who rotates their phone or
    // resizes a desktop window crosses the narrow-viewport threshold cleanly.
    if (typeof window !== 'undefined' && window.addEventListener) {
      let resizeTimer = null;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(reconcile, 150);
      });
    }

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
    // page's history API directly. Skip when the tab is hidden — no URL can
    // have changed without user interaction; visibilitychange catches up.
    // Started/stopped from reconcile() based on the toggles.
    function startPolling() {
      if (pollTimer) return;
      pollTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        if (location.href !== lastHref) {
          lastHref = location.href;
          reconcile();
        }
      }, 500);
    }

    function stopPolling() {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    // When a backgrounded tab returns to the foreground, check immediately
    // in case the URL changed while we were skipping polls.
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) return;
        if (location.href !== lastHref) {
          lastHref = location.href;
          reconcile();
        }
      });
    }
  }

  global.SiteToolbar = { init };
})(typeof globalThis !== 'undefined' ? globalThis : this);
