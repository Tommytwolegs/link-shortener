// bulk.js
// ----------------------------------------------------------------------------
// Bulk paste-cleaner page controller. The page itself does no URL logic:
// the pasted text goes to the background service worker, which runs every
// http(s) URL inside it through the exact same pipeline as the right-click
// menu (redirect unwrap -> per-site shortener -> UTM strip, honoring the
// user's keep-params list) and returns the rewritten text plus counts.
// Zero network requests, like everything else here.
// ----------------------------------------------------------------------------

(function () {
  'use strict';

  const t = (key, fallback, subs) => {
    try {
      const m = chrome.i18n && chrome.i18n.getMessage
        ? chrome.i18n.getMessage(key, subs) : '';
      return m || fallback;
    } catch (_e) {
      return fallback;
    }
  };

  const inEl = document.getElementById('bulk-in');
  const outEl = document.getElementById('bulk-out');
  const cleanBtn = document.getElementById('bulk-clean');
  const copyBtn = document.getElementById('bulk-copy');
  const statusEl = document.getElementById('bulk-status');
  if (!inEl || !outEl || !cleanBtn || !copyBtn || !statusEl) return;

  inEl.focus();

  function setStatus(text, hold) {
    statusEl.textContent = text;
    statusEl.classList.add('visible');
    statusEl.classList.toggle('visible-hold', !!hold);
  }

  cleanBtn.addEventListener('click', () => {
    const text = inEl.value;
    if (!text.trim()) {
      setStatus(t('bulkEmpty', 'Nothing to clean yet'));
      setTimeout(() => statusEl.classList.remove('visible'), 1800);
      return;
    }
    cleanBtn.disabled = true;
    chrome.runtime.sendMessage({ type: 'bulk-clean', text }, (result) => {
      void chrome.runtime.lastError;
      cleanBtn.disabled = false;
      if (!result || typeof result.text !== 'string') {
        setStatus(t('bulkError', 'Something went wrong; try again'), true);
        return;
      }
      outEl.value = result.text;
      outEl.hidden = false;
      copyBtn.disabled = false;
      setStatus(t('bulkStatus',
        'Cleaned ' + result.changed + ' of ' + result.found + ' links, removed '
        + result.saved.toLocaleString() + ' characters',
        [String(result.changed), String(result.found), result.saved.toLocaleString()]), true);
    });
  });

  copyBtn.addEventListener('click', () => {
    const done = () => {
      if (!copyBtn.dataset.label) copyBtn.dataset.label = copyBtn.textContent;
      copyBtn.textContent = t('copied', 'Copied ✓');
      setTimeout(() => { copyBtn.textContent = copyBtn.dataset.label; }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(outEl.value).then(done, done);
    } else {
      outEl.select();
      try { document.execCommand('copy'); } catch (_e) {}
      done();
    }
  });
})();
