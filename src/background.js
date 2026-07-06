// background.js
// ----------------------------------------------------------------------------
// Service worker:
//   • Watches `chrome.webNavigation` events on every per-site host and pings
//     the appropriate content script on history-state updates so SPA
//     transitions get picked up without a full reload.
//   • Keeps the toolbar badge in sync with the enable/disable toggle — empty
//     when on, "OFF" in red when off.
//   • On extension update, reloads matching open tabs so they pick up the
//     new content scripts (otherwise orphaned scripts ignore new flags).
//   • Dynamically registers/unregisters the Universal tracking strip content
//     script depending on the `enabledUtmStrip` toggle AND the optional
//     `*://*/*` host permission.
//   • Registers a right-click "Copy clean URL" context menu item that
//     runs the source URL through every per-site shortener + the universal
//     tracking strip and copies the result via the active tab's clipboard.
// ----------------------------------------------------------------------------

// In Chrome (and Firefox 121+ with `background.service_worker`) this runs as
// a service worker, where importScripts() pulls in the URL modules. Firefox's
// event-page background mode (manifest's `background.scripts`) instead loads
// each module via a separate manifest entry and importScripts is undefined —
// guard the call so the same file works in both modes.
if (typeof importScripts === 'function') {
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
    'linkedin.js',
    'ebay.js',
    'etsy.js',
    'threads.js',
    'pinterest.js',
    'walmart.js',
    'target.js',
    'substack.js',
    'bluesky.js',
    'github.js',
    'medium.js',
    'quora.js',
    'shopee.js',
    'lazada.js',
    'aliexpress.js',
    'temu.js',
    'mercadolibre.js',
    'rakuten.js',
    'trip.js',
    'hotelscom.js',
    'coupang.js',
    'flipkart.js',
    'tokopedia.js',
    'mercari.js',
    'vinted.js',
    'allegro.js',
    'vrbo.js',
    'steam.js',
    'imdb.js',
    'stackoverflow.js',
    'wikipedia.js',
    'goodreads.js',
    'soundcloud.js',
    'applemusic.js',
    'twitch.js',
    'utm.js',
  );
}

const AMAZON_URL_FILTERS = [
  { hostSuffix: 'amazon.com' }, { hostSuffix: 'amazon.co.uk' },
  { hostSuffix: 'amazon.ca' }, { hostSuffix: 'amazon.de' },
  { hostSuffix: 'amazon.fr' }, { hostSuffix: 'amazon.it' },
  { hostSuffix: 'amazon.es' }, { hostSuffix: 'amazon.nl' },
  { hostSuffix: 'amazon.se' }, { hostSuffix: 'amazon.pl' },
  { hostSuffix: 'amazon.com.tr' }, { hostSuffix: 'amazon.com.au' },
  { hostSuffix: 'amazon.co.jp' }, { hostSuffix: 'amazon.in' },
  { hostSuffix: 'amazon.sg' }, { hostSuffix: 'amazon.ae' },
  { hostSuffix: 'amazon.sa' }, { hostSuffix: 'amazon.eg' },
  { hostSuffix: 'amazon.com.mx' }, { hostSuffix: 'amazon.com.br' },
  { hostSuffix: 'amazon.com.be' },
];

const AGODA_URL_FILTERS = [{ hostSuffix: 'agoda.com' }];
const BOOKING_URL_FILTERS = [{ hostSuffix: 'booking.com' }];

const EXPEDIA_URL_FILTERS = [
  { hostSuffix: 'expedia.com' }, { hostSuffix: 'expedia.co.uk' },
  { hostSuffix: 'expedia.ca' }, { hostSuffix: 'expedia.com.au' },
  { hostSuffix: 'expedia.de' }, { hostSuffix: 'expedia.fr' },
  { hostSuffix: 'expedia.it' }, { hostSuffix: 'expedia.es' },
  { hostSuffix: 'expedia.nl' }, { hostSuffix: 'expedia.com.mx' },
  { hostSuffix: 'expedia.com.br' }, { hostSuffix: 'expedia.co.jp' },
  { hostSuffix: 'expedia.com.sg' }, { hostSuffix: 'expedia.co.in' },
];

