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
    { key: 'enabledGoogle', group: 'global' },
    { key: 'enabledGdrive', group: 'global' },
    { key: 'enabledAmazon', group: 'global' },
    { key: 'enabledEbay', group: 'global' },
    { key: 'enabledEtsy', group: 'global' },
    { key: 'enabledAliexpress', group: 'global' },
    { key: 'enabledTemu', group: 'global' },
    { key: 'enabledWayfair', group: 'global' },
    { key: 'enabledShein', group: 'global' },
    { key: 'enabledBooking', group: 'global' },
    { key: 'enabledExpedia', group: 'global' },
    { key: 'enabledAirbnb', group: 'global' },
    { key: 'enabledAgoda', group: 'global' },
    { key: 'enabledTrip', group: 'global' },
    { key: 'enabledHotelscom', group: 'global' },
    { key: 'enabledVrbo', group: 'global' },
    { key: 'enabledTripadvisor', group: 'global' },
    { key: 'enabledSocial', group: 'global' },
    { key: 'enabledThreads', group: 'global' },
    { key: 'enabledLinkedin', group: 'global' },
    { key: 'enabledTwitter', group: 'global' },
    { key: 'enabledTiktok', group: 'global' },
    { key: 'enabledReddit', group: 'global' },
    { key: 'enabledBluesky', group: 'global' },
    { key: 'enabledPinterest', group: 'global' },
    { key: 'enabledYoutube', group: 'global' },
    { key: 'enabledSpotify', group: 'global' },
    { key: 'enabledTwitch', group: 'global' },
    { key: 'enabledSoundcloud', group: 'global' },
    { key: 'enabledAppleMusic', group: 'global' },
    { key: 'enabledSteam', group: 'global' },
    { key: 'enabledImdb', group: 'global' },
    { key: 'enabledGoodreads', group: 'global' },
    { key: 'enabledWikipedia', group: 'global' },
    { key: 'enabledStackoverflow', group: 'global' },
    { key: 'enabledGithub', group: 'global' },
    { key: 'enabledMedium', group: 'global' },
    { key: 'enabledQuora', group: 'global' },
    { key: 'enabledSubstack', group: 'global' },
    { key: 'enabledBandcamp', group: 'global' },
    { key: 'enabledLetterboxd', group: 'global' },
    { key: 'enabledNetflix', group: 'global' },
    { key: 'enabledRoblox', group: 'global' },
    { key: 'enabledBilibili', group: 'global' },
    { key: 'enabledFandom', group: 'global' },
    { key: 'enabledWalmart', group: 'americas' },
    { key: 'enabledTarget', group: 'americas' },
    { key: 'enabledMercadolibre', group: 'americas' },
    { key: 'enabledBestbuy', group: 'americas' },
    { key: 'enabledShopee', group: 'apac' },
    { key: 'enabledLazada', group: 'apac' },
    { key: 'enabledTokopedia', group: 'apac' },
    { key: 'enabledCoupang', group: 'apac' },
    { key: 'enabledFlipkart', group: 'apac' },
    { key: 'enabledMercari', group: 'apac' },
    { key: 'enabledRakuten', group: 'apac' },
    { key: 'enabledMeesho', group: 'apac' },
    { key: 'enabledCarousell', group: 'apac' },
    { key: 'enabledTaobao', group: 'apac' },
    { key: 'enabledJd', group: 'apac' },
    { key: 'enabledVinted', group: 'europe' },
    { key: 'enabledAllegro', group: 'europe' },
    { key: 'enabledLeboncoin', group: 'europe' },
    { key: 'enabledOlx', group: 'europe' },
    { key: 'enabledWallapop', group: 'europe' },
    { key: 'enabledMarktplaats', group: 'europe' },
    { key: 'enabledKleinanzeigen', group: 'europe' },
    { key: 'enabledZalando', group: 'europe' },
    { key: 'enabledNewsNyt', group: 'news' },
    { key: 'enabledNewsWapo', group: 'news' },
    { key: 'enabledNewsWsj', group: 'news' },
    { key: 'enabledNewsBloomberg', group: 'news' },
    { key: 'enabledNewsCnn', group: 'news' },
    { key: 'enabledNewsFox', group: 'news' },
    { key: 'enabledNewsNpr', group: 'news' },
    { key: 'enabledNewsCbc', group: 'news' },
    { key: 'enabledNewsGlobemail', group: 'news' },
    { key: 'enabledNewsGlobo', group: 'news' },
    { key: 'enabledNewsClarin', group: 'news' },
    { key: 'enabledNewsInfobae', group: 'news' },
    { key: 'enabledNewsGuardian', group: 'news' },
    { key: 'enabledNewsBbc', group: 'news' },
    { key: 'enabledNewsDailymail', group: 'news' },
    { key: 'enabledNewsTelegraph', group: 'news' },
    { key: 'enabledNewsIndependent', group: 'news' },
    { key: 'enabledNewsFt', group: 'news' },
    { key: 'enabledNewsEconomist', group: 'news' },
    { key: 'enabledNewsLemonde', group: 'news' },
    { key: 'enabledNewsLefigaro', group: 'news' },
    { key: 'enabledNewsFrance24', group: 'news' },
    { key: 'enabledNewsEuronews', group: 'news' },
    { key: 'enabledNewsDw', group: 'news' },
    { key: 'enabledNewsSpiegel', group: 'news' },
    { key: 'enabledNewsBild', group: 'news' },
    { key: 'enabledNewsElpais', group: 'news' },
    { key: 'enabledNewsElmundo', group: 'news' },
    { key: 'enabledNewsCorriere', group: 'news' },
    { key: 'enabledNewsRepubblica', group: 'news' },
    { key: 'enabledNewsToi', group: 'news' },
    { key: 'enabledNewsThehindu', group: 'news' },
    { key: 'enabledNewsNdtv', group: 'news' },
    { key: 'enabledNewsIndianexpress', group: 'news' },
    { key: 'enabledNewsAsahi', group: 'news' },
    { key: 'enabledNewsNikkei', group: 'news' },
    { key: 'enabledNewsNhk', group: 'news' },
    { key: 'enabledNewsScmp', group: 'news' },
    { key: 'enabledNewsStraitstimes', group: 'news' },
    { key: 'enabledNewsCna', group: 'news' },
    { key: 'enabledNewsAbcAu', group: 'news' },
    { key: 'enabledNewsSmh', group: 'news' },
    { key: 'enabledNewsNewscomau', group: 'news' },
    { key: 'enabledNewsChosun', group: 'news' },
    { key: 'enabledNewsAljazeera', group: 'news' },
    { key: 'enabledNewsTimesofisrael', group: 'news' },
    { key: 'enabledNewsHaaretz', group: 'news' },
    { key: 'enabledNewsArabnews', group: 'news' },
    { key: 'enabledNewsNews24', group: 'news' },
    { key: 'enabledNewsReuters', group: 'news' },
    { key: 'enabledNewsAp', group: 'news' },
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
    global: document.getElementById('group-count-global'),
    americas: document.getElementById('group-count-americas'),
    apac: document.getElementById('group-count-apac'),
    europe: document.getElementById('group-count-europe'),
    news: document.getElementById('group-count-news'),
  };

  const SITE_LABELS = {
    Google: 'Google Search',
    Gdrive: 'Google Drive/Docs',
    NewsNyt: 'New York Times',
    NewsWapo: 'Washington Post',
    NewsWsj: 'Wall Street Journal',
    NewsBloomberg: 'Bloomberg',
    NewsCnn: 'CNN',
    NewsFox: 'Fox News',
    NewsNpr: 'NPR',
    NewsCbc: 'CBC',
    NewsGlobemail: 'The Globe and Mail',
    NewsGlobo: 'Globo',
    NewsClarin: 'Clarín',
    NewsInfobae: 'Infobae',
    NewsGuardian: 'The Guardian',
    NewsBbc: 'BBC',
    NewsDailymail: 'Daily Mail',
    NewsTelegraph: 'The Telegraph',
    NewsIndependent: 'The Independent',
    NewsFt: 'Financial Times',
    NewsEconomist: 'The Economist',
    NewsLemonde: 'Le Monde',
    NewsLefigaro: 'Le Figaro',
    NewsFrance24: 'France 24',
    NewsEuronews: 'Euronews',
    NewsDw: 'DW',
    NewsSpiegel: 'Der Spiegel',
    NewsBild: 'Bild',
    NewsElpais: 'El País',
    NewsElmundo: 'El Mundo',
    NewsCorriere: 'Corriere della Sera',
    NewsRepubblica: 'la Repubblica',
    NewsToi: 'Times of India',
    NewsThehindu: 'The Hindu',
    NewsNdtv: 'NDTV',
    NewsIndianexpress: 'Indian Express',
    NewsAsahi: 'Asahi Shimbun',
    NewsNikkei: 'Nikkei',
    NewsNhk: 'NHK',
    NewsScmp: 'South China Morning Post',
    NewsStraitstimes: 'The Straits Times',
    NewsCna: 'CNA',
    NewsAbcAu: 'ABC News (AU)',
    NewsSmh: 'Sydney Morning Herald',
    NewsNewscomau: 'news.com.au',
    NewsChosun: 'Chosun Ilbo',
    NewsAljazeera: 'Al Jazeera',
    NewsTimesofisrael: 'Times of Israel',
    NewsHaaretz: 'Haaretz',
    NewsArabnews: 'Arab News',
    NewsNews24: 'News24',
    NewsReuters: 'Reuters',
    NewsAp: 'Associated Press',
  };

  function siteLabelFromKey(key) {
    const raw = key.replace(/^enabled/, '');
    if (SITE_LABELS[raw]) return SITE_LABELS[raw];
    if (raw === 'Booking') return 'Booking.com';
    if (raw === 'Social') return 'Facebook/Instagram';
    if (raw === 'Youtube') return 'YouTube';
    if (raw === 'Twitter') return 'Twitter/X';
    if (raw === 'Tiktok') return 'TikTok';
    if (raw === 'Linkedin') return 'LinkedIn';
    if (raw === 'Ebay') return 'eBay';
    if (raw === 'Github') return 'GitHub';
    if (raw === 'Aliexpress') return 'AliExpress';
    if (raw === 'Mercadolibre') return 'Mercado Libre';
    if (raw === 'Trip') return 'Trip.com';
    if (raw === 'Hotelscom') return 'Hotels.com';
    if (raw === 'Imdb') return 'IMDb';
    if (raw === 'Stackoverflow') return 'Stack Overflow';
    if (raw === 'Soundcloud') return 'SoundCloud';
    if (raw === 'AppleMusic') return 'Apple Music';
    if (raw === 'Bestbuy') return 'Best Buy';
    if (raw === 'Taobao') return 'Taobao/Tmall';
    if (raw === 'Jd') return 'JD.com';
    if (raw === 'Olx') return 'OLX';
    if (raw === 'Shein') return 'SHEIN';
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
    const totals = { global: 0, americas: 0, apac: 0, europe: 0, news: 0 };
    const ons = { global: 0, americas: 0, apac: 0, europe: 0, news: 0 };
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

  // -- Category group-state persistence ------------------------------------
  // Remember which <details> groups the user expanded, in
  // chrome.storage.sync (popupOpenGroups: { shopping, travel, social }).
  // Programmatic restores also fire 'toggle' (asynchronously), so saves are
  // suppressed until shortly after the restore pass has applied.
  const groupEls = Array.from(
    document.querySelectorAll('details.site-group[data-group]'),
  );
  let restoringGroups = true;
  // While a filter query is active we force-open matching groups; those
  // programmatic toggles must not be persisted as the user's preference.
  let filtering = false;

  function saveGroupState() {
    if (restoringGroups || filtering) return;
    const state = {};
    for (const el of groupEls) state[el.dataset.group] = el.open;
    chrome.storage.sync.set({ popupOpenGroups: state });
  }

  for (const el of groupEls) {
    el.addEventListener('toggle', saveGroupState);
  }

  chrome.storage.sync.get({ popupOpenGroups: null }, (items) => {
    const saved = items.popupOpenGroups;
    if (saved && typeof saved === 'object') {
      for (const el of groupEls) {
        if (Object.prototype.hasOwnProperty.call(saved, el.dataset.group)) {
          el.open = saved[el.dataset.group] === true;
        }
      }
    }
    // <details> toggle events fire on a queued task, so lift the suppression
    // on a short delay — the restore's own toggles land before this runs.
    setTimeout(() => { restoringGroups = false; }, 50);
  });

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

  // -- Current page: clean-URL preview + copy button --------------------------
  // Asks the background (which has every URL module loaded) to clean the
  // active tab's URL through the same pipeline as the context menu and the
  // keyboard shortcut. Hidden entirely on non-http(s) pages.
  (function initCurrentPage() {
    const section = document.getElementById('current-page');
    const urlEl = document.getElementById('current-url');
    const noteEl = document.getElementById('current-note');
    const btn = document.getElementById('copy-clean');
    if (!section || !urlEl || !noteEl || !btn || !chrome.tabs) return;

    function paramCount(u) {
      try { return Array.from(new URL(u).searchParams.keys()).length; } catch (_e) { return 0; }
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      void chrome.runtime.lastError;
      const tab = tabs && tabs[0];
      const original = tab && tab.url;
      if (!original || !/^https?:/i.test(original)) return;
      chrome.runtime.sendMessage({ type: 'clean-url', url: original }, (resp) => {
        void chrome.runtime.lastError;
        const cleaned = (resp && resp.cleaned) || original;
        urlEl.textContent = cleaned;
        urlEl.title = cleaned;
        if (cleaned === original) {
          noteEl.textContent = 'Already clean';
          noteEl.classList.remove('dirty');
        } else {
          const removed = paramCount(original) - paramCount(cleaned);
          noteEl.textContent = removed > 0
            ? 'Removes ' + removed + ' tracking param' + (removed === 1 ? '' : 's')
            : 'Shortens this URL';
          noteEl.classList.add('dirty');
        }
        section.hidden = false;

        btn.addEventListener('click', () => {
          const done = () => {
            btn.textContent = 'Copied \u2713';
            btn.classList.add('copied');
            setTimeout(() => {
              btn.textContent = 'Copy clean URL';
              btn.classList.remove('copied');
            }, 1400);
          };
          function legacyCopy(t) {
            const ta = document.createElement('textarea');
            ta.value = t;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            try { document.execCommand('copy'); } catch (_e) {}
            ta.remove();
          }
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(cleaned).then(done, () => { legacyCopy(cleaned); done(); });
          } else {
            legacyCopy(cleaned);
            done();
          }
        });
      });
    });
  })();

  // -- Site filter --------------------------------------------------------------
  // Live-filters the per-site toggle rows by label text. Groups with matches
  // are force-opened (without persisting that state — see `filtering`);
  // groups with none are hidden. Clearing the query restores the user's
  // pre-filter open/closed arrangement. Esc clears.
  (function initSiteFilter() {
    const input = document.getElementById('site-filter');
    if (!input) return;
    const rows = [];
    for (const k of SITE_KEYS) {
      const el = siteEls[k];
      if (!el) continue;
      const row = el.closest('label.switch');
      if (!row) continue;
      const labelEl = row.querySelector('.switch-label');
      rows.push({
        row,
        text: ((labelEl && labelEl.textContent) || '').toLowerCase(),
        group: el.dataset.group,
      });
    }
    let preFilterOpen = null;

    function applyFilter() {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        siteTogglesEl.classList.remove('filtering');
        for (const r of rows) r.row.classList.remove('filter-hidden');
        for (const el of groupEls) {
          el.classList.remove('filter-hidden');
          if (preFilterOpen && Object.prototype.hasOwnProperty.call(preFilterOpen, el.dataset.group)) {
            el.open = preFilterOpen[el.dataset.group];
          }
        }
        preFilterOpen = null;
        // Restoration fires 'toggle' on a queued task; lift the save
        // suppression after those land (same trick as the initial restore).
        setTimeout(() => { if (!input.value.trim()) filtering = false; }, 50);
        return;
      }
      if (preFilterOpen === null) {
        preFilterOpen = {};
        for (const el of groupEls) preFilterOpen[el.dataset.group] = el.open;
      }
      filtering = true;
      siteTogglesEl.classList.add('filtering');
      const groupHits = {};
      for (const r of rows) {
        const hit = r.text.indexOf(q) !== -1;
        r.row.classList.toggle('filter-hidden', !hit);
        if (hit) groupHits[r.group] = (groupHits[r.group] || 0) + 1;
      }
      for (const el of groupEls) {
        const hits = groupHits[el.dataset.group] || 0;
        el.classList.toggle('filter-hidden', hits === 0);
        if (hits > 0) el.open = true;
      }
    }

    input.addEventListener('input', applyFilter);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && input.value) {
        input.value = '';
        applyFilter();
        e.stopPropagation();
      }
    });
  })();
})();
