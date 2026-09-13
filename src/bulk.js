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

  // -- File drop / picker (v1.13) ---------------------------------------------
  // Read a local text-ish file into the input box. FileReader only — the
  // file never leaves the device, same as everything else on this page.
  // .html files are reduced to their links first (href + visible text),
  // parsed inertly with DOMParser: nothing in the file can run.
  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  const pickBtn = document.getElementById('bulk-pick');
  const fileEl = document.getElementById('bulk-file');

  function htmlToLinkText(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const lines = [];
    const seen = new Set();
    for (const a of doc.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href') || '';
      if (!/^https?:/i.test(href) || seen.has(href)) continue;
      seen.add(href);
      const label = (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120);
      lines.push(label ? label + ' - ' + href : href);
    }
    // Visible text can carry bare URLs too (newsletters love those).
    const bodyText = doc.body ? doc.body.textContent || '' : '';
    for (const m of bodyText.matchAll(/https?:\/\/[^\s<>"')\]]+/g)) {
      if (!seen.has(m[0])) {
        seen.add(m[0]);
        lines.push(m[0]);
      }
    }
    return lines.join('\n');
  }

  function loadFile(file) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setStatus(t('bulkTooBig', 'File is too big (limit 5 MB)'), true);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || '');
      const isHtml = /\.html?$/i.test(file.name) || /^\s*</.test(raw.slice(0, 200));
      inEl.value = isHtml ? htmlToLinkText(raw) : raw;
      outEl.hidden = true;
      copyBtn.disabled = true;
      cleanBtn.click();
    };
    reader.onerror = () => setStatus(t('bulkError', 'Something went wrong; try again'), true);
    reader.readAsText(file);
  }

  if (pickBtn && fileEl) {
    pickBtn.addEventListener('click', () => fileEl.click());
    fileEl.addEventListener('change', () => {
      loadFile(fileEl.files && fileEl.files[0]);
      fileEl.value = '';
    });
  }

  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    document.body.classList.add('dragging');
  });
  document.addEventListener('dragleave', (e) => {
    if (e.target === document.body || e.relatedTarget === null) {
      document.body.classList.remove('dragging');
    }
  });
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    document.body.classList.remove('dragging');
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) loadFile(file);
  });
})();