const AIRBNB_URL_FILTERS = [
  { hostSuffix: 'airbnb.com' }, { hostSuffix: 'airbnb.co.uk' },
  { hostSuffix: 'airbnb.ca' }, { hostSuffix: 'airbnb.com.au' },
  { hostSuffix: 'airbnb.de' }, { hostSuffix: 'airbnb.fr' },
  { hostSuffix: 'airbnb.it' }, { hostSuffix: 'airbnb.es' },
  { hostSuffix: 'airbnb.nl' }, { hostSuffix: 'airbnb.com.mx' },
  { hostSuffix: 'airbnb.com.br' }, { hostSuffix: 'airbnb.co.jp' },
  { hostSuffix: 'airbnb.com.sg' }, { hostSuffix: 'airbnb.co.in' },
];

const FACEBOOK_URL_FILTERS = [
  { hostSuffix: 'facebook.com' }, { hostEquals: 'fb.watch' },
];
const INSTAGRAM_URL_FILTERS = [{ hostSuffix: 'instagram.com' }];
const YOUTUBE_URL_FILTERS = [
  { hostSuffix: 'youtube.com' }, { hostEquals: 'youtu.be' },
];
const TWITTER_URL_FILTERS = [
  { hostSuffix: 'twitter.com' }, { hostSuffix: 'x.com' },
];
const TIKTOK_URL_FILTERS = [{ hostSuffix: 'tiktok.com' }];
const REDDIT_URL_FILTERS = [
  { hostSuffix: 'reddit.com' }, { hostEquals: 'redd.it' },
];
const SPOTIFY_URL_FILTERS = [{ hostEquals: 'open.spotify.com' }];
const LINKEDIN_URL_FILTERS = [{ hostSuffix: 'linkedin.com' }];

const EBAY_URL_FILTERS = [
  { hostSuffix: 'ebay.com' }, { hostSuffix: 'ebay.co.uk' },
  { hostSuffix: 'ebay.de' }, { hostSuffix: 'ebay.fr' },
  { hostSuffix: 'ebay.it' }, { hostSuffix: 'ebay.es' },
  { hostSuffix: 'ebay.nl' }, { hostSuffix: 'ebay.ca' },
  { hostSuffix: 'ebay.com.au' }, { hostSuffix: 'ebay.ie' },
  { hostSuffix: 'ebay.com.hk' }, { hostSuffix: 'ebay.com.my' },
  { hostSuffix: 'ebay.com.sg' }, { hostSuffix: 'ebay.com.tw' },
  { hostSuffix: 'ebay.at' }, { hostSuffix: 'ebay.be' },
  { hostSuffix: 'ebay.ch' }, { hostSuffix: 'ebay.pl' },
  { hostSuffix: 'ebay.com.tr' },
];

const ETSY_URL_FILTERS = [
  { hostSuffix: 'etsy.com' }, { hostSuffix: 'etsy.de' },
  { hostSuffix: 'etsy.fr' }, { hostSuffix: 'etsy.it' },
  { hostSuffix: 'etsy.es' }, { hostSuffix: 'etsy.nl' },
  { hostSuffix: 'etsy.co.uk' }, { hostSuffix: 'etsy.com.au' },
  { hostSuffix: 'etsy.ca' }, { hostSuffix: 'etsy.jp' },
  { hostSuffix: 'etsy.pl' }, { hostSuffix: 'etsy.in' },
  { hostSuffix: 'etsy.com.br' }, { hostSuffix: 'etsy.com.mx' },
  { hostSuffix: 'etsy.ie' },
];

const THREADS_URL_FILTERS = [
  { hostSuffix: 'threads.net' }, { hostSuffix: 'threads.com' },
];

const PINTEREST_URL_FILTERS = [
  { hostSuffix: 'pinterest.com' }, { hostSuffix: 'pinterest.co.uk' },
  { hostSuffix: 'pinterest.de' }, { hostSuffix: 'pinterest.fr' },
  { hostSuffix: 'pinterest.it' }, { hostSuffix: 'pinterest.es' },
  { hostSuffix: 'pinterest.ca' }, { hostSuffix: 'pinterest.com.au' },
  { hostSuffix: 'pinterest.com.mx' }, { hostSuffix: 'pinterest.jp' },
  { hostSuffix: 'pinterest.nz' }, { hostSuffix: 'pinterest.ie' },
  { hostSuffix: 'pinterest.at' }, { hostSuffix: 'pinterest.ch' },
  { hostSuffix: 'pinterest.dk' }, { hostSuffix: 'pinterest.nl' },
  { hostSuffix: 'pinterest.se' }, { hostSuffix: 'pinterest.ph' },
  { hostSuffix: 'pinterest.pt' }, { hostEquals: 'pin.it' },
];

const WALMART_URL_FILTERS = [
  { hostSuffix: 'walmart.com' }, { hostSuffix: 'walmart.ca' },
];

