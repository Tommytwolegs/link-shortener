// background.js
// ----------------------------------------------------------------------------
// Service worker:
//   • Watches `chrome.webNavigation` events on every site we handle (Amazon,
//     four hotel sites, and seven social/media sites) and pings the
//     appropriate content script on history-state updates so SPA transitions
//     get picked up without a full reload.
//   • Keeps the toolbar badge in sync with the enable/disable toggle — empty
//     when on, "OFF" in red when off.
//   • On extension update, reloads matching open tabs so they pick up the
//     new content scripts (otherwise orphaned scripts ignore new flags).
// ----------------------------------------------------------------------------

importScripts(
  'asin.js',
  'agoda.js',
  'booking.js',
  'expedia.js',
  'airbnb.js',
  'facebook.js',
  'instagram.js',
  'youtube.js',
  'twitter.js',
  'tiktok.js',
  'reddit.js',
  'spotify.js',
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

const FACEBOOK_URL_FILTERS = [
  { hostSuffix: 'facebook.com' },
  { hostEquals: 'fb.watch' },
];
const INSTAGRAM_URL_FILTERS = [{ hostSuffix: 'instagram.com' }];
const YOUTUBE_URL_FILTERS = [
  { hostSuffix: 'youtube.com' },
  { hostEquals: 'youtu.be' },
];
const TWITTER_URL_FILTERS = [
  { hostSuffix: 'twitter.com' },
  { hostSuffix: 'x.com' },
];
const TIKTOK_URL_FILTERS = [{ hostSuffix: 'tiktok.com' }];
const REDDIT_URL_FILTERS = [
  { hostSuffix: 'reddit.com' },
  { hostEquals: 'redd.it' },
];
const SPOTIFY_URL_FILTERS = [{ hostEquals: 'open.spotify.com' }];

const ALL_URL_FILTERS = AMAZON_URL_FILTERS
  .concat(AGODA_URL_FILTERS)
  .concat(BOOKING_URL_FILTERS)
  .concat(EXPEDIA_URL_FILTERS)
  .concat(AIRBNB_URL_FILTERS)
  .concat(FACEBOOK_URL_FILTERS)
  .concat(INSTAGRAM_URL_FILTERS)
  .concat(YOUTUBE_URL_FILTERS)
  .concat(TWITTER_URL_FILTERS)
  .concat(TIKTOK_URL_FILTERS)
  .concat(REDDIT_URL_FILTERS)
  .concat(SPOTIFY_URL_FILTERS);

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
    self.AirbnbLinkShortener.isAirbnbHost(hostname) ||
    self.FacebookLinkShortener.isFacebookHost(hostname) ||
    self.InstagramLinkShortener.isInstagramHost(hostname) ||
    self.YoutubeLinkShortener.isYoutubeHost(hostname) ||
    self.TwitterLinkShortener.isTwitterHost(hostname) ||
    self.TiktokLinkShortener.isTiktokHost(hostname) ||
    self.RedditLinkShortener.isRedditHost(hostname) ||
    self.SpotifyLinkShortener.isSpotifyHost(hostname)
  );
}

function pingTab(tabId, frameId) {
  if (frameId !== 0) return;
  chrome.storage.sync.get({ enabled: true }, (items) => {
    if (items.enabled === false) return;
    chrome.tabs.sendMessage(
      tabId,
      { type: 'CHECK_URL' },
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
