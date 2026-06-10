// popup.js
// ----------------------------------------------------------------------------
// Toolbar popup controller. Reads/writes the master `enabled` flag, the
// feature flags, and a per-site flag for each supported site in
// chrome.storage.sync. The background service worker and content scripts
// observe storage.onChanged and react on their own.
//
// Storage shape (all booleans):
//   enabled             -- master "Shorten All Links" toggle (default true)
//   hideTravelPopup     -- if true, suppresses the floating toolbar on hotel
//                          sites; URL-bar shortening still runs (default false)
//   includeAmazonTitle  -- if true, Amazon URLs are shortened to
//                          /<title-slug>/dp/ASIN instead of bare /dp/ASIN
//                          (default false)
//   enabledUtmStrip     -- if true, the Universal tracking strip runs on every
//                          http(s) page, stripping utm_*, gclid, fbclid, etc.
//                          regardless of host. Default FALSE: opt-in because
//                          this requests the broader *://*/* host permission.
//                          The popup requests the permission via
//                          chrome.permissions.request when the user flips
//                          this toggle on, and reverts the toggle if denied.
//   enabledAmazon …     -- per-site toggles (each default true)
// ----------------------------------------------------------------------------

(function () {
  'use strict';

  // Per-site toggle metadata. `group` matches the data-group attribute on the
  // checkbox in popup.html and the group-count-<id> element ID.
  const SITES = [
    { key: 'enabledAmazon',    group: 'shopping' },
    { key: 'enabledEbay',      group: 'shopping' },
    { key: 'enabledEtsy',      group: 'shopping' },
    { key: 'enabledWalmart',   group: 'shopping' },
    { key: 'enabledTarget',    group: 'shopping' },
    { key: 'enabledAgoda',     group: 'travel' },
    { key: 'enabledBooking',   group: 'travel' },
    { key: 'enabledExpedia',   group: 'travel' },
    { key: 'enabledAirbnb',    group: 'travel' },
    { key: 'enabledSocial',    group: 'social' },
    { key: 'enabledThreads',   group: 'social' },
    { key: 'enabledLinkedin',  group: 'social' },
    { key: 'enabledYoutube',   group: 'social' },
    { key: 'enabledTwitter',   group: 'social' },
    { key: 'enabledTiktok',    group: 'social' },
    { key: 'enabledReddit',    group: 'social' },
    { key: 'enabledPinterest', group: 'social' },
    { key: 'enabledSpotify',   group: 'social' },
  ];
  const SITE_KEYS = SITES.map((s) => s.key);

  const DEFAULTS = {
    enabled: true,
    hideTravelPopup: false,
    includeAmazonTitle: false,
    enabledUtmStrip: false,
  };
  for (const k of SITE_KEYS) DEFAULTS[k] = true;

  const masterEl = document.getElementById('enabled');
  const hidePopupEl = document.getElementById('hideTravelPopup');
  const includeTitleEl = document.getElementById('includeAmazonTitle');
  const utmStripEl = document.getElementById('enabledUtmStrip');
  const status = document.getElementById('status');
  const versionEl = document.getElementById('version');
  const siteTogglesEl = document.getElementById('site-toggles');

  // Map of storageKey -> checkbox element.
  const siteEls = {};
  for (const k of SITE_KEYS) siteEls[k] = document.getElementById(k);

  // Group-count summary elements (next to each <details><summary>).
  const groupCountEls = {
    shopping: document.getElementById('group-count-shopping'),
    travel: document.getElementById('group-count-travel'),
    social: document.getElementById('group-count-social'),
  };

  function siteLabelFromKey(key) {
    const raw = key.replace(/^enabled/, '');
    if (raw === 'Booking') return 'Booking.com';
    if (raw === 'Social') return 'Facebook/Instagram';
    if (raw === 'Youtube') return 'YouTube';
    if (raw === 'Twitter') return 'Twitter/X';
    if (raw === 'Tiktok') return 'TikTok';
    if (raw === 'Linkedin') return 'LinkedIn';
    if (raw === 'Ebay') return 'eBay';
    return raw;
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
    const utmActive = state.enabledUtmStrip === true;

    status.classList.add('on');
    status.classList.remove('off');

    // Special case: nothing actually active under the master.
    if (activeSites.length === 0 && !utmActive) {
      status.textContent = 'On -- but nothing enabled';
      return;
    }
    // Per-site description fragment.
    let sitesFrag;
    if (activeSites.length === SITE_KEYS.length) {
      sitesFrag = 'all sites';
    } else if (activeSites.length === 0) {
      sitesFrag = null;
    } else if (activeSites.length === 1) {
      sitesFrag = activeSites[0] + ' only';
    } else if (activeSites.length <= 3) {
      sitesFrag = activeSites.join(', ');
    } else {
      sitesFrag = activeSites.length + ' sites';
    }
    // Combine site fragment with universal-strip fragment.
    if (utmActive && sitesFrag) {
      // "On — all sites + universal" / "On — 5 sites + universal"
      if (sitesFrag === 'all sites') {
        status.innerHTML = 'On <em>everywhere</em> + universal';
      } else {
        status.textContent = 'On -- ' + sitesFrag + ' + universal';
      }
    } else if (utmActive) {
      status.textContent = 'On -- universal only';
    } else if (sitesFrag === 'all sites') {
      // Every per-site toggle is on (universal strip off).
      status.innerHTML = 'On <em>all</em> sites';
    } else {
      status.textContent = 'On -- ' + sitesFrag;
    }
  }

  // Update the "N of M" indicators next to each category summary.
  function setGroupCounts(state) {
    const totals = { shopping: 0, travel: 0, social: 0 };
    const ons = { shopping: 0, travel: 0, social: 0 };
    for (const s of SITES) {
      totals[s.group] += 1;
      if (state[s.key] !== false) ons[s.group] += 1;
    }
    for (const g of Object.keys(groupCountEls)) {
      const el = groupCountEls[g];
      if (!el) continue;
      el.textContent = ons[g] + ' of ' + totals[g] + ' on';
    }
  }

  function setUi(state) {
    masterEl.checked = state.enabled !== false;
    hidePopupEl.checked = state.hideTravelPopup === true;
    includeTitleEl.checked = state.includeAmazonTitle === true;
    utmStripEl.checked = state.enabledUtmStrip === true;
    for (const k of SITE_KEYS) {
      if (siteEls[k]) siteEls[k].checked = state[k] !== false;
    }
    siteTogglesEl.classList.toggle('disabled', state.enabled === false);
    setStatusText(state);
    setGroupCounts(state);
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

  // "Include Amazon item name" -- when on, Amazon URLs are rewritten to
  // /<slug>/dp/ASIN instead of /dp/ASIN. Affects Amazon only.
  includeTitleEl.addEventListener('change', () => {
    chrome.storage.sync.set({ includeAmazonTitle: includeTitleEl.checked });
  });

  // "Universal tracking strip" -- gated on the optional *://*/* host
  // permission. When the user flips this on, we request the permission
  // first; if they decline, we revert the checkbox to off and don't
  // touch storage. When they flip off, we just write storage (the
  // permission stays granted at the OS level so re-enabling later
  // doesn't re-prompt).
  utmStripEl.addEventListener('change', () => {
    if (utmStripEl.checked) {
      chrome.permissions.request({ origins: ['*://*/*'] }, (granted) => {
        if (!granted) {
          // User declined the permission prompt. Revert UI; don't write storage.
          utmStripEl.checked = false;
          return;
        }
        chrome.storage.sync.set({ enabledUtmStrip: true });
      });
    } else {
      chrome.storage.sync.set({ enabledUtmStrip: false });
    }
  });

  // Per-site toggles.
  for (const k of SITE_KEYS) {
    if (siteEls[k]) {
      siteEls[k].addEventListener('change', () => {
        chrome.storage.sync.set({ [k]: siteEls[k].checked });
      });
    }
  }

  // React to storage changes from anywhere.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const touchesUs = Object.prototype.hasOwnProperty.call(changes, 'enabled')
      || Object.prototype.hasOwnProperty.call(changes, 'hideTravelPopup')
      || Object.prototype.hasOwnProperty.call(changes, 'includeAmazonTitle')
      || Object.prototype.hasOwnProperty.call(changes, 'enabledUtmStrip')
      || SITE_KEYS.some((k) => Object.prototype.hasOwnProperty.call(changes, k));
    if (!touchesUs) return;
    chrome.storage.sync.get(DEFAULTS, (items) => setUi(items));
  });

  // Show the extension's own version in the footer.
  try {
    const { version } = chrome.runtime.getManifest();
    versionEl.textContent = 'v' + version;
  } catch (_e) {
    // runtime not available; skip.
  }

  // "Advanced" footer link -> open the options page (rendered inline by the
  // browser when options_ui.open_in_tab is false).
  const advancedLinkEl = document.getElementById('open-options');
  if (advancedLinkEl) {
    advancedLinkEl.addEventListener('click', (e) => {
      e.preventDefault();
      if (chrome.runtime && chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      }
    });
  }
})();