const TARGET_URL_FILTERS = [{ hostSuffix: 'target.com' }];

const SUBSTACK_URL_FILTERS = [{ hostSuffix: 'substack.com' }];
const BLUESKY_URL_FILTERS = [{ hostEquals: 'bsky.app' }];
const GITHUB_URL_FILTERS = [
  { hostEquals: 'github.com' }, { hostEquals: 'www.github.com' },
];
const MEDIUM_URL_FILTERS = [{ hostSuffix: 'medium.com' }];
const QUORA_URL_FILTERS = [{ hostSuffix: 'quora.com' }];

const SHOPEE_URL_FILTERS = [
  { hostSuffix: 'shopee.com' }, { hostSuffix: 'shopee.sg' },
  { hostSuffix: 'shopee.co.id' }, { hostSuffix: 'shopee.co.th' },
  { hostSuffix: 'shopee.com.my' }, { hostSuffix: 'shopee.ph' },
  { hostSuffix: 'shopee.vn' }, { hostSuffix: 'shopee.tw' },
  { hostSuffix: 'shopee.com.br' }, { hostSuffix: 'shopee.com.mx' },
  { hostSuffix: 'shopee.cl' }, { hostSuffix: 'shopee.com.co' },
  { hostEquals: 'shp.ee' },
];
const LAZADA_URL_FILTERS = [
  { hostSuffix: 'lazada.com' }, { hostSuffix: 'lazada.sg' },
  { hostSuffix: 'lazada.co.id' }, { hostSuffix: 'lazada.com.my' },
  { hostSuffix: 'lazada.co.th' }, { hostSuffix: 'lazada.com.ph' },
  { hostSuffix: 'lazada.vn' },
];
const ALIEXPRESS_URL_FILTERS = [
  { hostSuffix: 'aliexpress.com' }, { hostSuffix: 'aliexpress.us' },
];
const TEMU_URL_FILTERS = [{ hostSuffix: 'temu.com' }];
const MERCADOLIBRE_URL_FILTERS = [
  { hostSuffix: 'mercadolibre.com' }, { hostSuffix: 'mercadolibre.com.ar' },
  { hostSuffix: 'mercadolibre.com.mx' }, { hostSuffix: 'mercadolibre.cl' },
  { hostSuffix: 'mercadolibre.com.co' }, { hostSuffix: 'mercadolibre.com.pe' },
  { hostSuffix: 'mercadolibre.com.uy' }, { hostSuffix: 'mercadolibre.com.ve' },
  { hostSuffix: 'mercadolibre.com.ec' }, { hostSuffix: 'mercadolivre.com.br' },
];
const RAKUTEN_URL_FILTERS = [{ hostEquals: 'item.rakuten.co.jp' }];
const TRIP_URL_FILTERS = [{ hostSuffix: 'trip.com' }];
const HOTELSCOM_URL_FILTERS = [{ hostSuffix: 'hotels.com' }];

const COUPANG_URL_FILTERS = [{ hostSuffix: 'coupang.com' }];
const FLIPKART_URL_FILTERS = [{ hostSuffix: 'flipkart.com' }];
const TOKOPEDIA_URL_FILTERS = [{ hostSuffix: 'tokopedia.com' }];
const MERCARI_URL_FILTERS = [{ hostSuffix: 'mercari.com' }];
const VINTED_URL_FILTERS = ['com','fr','de','co.uk','pl','it','es','nl','be','at','cz','sk','lt','pt','se','dk','fi','hu','ro']
  .map((tld) => ({ hostSuffix: 'vinted.' + tld }));
const ALLEGRO_URL_FILTERS = [
  { hostSuffix: 'allegro.pl' }, { hostSuffix: 'allegro.cz' },
  { hostSuffix: 'allegro.sk' }, { hostSuffix: 'allegro.hu' },
];
const VRBO_URL_FILTERS = [{ hostSuffix: 'vrbo.com' }];

const STEAM_URL_FILTERS = [{ hostEquals: 'store.steampowered.com' }];
const IMDB_URL_FILTERS = [{ hostSuffix: 'imdb.com' }];
const STACKOVERFLOW_URL_FILTERS = [
  { hostSuffix: 'stackoverflow.com' }, { hostSuffix: 'stackexchange.com' },
  { hostSuffix: 'superuser.com' }, { hostSuffix: 'serverfault.com' },
  { hostSuffix: 'askubuntu.com' },
];
const WIKIPEDIA_URL_FILTERS = [{ hostSuffix: 'wikipedia.org' }];
const GOODREADS_URL_FILTERS = [{ hostSuffix: 'goodreads.com' }];
const SOUNDCLOUD_URL_FILTERS = [{ hostSuffix: 'soundcloud.com' }];
const APPLEMUSIC_URL_FILTERS = [
  { hostEquals: 'music.apple.com' }, { hostEquals: 'podcasts.apple.com' },
];
const TWITCH_URL_FILTERS = [{ hostSuffix: 'twitch.tv' }];

