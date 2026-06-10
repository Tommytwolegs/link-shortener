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

  const DEFAULTS = {
    enabledUtmStrip: false,
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
    if (items.enabledUtmStrip) {
      stripStatusEl.textContent = 'Universal tracking strip is ON.';
      stripStatusEl.classList.add('on');
    } else {
      stripStatusEl.textContent =
        'Universal tracking strip is OFF. Settings below take effect once you enable the toggle in the toolbar popup.';
      stripStatusEl.classList.remove('on');
    }
  }

  function flashSaved() {
    savedIndicatorEl.textContent = 'Saved';
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
      'utmStripSkipDomains' in changes ||
      'utmStripKeepParams' in changes
    ) {
      chrome.storage.sync.get(DEFAULTS, setUi);
    }
  });
})();
