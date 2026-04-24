// popup.js
// ----------------------------------------------------------------------------
// Toolbar popup controller. Just reads/writes the `enabled` flag in
// chrome.storage.sync; the background service worker and content script
// observe storage.onChanged and react on their own.
// ----------------------------------------------------------------------------

(function () {
  'use strict';

  const checkbox = document.getElementById('enabled');
  const status = document.getElementById('status');
  const versionEl = document.getElementById('version');

  function setUi(enabled) {
    checkbox.checked = enabled;
    status.textContent = enabled
      ? 'On — cleaning Amazon URLs'
      : 'Off — Amazon URLs left as-is';
    status.classList.toggle('on', enabled);
    status.classList.toggle('off', !enabled);
  }

  chrome.storage.sync.get({ enabled: true }, (items) => {
    setUi(items.enabled !== false);
  });

  checkbox.addEventListener('change', () => {
    const enabled = checkbox.checked;
    setUi(enabled); // optimistic, feels snappy
    chrome.storage.sync.set({ enabled });
  });

  // Show the extension's own version in the footer — keeps the popup honest
  // about which build is running, useful for bug reports.
  try {
    const { version } = chrome.runtime.getManifest();
    versionEl.textContent = 'v' + version;
  } catch (_e) {
    // runtime not available (e.g. opened as a plain HTML file) — skip.
  }
})();