const ALL_URL_FILTERS = AMAZON_URL_FILTERS
  .concat(AGODA_URL_FILTERS).concat(BOOKING_URL_FILTERS)
  .concat(EXPEDIA_URL_FILTERS).concat(AIRBNB_URL_FILTERS)
  .concat(FACEBOOK_URL_FILTERS).concat(INSTAGRAM_URL_FILTERS)
  .concat(YOUTUBE_URL_FILTERS).concat(TWITTER_URL_FILTERS)
  .concat(TIKTOK_URL_FILTERS).concat(REDDIT_URL_FILTERS)
  .concat(SPOTIFY_URL_FILTERS).concat(LINKEDIN_URL_FILTERS)
  .concat(EBAY_URL_FILTERS).concat(ETSY_URL_FILTERS)
  .concat(THREADS_URL_FILTERS).concat(PINTEREST_URL_FILTERS)
  .concat(WALMART_URL_FILTERS).concat(TARGET_URL_FILTERS)
  .concat(SUBSTACK_URL_FILTERS).concat(BLUESKY_URL_FILTERS)
  .concat(GITHUB_URL_FILTERS).concat(MEDIUM_URL_FILTERS)
  .concat(QUORA_URL_FILTERS)
  .concat(SHOPEE_URL_FILTERS).concat(LAZADA_URL_FILTERS)
  .concat(ALIEXPRESS_URL_FILTERS).concat(TEMU_URL_FILTERS)
  .concat(MERCADOLIBRE_URL_FILTERS).concat(RAKUTEN_URL_FILTERS)
  .concat(TRIP_URL_FILTERS).concat(HOTELSCOM_URL_FILTERS)
  .concat(COUPANG_URL_FILTERS).concat(FLIPKART_URL_FILTERS)
  .concat(TOKOPEDIA_URL_FILTERS).concat(MERCARI_URL_FILTERS)
  .concat(VINTED_URL_FILTERS).concat(ALLEGRO_URL_FILTERS)
  .concat(VRBO_URL_FILTERS)
  .concat(STEAM_URL_FILTERS).concat(IMDB_URL_FILTERS)
  .concat(STACKOVERFLOW_URL_FILTERS).concat(WIKIPEDIA_URL_FILTERS)
  .concat(GOODREADS_URL_FILTERS).concat(SOUNDCLOUD_URL_FILTERS)
  .concat(APPLEMUSIC_URL_FILTERS).concat(TWITCH_URL_FILTERS);

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

// -- Universal tracking strip — dynamic registration -------------------------

const UTM_SCRIPT_ID = 'utm-strip';

async function shouldRegisterUtm() {
  const items = await chrome.storage.sync.get({ enabledUtmStrip: false });
  if (items.enabledUtmStrip !== true) return false;
  return new Promise((resolve) => {
    chrome.permissions.contains({ origins: ['*://*/*'] }, (granted) => {
      resolve(!!granted);
    });
  });
}

async function registerUtmContentScript() {
  try {
    const existing = await chrome.scripting.getRegisteredContentScripts({
      ids: [UTM_SCRIPT_ID],
    });
    if (existing && existing.length > 0) return;
    await chrome.scripting.registerContentScripts([{
      id: UTM_SCRIPT_ID,
      matches: ['*://*/*'],
      js: ['src/utm.js', 'src/utm-content.js'],
      runAt: 'document_start',
      allFrames: false,
      persistAcrossSessions: true,
    }]);
  } catch (e) {
    console.debug('[Link Shortener] could not register utm content script:', e);
  }
}

async function unregisterUtmContentScript() {
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [UTM_SCRIPT_ID] });
  } catch (e) {
    // Not registered or already gone; ignore.
  }
}

async function syncUtmContentScript() {
  if (await shouldRegisterUtm()) {
    await registerUtmContentScript();
  } else {
    await unregisterUtmContentScript();
  }
}

chrome.runtime.onInstalled.addListener(syncUtmContentScript);
chrome.runtime.onStartup.addListener(syncUtmContentScript);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (!Object.prototype.hasOwnProperty.call(changes, 'enabledUtmStrip')) return;
  syncUtmContentScript();
});

