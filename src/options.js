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

  // -- Recent activity (v1.13) ------------------------------------------------
  // 50-entry local ring buffer the background maintains: hostname, kind,
  // and removed parameter NAMES only — no URLs, no values, never synced.
  (function initHistory() {
    const listEl = document.getElementById('history-list');
    const emptyEl = document.getElementById('history-empty');
    const clearBtn = document.getElementById('history-clear');
    const keepEl = document.getElementById('keep-history');
    if (!listEl || !chrome.storage || !chrome.storage.local) return;

    const KIND_LABELS = {
      rewrite: t('histKindRewrite', 'address bar'),
      active: t('histKindActive', 'blocked before load'),
      skip: t('histKindSkip', 'redirect skipped'),
      copy: t('histKindCopy', 'copy'),
      bulk: t('histKindBulk', 'bulk clean'),
    };

    // Compact timestamp: time only for today's entries, month + day + time
    // for older ones. The full locale string ate half the row width.
    function shortWhen(t) {
      if (!t) return '';
      const d = new Date(t);
      const now = new Date();
      const sameDay = d.getFullYear() === now.getFullYear()
        && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
      const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      return sameDay
        ? time
        : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' + time;
    }

    function renderHistory(list) {
      listEl.textContent = '';
      const entries = Array.isArray(list) ? list : [];
      for (const e of entries) {
        if (!e || typeof e !== 'object') continue;
        const li = document.createElement('li');

        const kind = document.createElement('span');
        kind.className = 'hist-kind hist-kind-' + (e.kind || 'rewrite');
        kind.textContent = KIND_LABELS[e.kind] || KIND_LABELS.rewrite;
        li.appendChild(kind);

        const what = document.createElement('span');
        what.className = 'hist-what';
        if (e.host) {
          const b = document.createElement('b');
          b.textContent = e.host;
          what.appendChild(b);
        }
        let detail = '';
        if (Array.isArray(e.params) && e.params.length) {
          detail = e.params.join(', ');
          if (e.more > 0) detail += ' +' + e.more;
        } else if (typeof e.count === 'number' && e.count > 0) {
          detail = '×' + e.count;
        }
        if (detail) {
          const p = document.createElement('span');
          p.className = 'hist-params';
          p.textContent = (e.host ? ' · ' : '') + detail;
          what.appendChild(p);
        }
        li.appendChild(what);

        const when = document.createElement('span');
        when.className = 'hist-when';
        when.textContent = shortWhen(e.t);
        li.appendChild(when);

        listEl.appendChild(li);
      }
      if (emptyEl) emptyEl.hidden = entries.length !== 0;
    }

    chrome.storage.local.get({ cleanHistory: [] }, (items) => {
      void chrome.runtime.lastError;
      renderHistory(items && items.cleanHistory);
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && 'cleanHistory' in changes) {
        renderHistory(changes.cleanHistory.newValue);
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        chrome.storage.local.set({ cleanHistory: [] }, () => void chrome.runtime.lastError);
      });
    }

    if (keepEl && chrome.storage.sync) {
      chrome.storage.sync.get({ keepHistory: true }, (items) => {
        void chrome.runtime.lastError;
        keepEl.checked = items.keepHistory !== false;
      });
      keepEl.addEventListener('change', () => {
        chrome.storage.sync.set({ keepHistory: keepEl.checked });
        // Turning collection off also empties the buffer — the setting is
        // "keep", not "pause".
        if (!keepEl.checked) {
          chrome.storage.local.set({ cleanHistory: [] }, () => void chrome.runtime.lastError);
        }
      });
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && 'keepHistory' in changes) {
          keepEl.checked = changes.keepHistory.newValue !== false;
        }
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
        if (/^(enabled|enabled[A-Z][A-Za-z0-9]*|includeAmazonTitle|keepTitles|hideTravelPopup|showBadge|keepHistory)$/.test(k)
            && typeof v === 'boolean') {
          out[k] = v; n++;
        } else if ((k === 'utmStripSkipDomains' || k === 'utmStripKeepParams' || k === 'autoCleanDomains')
            && Array.isArray(v) && v.every((x) => typeof x === 'string' && x.length < 200)
            && v.length <= 500) {
          // autoCleanDomains: imported hosts without a matching permission
          // grant are pruned by the background's registration sync, so an
          // import can never silently enable auto-clean anywhere.
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

  // --- Bookmark cleaner (v1.14) --------------------------------------------
  // One-shot: borrows the optional `bookmarks` permission on click, scans
  // every bookmark through the same pipeline as the bulk cleaner (dry run,
  // so nothing is counted until the user applies), shows a preview, applies
  // on confirmation, and hands the permission straight back.
  (function initBookmarkCleaner() {
    const scanBtn = document.getElementById('bmk-scan');
    const applyBtn = document.getElementById('bmk-apply');
    const statusEl = document.getElementById('bmk-status');
    const previewEl = document.getElementById('bmk-preview');
    if (!scanBtn || !applyBtn || !statusEl || !previewEl) return;

    let plan = null; // [{ id, from, to, title }]

    function releasePermission() {
      try {
        chrome.permissions.remove({ permissions: ['bookmarks'] }, () => {
          void chrome.runtime.lastError;
        });
      } catch (_e) { /* older Firefox: leaving it granted is harmless */ }
    }

    function hostOf(u) {
      try { return new URL(u).hostname.replace(/^www\./, ''); } catch (_e) { return ''; }
    }

    function flatten(nodes, out) {
      for (const n of nodes || []) {
        if (n.url && /^https?:/i.test(n.url)) {
          out.push({ id: n.id, url: n.url, title: n.title || '' });
        }
        if (n.children) flatten(n.children, out);
      }
      return out;
    }

    // Chunked round-trips to stay under the handler's per-message cap.
    function cleanBatch(urls, dryRun) {
      const merged = {};
      let p = Promise.resolve();
      for (let i = 0; i < urls.length; i += 1000) {
        const chunk = urls.slice(i, i + 1000);
        p = p.then(() => new Promise((resolve) => {
          chrome.runtime.sendMessage(
            { type: 'clean-links-batch', urls: chunk, source: 'bookmarks', dryRun: !!dryRun },
            (resp) => {
              void chrome.runtime.lastError;
              if (resp && resp.map) Object.assign(merged, resp.map);
              resolve();
            }
          );
        }));
      }
      return p.then(() => merged);
    }

    function renderPreview(changes) {
      previewEl.replaceChildren();
      const MAX_SHOWN = 20;
      for (const c of changes.slice(0, MAX_SHOWN)) {
        const li = document.createElement('li');
        const name = document.createElement('strong');
        name.textContent = c.title || hostOf(c.from);
        const detail = document.createElement('span');
        detail.className = 'hist-params';
        detail.textContent = ' ' + hostOf(c.from) + ' (-' +
          Math.max(0, c.from.length - c.to.length) + ')';
        li.append(name, detail);
        previewEl.appendChild(li);
      }
      if (changes.length > MAX_SHOWN) {
        const li = document.createElement('li');
        li.className = 'hist-params';
        li.textContent = '+' + (changes.length - MAX_SHOWN);
        previewEl.appendChild(li);
      }
      previewEl.hidden = false;
    }

    scanBtn.addEventListener('click', () => {
      statusEl.textContent = '';
      applyBtn.hidden = true;
      previewEl.hidden = true;
      plan = null;
      chrome.permissions.request({ permissions: ['bookmarks'] }, (granted) => {
        void chrome.runtime.lastError;
        if (!granted || !chrome.bookmarks) {
          statusEl.textContent = t('bmkDenied', 'Bookmark access was declined.');
          return;
        }
        scanBtn.disabled = true;
        statusEl.textContent = t('bmkScanning', 'Scanning...');
        chrome.bookmarks.getTree((tree) => {
          void chrome.runtime.lastError;
          const all = flatten(tree, []);
          const urls = Array.from(new Set(all.map((b) => b.url)));
          cleanBatch(urls, true).then((map) => {
            scanBtn.disabled = false;
            const changes = all
              .filter((b) => map[b.url] && map[b.url] !== b.url)
              .map((b) => ({ id: b.id, from: b.url, to: map[b.url], title: b.title }));
            if (!changes.length) {
              statusEl.textContent = t('bmkNone',
                'All clean. None of your ' + all.length + ' bookmarks carry tracking junk.',
                [String(all.length)]);
              releasePermission();
              return;
            }
            plan = changes;
            statusEl.textContent = t('bmkFound',
              changes.length + ' of ' + all.length + ' bookmarks can be cleaned:',
              [String(changes.length), String(all.length)]);
            renderPreview(changes);
            applyBtn.textContent = t('bmkClean',
              'Clean ' + changes.length + ' bookmarks', [String(changes.length)]);
            applyBtn.hidden = false;
          });
        });
      });
    });

    applyBtn.addEventListener('click', () => {
      if (!plan || !plan.length || !chrome.bookmarks) return;
      const changes = plan;
      plan = null;
      applyBtn.disabled = true;
      scanBtn.disabled = true;
      // Non-dry pass over just the changed originals: records stats and one
      // history entry with the real count, and re-derives the targets.
      cleanBatch(changes.map((c) => c.from), false).then((freshMap) => {
        let done = 0;
        let p = Promise.resolve();
        for (const c of changes) {
          const target = freshMap[c.from] || c.to;
          if (!target || target === c.from) continue;
          p = p.then(() => new Promise((resolve) => {
            chrome.bookmarks.update(c.id, { url: target }, () => {
              if (!chrome.runtime.lastError) done++;
              resolve();
            });
          }));
        }
        p.then(() => {
          applyBtn.disabled = false;
          scanBtn.disabled = false;
          applyBtn.hidden = true;
          previewEl.hidden = true;
          statusEl.textContent = t('bmkDone',
            'Cleaned ' + done + ' bookmarks. Bookmark access has been handed back.',
            [String(done)]);
          releasePermission();
        });
      });
    });
  })();
})();
