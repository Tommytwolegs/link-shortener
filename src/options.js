// options.js
// ----------------------------------------------------------------------------
// Options page controller. Manages two storage.sync fields:
//
//   utmStripSkipDomains: string[]   -- hostnames to skip for the Universal
//                                       strip. Leading dot enables suffix
//                                       match (".example.com" matches
//                                       example.com and subdomains).
//   utmStripKeepParams:  string[]   -- param names (case-insensitive) to
//                                       never strip, even when the
//                                       Universal toggle would otherwise
//                                       remove them.
//
// Both default to empty arrays. The popup gates the Universal strip on a
// permission grant; this page does NOT request or revoke that permission.
// It just configures the behavior when the strip is enabled.
// ----------------------------------------------------------------------------

(function () {
  'use strict';

  // i18n helper: localized string or English fallback.
  const t = (key, fallback, subs) => {
    try {
      const m = chrome.i18n && chrome.i18n.getMessage
        ? chrome.i18n.getMessage(key, subs) : '';
      return m || fallback;
    } catch (_e) {
      return fallback;
    }
  };

  const DEFAULTS = {
    enabledUtmStrip: false,
    enabledActiveStrip: false,
    utmStripSkipDomains: [],
    utmStripKeepParams: [],
  };

  const stripStatusEl = document.getElementById('strip-status');
  const skipDomainsEl = document.getElementById('skip-domains');
  const keepParamsEl = document.getElementById('keep-params');
  const saveBtn = document.getElementById('save');
  const resetBtn = document.getElementById('reset');
  const savedIndicatorEl = document.getElementById('saved-indicator');

  // Parse a textarea value into a normalized array — split on newlines,
  // trim each line, drop empties, drop duplicates (case-insensitive for
  // params, case-insensitive for hosts since hostnames are case-insensitive).
  function parseList(text) {
    const seen = new Set();
    const out = [];
    for (const raw of text.split(/\r?\n/)) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
    }
    return out;
  }

  function setUi(items) {
    // Don't clobber a textarea the user is actively editing — onChanged can
    // fire mid-edit (popup toggle, or a sync write from another device).
    const active = document.activeElement;
    if (active !== skipDomainsEl) {
      skipDomainsEl.value = (items.utmStripSkipDomains || []).join('\n');
    }
    if (active !== keepParamsEl) {
      keepParamsEl.value = (items.utmStripKeepParams || []).join('\n');
    }
    // These lists drive BOTH the Universal strip (address bar) and the
    // Active strip (network layer) -- report whichever is actually on.
    const utmOn = items.enabledUtmStrip === true;
    const activeOn = items.enabledActiveStrip === true;
    if (utmOn && activeOn) {
      stripStatusEl.textContent = t('optStripBothOn',
        'Universal tracking strip and Active strip are both ON.');
      stripStatusEl.classList.add('on');
    } else if (utmOn) {
      stripStatusEl.textContent = t('optStripOn', 'Universal tracking strip is ON.');
      stripStatusEl.classList.add('on');
    } else if (activeOn) {
      stripStatusEl.textContent = t('optStripActiveOnly',
        'Active strip (block before load) is ON. The lists below apply to it; the Universal tracking strip is OFF.');
      stripStatusEl.classList.add('on');
    } else {
      stripStatusEl.textContent = t('optStripOff',
        'Both strips are OFF. Settings below take effect once you enable the Universal tracking strip or "Block trackers before they load" in the toolbar popup.');
      stripStatusEl.classList.remove('on');
    }
  }

  function flashSaved() {
    savedIndicatorEl.textContent = t('optSaved', 'Saved');
    savedIndicatorEl.classList.add('visible');
    setTimeout(() => savedIndicatorEl.classList.remove('visible'), 1500);
  }

  saveBtn.addEventListener('click', () => {
    chrome.storage.sync.set({
      utmStripSkipDomains: parseList(skipDomainsEl.value),
      utmStripKeepParams: parseList(keepParamsEl.value),
    }, () => {
      if (chrome.runtime.lastError) {
        savedIndicatorEl.textContent = 'Error saving: ' + chrome.runtime.lastError.message;
        savedIndicatorEl.classList.add('visible');
        return;
      }
      flashSaved();
    });
  });

  resetBtn.addEventListener('click', () => {
    skipDomainsEl.value = '';
    keepParamsEl.value = '';
    chrome.storage.sync.set({
      utmStripSkipDomains: [],
      utmStripKeepParams: [],
    }, flashSaved);
  });

  // Initial load.
  chrome.storage.sync.get(DEFAULTS, setUi);

  // Track external changes (popup toggling, sync from another device).
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (
      'enabledUtmStrip' in changes ||
      'enabledActiveStrip' in changes ||
      'utmStripSkipDomains' in changes ||
      'utmStripKeepParams' in changes
    ) {
      chrome.storage.sync.get(DEFAULTS, setUi);
    }
  });

  // (The old "General prefs" card is gone: hideTravelPopup moved back into
  // the popup's main switch cluster in v1.12, and keepTitles before it.)

  // -- Stats card -----------------------------------------------------------
  // Read-only view over the local-only counters the background maintains.
  // Device-scoped by design: chrome.storage.local, never sync, never sent.
  (function initStats() {
    const ids = ['urls', 'chars', 'copies', 'skips', 'blocked', 'bulk'];
    const els = {};
    for (const id of ids) els[id] = document.getElementById('stat-' + id);
    const sinceEl = document.getElementById('stat-since');
    const resetBtnEl = document.getElementById('stats-reset');
    const topBox = document.getElementById('top-sites');
    const topList = document.getElementById('top-sites-list');
    if (!els.urls || !chrome.storage || !chrome.storage.local) return;

    function renderStats(s) {
      for (const id of ids) {
        els[id].textContent = (s && s[id] ? s[id] : 0).toLocaleString();
      }
      if (sinceEl) {
        sinceEl.textContent = s && s.since
          ? new Date(s.since).toLocaleDateString()
          : '\u2014';
      }
      if (topBox && topList) {
        topList.textContent = '';
        const entries = s && s.perSite
          ? Object.entries(s.perSite).sort((a, b) => b[1] - a[1]).slice(0, 10)
          : [];
        for (const [site, count] of entries) {
          const li = document.createElement('li');
          const b = document.createElement('b');
          // Storage keys read like enabledYoutube; show the site part.
          b.textContent = site.replace(/^enabled/, '');
          li.appendChild(b);
          li.appendChild(document.createTextNode(' \u2014 ' + count.toLocaleString()));
          topList.appendChild(li);
        }
        topBox.hidden = entries.length === 0;
      }
    }

    chrome.storage.local.get({ stats: null }, (items) => {
      void chrome.runtime.lastError;
      renderStats(items && items.stats);
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && 'stats' in changes) renderStats(changes.stats.newValue);
    });
    if (resetBtnEl) {
      resetBtnEl.addEventListener('click', () => {
        chrome.storage.local.set({
          stats: {
            urls: 0, chars: 0, unwraps: 0, skips: 0, copies: 0, bulk: 0,
            perSite: {}, since: Date.now(),
          },
        }, () => void chrome.runtime.lastError);
      });
    }
  })();

  // -- Backup: export / import ------------------------------------------------
  // Export is the full storage.sync contents; import validates every key
  // against the shapes this extension actually writes before setting
  // anything (unknown keys are dropped, wrong types rejected).
  (function initBackup() {
    const exportBtn = document.getElementById('backup-export');
    const importBtn = document.getElementById('backup-import');
    const fileEl = document.getElementById('backup-file');
    const indicator = document.getElementById('backup-indicator');
    if (!exportBtn || !importBtn || !fileEl || !indicator) return;

    function flash(text, isError) {
      indicator.textContent = text;
      indicator.classList.add('visible');
      indicator.style.color = isError ? '#b42318' : '';
      setTimeout(() => indicator.classList.remove('visible'), 2600);
    }

    // A key is importable when it matches something we'd write ourselves.
    function sanitize(settings) {
      const out = {};
      let n = 0;
      if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return { out, n };
      for (const [k, v] of Object.entries(settings)) {
        if (/^(enabled|enabled[A-Z][A-Za-z0-9]*|includeAmazonTitle|keepTitles|hideTravelPopup)$/.test(k)
            && typeof v === 'boolean') {
          out[k] = v; n++;
        } else if ((k === 'utmStripSkipDomains' || k === 'utmStripKeepParams')
            && Array.isArray(v) && v.every((x) => typeof x === 'string' && x.length < 200)
            && v.length <= 500) {
          out[k] = v; n++;
        } else if (k === 'popupOpenGroups' && v && typeof v === 'object' && !Array.isArray(v)
            && Object.values(v).every((x) => typeof x === 'boolean')
            && Object.keys(v).length <= 50) {
          out[k] = v; n++;
        } else if (k === 'travelPopupPos' && v && typeof v === 'object' && !Array.isArray(v)
            && typeof v.x === 'number' && typeof v.y === 'number'
            && v.x >= 0 && v.x <= 1 && v.y >= 0 && v.y <= 1) {
          out[k] = { x: v.x, y: v.y }; n++;
        } else if (k === 'siteOpts' && window.SiteOpts) {
          // Per-site options map (v1.13): strict-shape sanitize shared with
          // the popup's write path — unknown ids/keys/values are dropped.
          const clean = window.SiteOpts.sanitizeSiteOpts(v);
          if (Object.keys(clean).length) { out[k] = clean; n++; }
        }
      }
      return { out, n };
    }

    exportBtn.addEventListener('click', () => {
      chrome.storage.sync.get(null, (items) => {
        void chrome.runtime.lastError;
        const payload = {
          app: 'rather-link-shortener',
          version: chrome.runtime.getManifest().version,
          exportedAt: new Date().toISOString(),
          settings: items || {},
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rather-link-shortener-settings.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        flash(t('backupExported', 'Exported'));
      });
    });

    importBtn.addEventListener('click', () => fileEl.click());
    fileEl.addEventListener('change', () => {
      const file = fileEl.files && fileEl.files[0];
      fileEl.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        let parsed;
        try {
          parsed = JSON.parse(String(reader.result));
        } catch (_e) {
          flash(t('backupInvalid', 'Not a valid settings file'), true);
          return;
        }
        const settings = parsed && parsed.settings ? parsed.settings : parsed;
        const { out, n } = sanitize(settings);
        if (!n) {
          flash(t('backupInvalid', 'Not a valid settings file'), true);
          return;
        }
        chrome.storage.sync.set(out, () => {
          if (chrome.runtime.lastError) {
            flash(t('backupInvalid', 'Not a valid settings file'), true);
            return;
          }
          chrome.storage.sync.get(DEFAULTS, setUi);
          flash(t('backupImported', 'Imported ' + n + ' settings', [String(n)]));
        });
      };
      reader.readAsText(file);
    });
  })();
})();
