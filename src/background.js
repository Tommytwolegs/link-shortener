// background.js
// ----------------------------------------------------------------------------
// Service-worker fallback for SPA navigations, plus the UI plumbing for the
// enable/disable toggle.
//
// When the user flips the toggle in the popup we update the toolbar badge
// ("OFF" in red when disabled, empty when enabled) so the state is visible at
// a glance from the browser chrome.
// ----------------------------------------------------------------------------

importScripts('asin.js');

const AMAZON_URL_FILTERS = [
  { hostSuffix: 'amazon.com' },
  { hostSuffix: 'amazon.co.uk' },
  { hostSuffix: 'amazon.ca' },
  { hostSuffix: 'amazon.de' },
  { hostSuffix: 'amazon.fr' },
  { hostSuffix: 'amazon.it' },
  { hostSuffix: 'amazon.es' },
  { hostSuffix: 'amazon.nl' },
  { hostSuffix: 'amazon.se' },
  { hostSuffix: 'amazon.pl' },
  { hostSuffix: 'amazon.com.tr' },
  { hostSuffix: 'amazon.com.au' },
  { hostSuffix: 'amazon.co.jp' },
  { hostSuffix: 'amazon.in' },
  { hostSuffix: 'amazon.sg' },
  { hostSuffix: 'amazon.ae' },
  { hostSuffix: 'amazon.sa' },
  { hostSuffix: 'amazon.eg' },
  { hostSuffix: 'amazon.com.mx' },
  { hostSuffix: 'amazon.com.br' },
  { hostSuffix: 'amazon.com.be' },
];

// -- Enable/disable state -----------------------------------------------------

function applyBadge(enabled) {
  // Empty badge when on (keeps the icon clean); tiny "OFF" pill in red when
  // off so the user can see at a glance whether the extension is active.
  const text = enabled ? '' : 'OFF';
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: '#B00020' });
  chrome.action.setTitle({
    title: enabled
      ? 'Amazon Link Shortener — click to disable'
      : 'Amazon Link Shortener — click to enable',
  });
}

function refreshBadgeFromStorage() {
  chrome.storage.sync.get({ enabled: true }, (items) => {
    applyBadge(items.enabled !== false);
  });
}

chrome.runtime.onInstalled.addListener(refreshBadgeFromStorage);
chrome.runtime.onStartup.addListener(refreshBadgeFromStorage);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && Object.prototype.hasOwnProperty.call(changes, 'enabled')) {
    applyBadge(changes.enabled.newValue !== false);
  }
});

// -- SPA-navigation fallback --------------------------------------------------

function pingTab(tabId, frameId) {
  // frameId 0 = top frame; we only injected into the top frame.
  if (frameId !== 0) return;
  chrome.storage.sync.get({ enabled: true }, (items) => {
    if (items.enabled === false) return; // user turned us off
    chrome.tabs.sendMessage(
      tabId,
      { type: 'CHECK_URL' },
      // Swallow "Receiving end does not exist" errors — they happen when the
      // content script hasn't loaded yet (e.g., chrome:// pages, errored frames).
      () => void chrome.runtime.lastError
    );
  });
}

chrome.webNavigation.onHistoryStateUpdated.addListener(
  (details) => {
    if (!self.AmazonLinkShortener.isAmazonHost(new URL(details.url).hostname)) return;
    pingTab(details.tabId, details.frameId);
  },
  { url: AMAZON_URL_FILTERS }
);

chrome.webNavigation.onCommitted.addListener(
  (details) => {
    if (!self.AmazonLinkShortener.isAmazonHost(new URL(details.url).hostname)) return;
    pingTab(details.tabId, details.frameId);
  },
  { url: AMAZON_URL_FILTERS }
);
