// background.js
// ----------------------------------------------------------------------------
// Service worker:
//   • Watches `chrome.webNavigation` events on Amazon, Agoda, Booking,
//     Expedia, and Airbnb tabs and pings the appropriate content script when
//     a history-state update happens, so SPA transitions get picked up
//     without a full reload.
//   • Keeps the toolbar badge in sync with the enable/disable toggle — empty
//     when on, "OFF" in red when off.
//   • On extension update, reloads matching open tabs so they pick up the
//     new content scripts (otherwise orphaned scripts ignore new flags like
//     hideTravelPopup).
// ----------------------------------------------------------------------------

importScripts(
  'asin.js',
  'agoda.js',
  'booking.js',
  'expedia.js',
  'airbnb.js',
);

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

const AGODA_URL_FILTERS = [{ hostSuffix: 'agoda.com' }];

const BOOKING_URL_FILTERS = [{ hostSuffix: 'booking.com' }];

const EXPEDIA_URL_FILTERS = [
  { hostSuffix: 'expedia.com' },
  { hostSuffix: 'expedia.co.uk' },
  { hostSuffix: 'expedia.ca' },
  { hostSuffix: 'expedia.com.au' },
  { hostSuffix: 'expedia.de' },
  { hostSuffix: 'expedia.fr' },
  { hostSuffix: 'expedia.it' },
  { hostSuffix: 'expedia.es' },
  { hostSuffix: 'expedia.nl' },
  { hostSuffix: 'expedia.com.mx' },
  { hostSuffix: 'expedia.com.br' },
  { hostSuffix: 'expedia.co.jp' },
  { hostSuffix: 'expedia.com.sg' },
  { hostSuffix: 'expedia.co.in' },
];

const AIRBNB_URL_FILTERS = [
  { hostSuffix: 'airbnb.com' },
  { hostSuffix: 'airbnb.co.uk' },
  { hostSuffix: 'airbnb.ca' },
  { hostSuffix: 'airbnb.com.au' },
  { hostSuffix: 'airbnb.de' },
  { hostSuffix: 'airbnb.fr' },
  { hostSuffix: 'airbnb.it' },
  { hostSuffix: 'airbnb.es' },
  { hostSuffix: 'airbnb.nl' },
  { hostSuffix: 'airbnb.com.mx' },
  { hostSuffix: 'airbnb.com.br' },
  { hostSuffix: 'airbnb.co.jp' },
  { hostSuffix: 'airbnb.com.sg' },
  { hostSuffix: 'airbnb.co.in' },
];

const ALL_URL_FILTERS = AMAZON_URL_FILTERS
  .concat(AGODA_URL_FILTERS)
  .concat(BOOKING_URL_FILTERS)
  .concat(EXPEDIA_URL_FILTERS)
  .concat(AIRBNB_URL_FILTERS);

// -- Enable/disable state -----------------------------------------------------

function applyBadge(enabled) {
  const text = enabled ? '' : 'OFF';
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: '#B00020' });
  chrome.action.setTitle({
    title: enabled
      ? 'Link Shortener — click to disable'
      : 'Link Shortener — click to enable',
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

// -- On-update tab reload ----------------------------------------------------
// Content scripts already running in open tabs are orphaned after an upgrade.
// They keep executing the prior version and never register new
// storage.onChanged listeners (e.g. hideTravelPopup added in 1.3.x). Reload
// any tab matching one of our content_scripts entries so the fresh code
// loads. Host permissions cover all the URLs, so chrome.tabs.query with a
// `url` filter does not require the `tabs` permission.
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason !== 'update') return;
  const groups = chrome.runtime.getManifest().content_scripts || [];
  const matchSet = new Set();
  for (const g of groups) {
    for (const m of (g.matches || [])) matchSet.add(m);
  }
  if (matchSet.size === 0) return;
  chrome.tabs.query({ url: Array.from(matchSet) }, (tabs) => {
    if (chrome.runtime.lastError) return;
    for (const tab of tabs) {
      if (tab.id != null) {
        chrome.tabs.reload(tab.id, {}, () => void chrome.runtime.lastError);
      }
    }
  });
});

// -- SPA-navigation fallback --------------------------------------------------

function isHandledHost(hostname) {
  return (
    self.AmazonLinkShortener.isAmazonHost(hostname) ||
    self.AgodaLinkShortener.isAgodaHost(hostname) ||
    self.BookingLinkShortener.isBookingHost(hostname) ||
    self.ExpediaLinkShortener.isExpediaHost(hostname) ||
    self.AirbnbLinkShortener.isAirbnbHost(hostname)
  );
}

function pingTab(tabId, frameId) {
  // frameId 0 = top frame; we only inject into the top frame.
  if (frameId !== 0) return;
  chrome.storage.sync.get({ enabled: true }, (items) => {
    if (items.enabled === false) return;
    chrome.tabs.sendMessage(
      tabId,
      { type: 'CHECK_URL' },
      // Swallow "Receiving end does not exist" — happens when the content
      // script hasn't loaded yet (chrome:// pages, errored frames, etc).
      () => void chrome.runtime.lastError,
    );
  });
}

function handleNav(details) {
  let hostname;
  try {
    hostname = new URL(details.url).hostname;
  } catch (_e) {
    return;
  }
  if (!isHandledHost(hostname)) return;
  pingTab(details.tabId, details.frameId);
}

chrome.webNavigation.onHistoryStateUpdated.addListener(handleNav, {
  url: ALL_URL_FILTERS,
});

chrome.webNavigation.onCommitted.addListener(handleNav, {
  url: ALL_URL_FILTERS,
});
