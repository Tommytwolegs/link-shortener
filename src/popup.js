// popup.js
// ----------------------------------------------------------------------------
// Toolbar popup controller. Reads/writes the master `enabled` flag plus a
// per-site flag for each supported site (Amazon, Agoda, Booking, Expedia,
// Airbnb) in chrome.storage.sync. The background service worker and content
// scripts observe storage.onChanged and react on their own.
//
// Storage shape (all booleans):
//   enabled            -- master "Shorten All Links" toggle (default true)
//   hideTravelPopup    -- if true, suppresses the floating toolbar on hotel
//                         sites; URL-bar shortening still runs (default false)
//   enabledAmazon      -- per-site (default true)
//   enabledAgoda       -- per-site (default true)
//   enabledBooking     -- per-site (default true)
//   enabledExpedia     -- per-site (default true)
//   enabledAirbnb      -- per-site (default true)
// ----------------------------------------------------------------------------

(function () {
  'use strict';

  const SITE_KEYS = [
    'enabledAmazon',
    'enabledAgoda',
    'enabledBooking',
    'enabledExpedia',
    'enabledAirbnb',
  ];

  // Default-true for everything so a fresh install has the extension fully on.
  // hideTravelPopup defaults FALSE so the floating toolbar shows by default --
  // it's an opt-in suppression.
  const DEFAULTS = { enabled: true, hideTravelPopup: false };
  for (const k of SITE_KEYS) DEFAULTS[k] = true;

  const masterEl = document.getElementById('enabled');
  const hidePopupEl = document.getElementById('hideTravelPopup');
  const status = document.getElementById('status');
  const versionEl = document.getElementById('version');
  const siteTogglesEl = document.getElementById('site-toggles');

  // Map of storageKey -> checkbox element.
  const siteEls = {};
  for (const k of SITE_KEYS) siteEls[k] = document.getElementById(k);

  function siteLabelFromKey(key) {
    // 'enabledBooking' -> 'Booking', then map to user-facing display name.
    const raw = key.replace(/^enabled/, '');
    return raw === 'Booking' ? 'Booking.com' : raw;
  }

  function setStatusText(state) {
    if (!state.enabled) {
      status.textContent = 'Off -- links left as-is';
      status.classList.remove('on');
      status.classList.add('off');
      return;
    }
    const activeSites = SITE_KEYS
      .filter((k) => state[k] !== false)
      .map(siteLabelFromKey);

    status.classList.add('on');
    status.classList.remove('off');

    if (activeSites.length === SITE_KEYS.length) {
      // All sites on -- compact, friendly status with italicized "some".
      status.innerHTML = 'On <em>some</em> sites';
      return;
    }
    let text;
    if (activeSites.length === 0) {
      text = 'On -- but no sites enabled';
    } else if (activeSites.length === 1) {
      text = 'On -- ' + activeSites[0] + ' only';
    } else {
      text = 'On -- ' + activeSites.join(', ');
    }
    status.textContent = text;
  }

  function setUi(state) {
    masterEl.checked = state.enabled !== false;
    hidePopupEl.checked = state.hideTravelPopup === true;
    for (const k of SITE_KEYS) {
      siteEls[k].checked = state[k] !== false;
    }
    // Per-site toggles are visually disabled (and non-interactive) when the
    // master is off. Their stored state is preserved so it comes back exactly
    // as the user left it when the master is flipped on again.
    siteTogglesEl.classList.toggle('disabled', state.enabled === false);
    setStatusText(state);
  }

  // Initial load.
  chrome.storage.sync.get(DEFAULTS, (items) => {
    setUi(items);
  });

  // Master toggle.
  masterEl.addEventListener('change', () => {
    chrome.storage.sync.set({ enabled: masterEl.checked });
  });

  // "Hide travel popup" -- suppresses the floating toolbar widget on hotel
  // sites. Independent of the master and per-site toggles.
  hidePopupEl.addEventListener('change', () => {
    chrome.storage.sync.set({ hideTravelPopup: hidePopupEl.checked });
  });

  // Per-site toggles.
  for (const k of SITE_KEYS) {
    siteEls[k].addEventListener('change', () => {
      chrome.storage.sync.set({ [k]: siteEls[k].checked });
    });
  }

  // React to storage changes from anywhere -- including the popup's own
  // writes (so the status line stays in sync without us having to maintain a
  // parallel in-memory state). Fetches fresh full state to avoid races.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const touchesUs = Object.prototype.hasOwnProperty.call(changes, 'enabled')
      || Object.prototype.hasOwnProperty.call(changes, 'hideTravelPopup')
      || SITE_KEYS.some((k) => Object.prototype.hasOwnProperty.call(changes, k));
    if (!touchesUs) return;
    chrome.storage.sync.get(DEFAULTS, (items) => setUi(items));
  });

  // Show the extension's own version in the footer -- keeps the popup honest
  // about which build is running, useful for bug reports.
  try {
    const { version } = chrome.runtime.getManifest();
    versionEl.textContent = 'v' + version;
  } catch (_e) {
    // runtime not available (e.g. opened as a plain HTML file) -- skip.
  }
})();