if (chrome.permissions && chrome.permissions.onRemoved) {
  chrome.permissions.onRemoved.addListener((p) => {
    if (p && Array.isArray(p.origins) && p.origins.includes('*://*/*')) {
      unregisterUtmContentScript();
      chrome.storage.sync.set({ enabledUtmStrip: false });
    }
  });
}

// -- Context menu: "Copy clean URL" ------------------------------------------
// Runs the URL through whichever per-site shortener recognizes its host,
// then through the universal tracking strip, and copies the result to the
// clipboard via an injected script in the active tab.
//
// `activeTab` permission grants temporary access to the tab on user gesture
// (a context-menu click counts), so this works on every page without needing
// `*://*/*` in host_permissions.

const CONTEXT_MENU_ID = 'copy-clean-url';

// removeAll + create is idempotent and covers both browsers: Chrome
// persists menus across restarts, Firefox event pages don't reliably —
// so we recreate on BOTH onInstalled and onStartup. Note that
// contextMenus.create reports duplicate-id failures via
// chrome.runtime.lastError in its callback; a try/catch can't see them.
function ensureContextMenu() {
  chrome.contextMenus.removeAll(() => {
    void chrome.runtime.lastError;
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: 'Copy clean URL',
      contexts: ['link', 'page'],
    }, () => void chrome.runtime.lastError);
  });
}

chrome.runtime.onInstalled.addListener(ensureContextMenu);
chrome.runtime.onStartup.addListener(ensureContextMenu);

// Try every per-site shortener in turn, then fall back to UTM stripping,
// then to the original URL. Returns the cleanest form we can produce.
function cleanAnyUrl(input, keepParams) {
  let url;
  try {
    url = new URL(input);
  } catch (_e) {
    return input;
  }
  const h = url.hostname;
  const shorteners = [
    self.AmazonLinkShortener && {
      match: (h) => self.AmazonLinkShortener.isAmazonHost(h),
      shorten: (u) => self.AmazonLinkShortener.shortenAmazonUrl(u),
    },
    self.AgodaLinkShortener && {
      match: (h) => self.AgodaLinkShortener.isAgodaHost(h),
      shorten: (u) => self.AgodaLinkShortener.shortPropertyUrl(u),
    },
    self.BookingLinkShortener && {
      match: (h) => self.BookingLinkShortener.isBookingHost(h),
      shorten: (u) => self.BookingLinkShortener.shortPropertyUrl(u),
    },
    self.ExpediaLinkShortener && {
      match: (h) => self.ExpediaLinkShortener.isExpediaHost(h),
      shorten: (u) => self.ExpediaLinkShortener.shortPropertyUrl(u),
    },
    self.AirbnbLinkShortener && {
      match: (h) => self.AirbnbLinkShortener.isAirbnbHost(h),
      shorten: (u) => self.AirbnbLinkShortener.shortPropertyUrl(u),
    },
    self.FacebookLinkShortener && {
      match: (h) => self.FacebookLinkShortener.isFacebookHost(h),
      shorten: (u) => self.FacebookLinkShortener.shortenFacebookUrl(u),
    },
    self.InstagramLinkShortener && {
      match: (h) => self.InstagramLinkShortener.isInstagramHost(h),
      shorten: (u) => self.InstagramLinkShortener.shortenInstagramUrl(u),
    },
    self.YoutubeLinkShortener && {
      match: (h) => self.YoutubeLinkShortener.isYoutubeHost(h),
      shorten: (u) => self.YoutubeLinkShortener.shortenYoutubeUrl(u),
    },
    self.TwitterLinkShortener && {
      match: (h) => self.TwitterLinkShortener.isTwitterHost(h),
      shorten: (u) => self.TwitterLinkShortener.shortenTwitterUrl(u),
    },
    self.TiktokLinkShortener && {
      match: (h) => self.TiktokLinkShortener.isTiktokHost(h),
      shorten: (u) => self.TiktokLinkShortener.shortenTiktokUrl(u),
    },
    self.RedditLinkShortener && {
      match: (h) => self.RedditLinkShortener.isRedditHost(h),
      shorten: (u) => self.RedditLinkShortener.shortenRedditUrl(u),
    },
    self.SpotifyLinkShortener && {
      match: (h) => self.SpotifyLinkShortener.isSpotifyHost(h),
      shorten: (u) => self.SpotifyLinkShortener.shortenSpotifyUrl(u),
    },
    self.LinkedinLinkShortener && {
      match: (h) => self.LinkedinLinkShortener.isLinkedinHost(h),
      shorten: (u) => self.LinkedinLinkShortener.shortenLinkedinUrl(u),
    },
    self.EbayLinkShortener && {
      match: (h) => self.EbayLinkShortener.isEbayHost(h),
      shorten: (u) => self.EbayLinkShortener.shortenEbayUrl(u),
    },
    self.EtsyLinkShortener && {
      match: (h) => self.EtsyLinkShortener.isEtsyHost(h),
      shorten: (u) => self.EtsyLinkShortener.shortenEtsyUrl(u),
    },
    self.ThreadsLinkShortener && {
      match: (h) => self.ThreadsLinkShortener.isThreadsHost(h),
      shorten: (u) => self.ThreadsLinkShortener.shortenThreadsUrl(u),
    },
    self.PinterestLinkShortener && {
      match: (h) => self.PinterestLinkShortener.isPinterestHost(h),
      shorten: (u) => self.PinterestLinkShortener.shortenPinterestUrl(u),
    },
    self.WalmartLinkShortener && {
      match: (h) => self.WalmartLinkShortener.isWalmartHost(h),
      shorten: (u) => self.WalmartLinkShortener.shortenWalmartUrl(u),
    },
    self.TargetLinkShortener && {
      match: (h) => self.TargetLinkShortener.isTargetHost(h),
      shorten: (u) => self.TargetLinkShortener.shortenTargetUrl(u),
    },
    self.SubstackLinkShortener && {
      match: (h) => self.SubstackLinkShortener.isSubstackHost(h),
      shorten: (u) => self.SubstackLinkShortener.shortenSubstackUrl(u),
    },
    self.BlueskyLinkShortener && {
      match: (h) => self.BlueskyLinkShortener.isBlueskyHost(h),
      shorten: (u) => self.BlueskyLinkShortener.shortenBlueskyUrl(u),
    },
    self.GithubLinkShortener && {
      match: (h) => self.GithubLinkShortener.isGithubHost(h),
      shorten: (u) => self.GithubLinkShortener.shortenGithubUrl(u),
    },
    self.MediumLinkShortener && {
      match: (h) => self.MediumLinkShortener.isMediumHost(h),
      shorten: (u) => self.MediumLinkShortener.shortenMediumUrl(u),
    },
    self.QuoraLinkShortener && {
      match: (h) => self.QuoraLinkShortener.isQuoraHost(h),
      shorten: (u) => self.QuoraLinkShortener.shortenQuoraUrl(u),
    },
    self.ShopeeLinkShortener && {
      match: (h) => self.ShopeeLinkShortener.isShopeeHost(h),
      shorten: (u) => self.ShopeeLinkShortener.shortenShopeeUrl(u),
    },
    self.LazadaLinkShortener && {
      match: (h) => self.LazadaLinkShortener.isLazadaHost(h),
      shorten: (u) => self.LazadaLinkShortener.shortenLazadaUrl(u),
    },
    self.AliexpressLinkShortener && {
      match: (h) => self.AliexpressLinkShortener.isAliexpressHost(h),
      shorten: (u) => self.AliexpressLinkShortener.shortenAliexpressUrl(u),
    },
    self.TemuLinkShortener && {
      match: (h) => self.TemuLinkShortener.isTemuHost(h),
      shorten: (u) => self.TemuLinkShortener.shortenTemuUrl(u),
    },
    self.MercadolibreLinkShortener && {
      match: (h) => self.MercadolibreLinkShortener.isMercadolibreHost(h),
      shorten: (u) => self.MercadolibreLinkShortener.shortenMercadolibreUrl(u),
    },
    self.RakutenLinkShortener && {
      match: (h) => self.RakutenLinkShortener.isRakutenHost(h),
      shorten: (u) => self.RakutenLinkShortener.shortenRakutenUrl(u),
    },
    self.TripLinkShortener && {
      match: (h) => self.TripLinkShortener.isTripHost(h),
      shorten: (u) => self.TripLinkShortener.shortPropertyUrl(u),
    },
    self.HotelscomLinkShortener && {
      match: (h) => self.HotelscomLinkShortener.isHotelscomHost(h),
      shorten: (u) => self.HotelscomLinkShortener.shortPropertyUrl(u),
    },
    self.CoupangLinkShortener && {
      match: (h) => self.CoupangLinkShortener.isCoupangHost(h),
      shorten: (u) => self.CoupangLinkShortener.shortenCoupangUrl(u),
    },
    self.FlipkartLinkShortener && {
      match: (h) => self.FlipkartLinkShortener.isFlipkartHost(h),
      shorten: (u) => self.FlipkartLinkShortener.shortenFlipkartUrl(u),
    },
    self.TokopediaLinkShortener && {
      match: (h) => self.TokopediaLinkShortener.isTokopediaHost(h),
      shorten: (u) => self.TokopediaLinkShortener.shortenTokopediaUrl(u),
    },
    self.MercariLinkShortener && {
      match: (h) => self.MercariLinkShortener.isMercariHost(h),
      shorten: (u) => self.MercariLinkShortener.shortenMercariUrl(u),
    },
    self.VintedLinkShortener && {
      match: (h) => self.VintedLinkShortener.isVintedHost(h),
      shorten: (u) => self.VintedLinkShortener.shortenVintedUrl(u),
    },
    self.AllegroLinkShortener && {
      match: (h) => self.AllegroLinkShortener.isAllegroHost(h),
      shorten: (u) => self.AllegroLinkShortener.shortenAllegroUrl(u),
    },
    self.VrboLinkShortener && {
      match: (h) => self.VrboLinkShortener.isVrboHost(h),
      shorten: (u) => self.VrboLinkShortener.shortPropertyUrl(u),
    },
    self.SteamLinkShortener && {
      match: (h) => self.SteamLinkShortener.isSteamHost(h),
      shorten: (u) => self.SteamLinkShortener.shortenSteamUrl(u),
    },
    self.ImdbLinkShortener && {
      match: (h) => self.ImdbLinkShortener.isImdbHost(h),
      shorten: (u) => self.ImdbLinkShortener.shortenImdbUrl(u),
    },
    self.StackoverflowLinkShortener && {
      match: (h) => self.StackoverflowLinkShortener.isStackoverflowHost(h),
      shorten: (u) => self.StackoverflowLinkShortener.shortenStackoverflowUrl(u),
    },
    self.WikipediaLinkShortener && {
      match: (h) => self.WikipediaLinkShortener.isWikipediaHost(h),
      shorten: (u) => self.WikipediaLinkShortener.shortenWikipediaUrl(u),
    },
    self.GoodreadsLinkShortener && {
      match: (h) => self.GoodreadsLinkShortener.isGoodreadsHost(h),
      shorten: (u) => self.GoodreadsLinkShortener.shortenGoodreadsUrl(u),
    },
    self.SoundcloudLinkShortener && {
      match: (h) => self.SoundcloudLinkShortener.isSoundcloudHost(h),
      shorten: (u) => self.SoundcloudLinkShortener.shortenSoundcloudUrl(u),
    },
    self.AppleMusicLinkShortener && {
      match: (h) => self.AppleMusicLinkShortener.isAppleMusicHost(h),
      shorten: (u) => self.AppleMusicLinkShortener.shortenAppleMusicUrl(u),
    },
    self.TwitchLinkShortener && {
      match: (h) => self.TwitchLinkShortener.isTwitchHost(h),
      shorten: (u) => self.TwitchLinkShortener.shortenTwitchUrl(u),
    },
  ].filter(Boolean);

  let working = input;
  for (const s of shorteners) {
    if (!s.match(h)) continue;
    const out = s.shorten(working);
    if (out) {
      working = out;
      break;
    }
  }
  // Universal UTM strip on top — for the context menu we always apply it,
  // regardless of the user's toggle setting. The user explicitly invoked
  // "Copy clean URL" so we give them the cleanest form we can.
  if (self.UtmStripper) {
    const opts = keepParams && keepParams.length ? { keepParams } : undefined;
    const stripped = self.UtmStripper.stripTrackingParams(working, opts);
    if (stripped) working = stripped;
  }
  return working;
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;
  const sourceUrl = info.linkUrl || info.pageUrl;
  if (!sourceUrl) return;
  if (!tab || tab.id == null) return;
  // Read the user's "always keep these parameters" list fresh on every
  // click. If this click is what woke the service worker, a module-level
  // cache would still be empty at this point — reading storage inside the
  // handler avoids that race. (Skip-domains is intentionally not honored
  // here: the context menu is an explicit user gesture, so the cleanest
  // possible URL is what they want even on hosts they've allowlisted.)
  chrome.storage.sync.get({ utmStripKeepParams: [] }, (items) => {
  const keepParams = Array.isArray(items.utmStripKeepParams) ? items.utmStripKeepParams : [];
  const cleaned = cleanAnyUrl(sourceUrl, keepParams);
  // Inject a tiny function into the active tab that writes to the clipboard.
  // `activeTab` permission grants us temporary access on user gesture.
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (text) => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => {
          // Clipboard API may be blocked in some frames; fall back to
          // an offscreen textarea + execCommand.
          legacyCopy(text);
        });
      } else {
        legacyCopy(text);
      }
      function legacyCopy(t) {
        const ta = document.createElement('textarea');
        ta.value = t;
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try { document.execCommand('copy'); } catch (_e) {}
        ta.remove();
      }
    },
    args: [cleaned],
  }, () => void chrome.runtime.lastError);
  });
});

// -- SPA-navigation fallback --------------------------------------------------

// [namespace, host-check method] for every per-site module. Checked
// defensively: if a module failed to load (e.g. a packaging mistake left
// one out of the Firefox background.scripts array), we skip it rather
// than throw on every navigation event.
const HOST_CHECKS = [
  ['AmazonLinkShortener', 'isAmazonHost'],
  ['AgodaLinkShortener', 'isAgodaHost'],
  ['BookingLinkShortener', 'isBookingHost'],
  ['ExpediaLinkShortener', 'isExpediaHost'],
  ['AirbnbLinkShortener', 'isAirbnbHost'],
  ['FacebookLinkShortener', 'isFacebookHost'],
  ['InstagramLinkShortener', 'isInstagramHost'],
  ['YoutubeLinkShortener', 'isYoutubeHost'],
  ['TwitterLinkShortener', 'isTwitterHost'],
  ['TiktokLinkShortener', 'isTiktokHost'],
  ['RedditLinkShortener', 'isRedditHost'],
  ['SpotifyLinkShortener', 'isSpotifyHost'],
  ['LinkedinLinkShortener', 'isLinkedinHost'],
  ['EbayLinkShortener', 'isEbayHost'],
  ['EtsyLinkShortener', 'isEtsyHost'],
  ['ThreadsLinkShortener', 'isThreadsHost'],
  ['PinterestLinkShortener', 'isPinterestHost'],
  ['WalmartLinkShortener', 'isWalmartHost'],
  ['TargetLinkShortener', 'isTargetHost'],
  ['SubstackLinkShortener', 'isSubstackHost'],
  ['BlueskyLinkShortener', 'isBlueskyHost'],
  ['GithubLinkShortener', 'isGithubHost'],
  ['MediumLinkShortener', 'isMediumHost'],
  ['QuoraLinkShortener', 'isQuoraHost'],
  ['ShopeeLinkShortener', 'isShopeeHost'],
  ['LazadaLinkShortener', 'isLazadaHost'],
  ['AliexpressLinkShortener', 'isAliexpressHost'],
  ['TemuLinkShortener', 'isTemuHost'],
  ['MercadolibreLinkShortener', 'isMercadolibreHost'],
  ['RakutenLinkShortener', 'isRakutenHost'],
  ['TripLinkShortener', 'isTripHost'],
  ['HotelscomLinkShortener', 'isHotelscomHost'],
  ['CoupangLinkShortener', 'isCoupangHost'],
  ['FlipkartLinkShortener', 'isFlipkartHost'],
  ['TokopediaLinkShortener', 'isTokopediaHost'],
  ['MercariLinkShortener', 'isMercariHost'],
  ['VintedLinkShortener', 'isVintedHost'],
  ['AllegroLinkShortener', 'isAllegroHost'],
  ['VrboLinkShortener', 'isVrboHost'],
  ['SteamLinkShortener', 'isSteamHost'],
  ['ImdbLinkShortener', 'isImdbHost'],
  ['StackoverflowLinkShortener', 'isStackoverflowHost'],
  ['WikipediaLinkShortener', 'isWikipediaHost'],
  ['GoodreadsLinkShortener', 'isGoodreadsHost'],
  ['SoundcloudLinkShortener', 'isSoundcloudHost'],
  ['AppleMusicLinkShortener', 'isAppleMusicHost'],
  ['TwitchLinkShortener', 'isTwitchHost'],
];

function isHandledHost(hostname) {
  return HOST_CHECKS.some(([ns, fn]) => {
    const m = self[ns];
    return !!(m && typeof m[fn] === 'function' && m[fn](hostname));
  });
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

// The URL filter keeps the event from firing at all on unrelated sites;
// isHandledHost() inside handleNav stays as the precise check (hostSuffix
// is a plain string-suffix match, so e.g. "notamazon.com" passes the
// filter but is correctly rejected by the host regexes).
chrome.webNavigation.onHistoryStateUpdated.addListener(handleNav, {
  url: ALL_URL_FILTERS,
});
