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
    'wayfair.js',
    'bestbuy.js',
    'bandcamp.js',
    'letterboxd.js',
    'tripadvisor.js',
    'meesho.js',
    'carousell.js',
    'taobao.js',
    'jd.js',
    'leboncoin.js',
    'olx.js',
    'wallapop.js',
    'marktplaats.js',
    'kleinanzeigen.js',
    'zalando.js',
    'netflix.js',
    'roblox.js',
    'fandom.js',
    'bilibili.js',
    'shein.js',
    'news.js',
    'google.js',
    'gdrive.js',
    'bing.js',
    'duckduckgo.js',
    'naver.js',
    'weather.js',
    'samsung.js',
    'kayak.js',
    'skyscanner.js',
    'flightaware.js',
    'flightradar24.js',
    'airlines.js',
    'netsuite.js',
    'atlassian.js',
    'notion.js',
    'loom.js',
    'figma.js',
    'primevideo.js',
    'ecosia.js',
    'startpage.js',
    'bravesearch.js',
    'kagi.js',
    'pubmed.js',
    'scholar.js',
    'researchgate.js',
    'yelp.js',
    'playstore.js',
    'appstore.js',
    'parcels.js',
    'kickstarter.js',
    'gofundme.js',
    'patreon.js',
    'meetup.js',
    'allrecipes.js',
    'seriouseats.js',
    'foodnetwork.js',
    'bbcgoodfood.js',
    'costco.js',
    'homedepot.js',
    'lowes.js',
    'ikea.js',
    'nike.js',
    'adidas.js',
    'epic.js',
    'gog.js',
    'humble.js',
    'itchio.js',
    'accuweather.js',
    'wunderground.js',
    'espn.js',
    'flashscore.js',
    'sofascore.js',
    'zhihu.js',
    'weibo.js',
    'shopify.js',
    'godaddy.js',
    'producthunt.js',
    'changeorg.js',
    'eventbrite.js',
    'yahoojp.js',
    'niconico.js',
    'daum.js',
    'gmarket.js',
    'elevenst.js',
    'myntra.js',
    'zomato.js',
    'swiggy.js',
    'bol.js',
    'otto.js',
    'mediamarkt.js',
    'cdiscount.js',
    'fnac.js',
    'trendyol.js',
    'hepsiburada.js',
    'noon.js',
    'jumia.js',
    'daraz.js',
    'americanas.js',
    'magalu.js',
    'wildberries.js',
    'ozon.js',
    'avito.js',
    'redirect.js',
    'texturl.js',
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

const WAYFAIR_URL_FILTERS = ['com','ca','co.uk','de'].map((t) => ({ hostSuffix: 'wayfair.' + t }));
const BESTBUY_URL_FILTERS = [{ hostSuffix: 'bestbuy.com' }, { hostSuffix: 'bestbuy.ca' }];
const BANDCAMP_URL_FILTERS = [{ hostSuffix: 'bandcamp.com' }];
const LETTERBOXD_URL_FILTERS = [{ hostSuffix: 'letterboxd.com' }];
const TRIPADVISOR_URL_FILTERS = ['com','co.uk','ca','com.au','fr','de','it','es','in','nl','ie','com.sg','com.my','com.br','com.mx'].map((t) => ({ hostSuffix: 'tripadvisor.' + t }));
const MEESHO_URL_FILTERS = [{ hostSuffix: 'meesho.com' }];
const CAROUSELL_URL_FILTERS = ['com','sg','com.hk','com.my','ph','tw'].map((t) => ({ hostSuffix: 'carousell.' + t }));
const TAOBAO_URL_FILTERS = [{ hostSuffix: 'taobao.com' }, { hostSuffix: 'tmall.com' }];
const JD_URL_FILTERS = [{ hostEquals: 'item.jd.com' }];
const LEBONCOIN_URL_FILTERS = [{ hostSuffix: 'leboncoin.fr' }];
const OLX_URL_FILTERS = ['pl','ro','bg','ua','pt','kz'].map((t) => ({ hostSuffix: 'olx.' + t }));
const WALLAPOP_URL_FILTERS = [{ hostSuffix: 'wallapop.com' }];
const MARKTPLAATS_URL_FILTERS = [{ hostSuffix: 'marktplaats.nl' }];
const KLEINANZEIGEN_URL_FILTERS = [{ hostSuffix: 'kleinanzeigen.de' }];
const ZALANDO_URL_FILTERS = ['de','fr','it','es','nl','pl','co.uk','at','ch','be','se','dk','fi','no','cz','ie'].map((t) => ({ hostSuffix: 'zalando.' + t }));

const NETFLIX_URL_FILTERS = [{ hostSuffix: 'netflix.com' }];
const ROBLOX_URL_FILTERS = [{ hostSuffix: 'roblox.com' }];
const FANDOM_URL_FILTERS = [{ hostSuffix: 'fandom.com' }];
const BILIBILI_URL_FILTERS = [{ hostSuffix: 'bilibili.com' }, { hostEquals: 'b23.tv' }];
const SHEIN_URL_FILTERS = ['com','co.uk','com.mx','com.br','tw','se','pl'].map((t) => ({ hostSuffix: 'shein.' + t }));
const NEWS_URL_FILTERS = ['nytimes.com','theguardian.com','washingtonpost.com','bbc.com','bbc.co.uk','cnn.com','dailymail.co.uk','reuters.com','apnews.com','npr.org','foxnews.com','bloomberg.com','wsj.com','news.yahoo.co.jp'].map((h) => ({ hostSuffix: h }));
const GOOGLE_URL_FILTERS = [
  { hostEquals: 'www.google.com' }, { hostEquals: 'google.com' },
];
const GDRIVE_URL_FILTERS = [
  { hostEquals: 'docs.google.com' }, { hostEquals: 'drive.google.com' },
];
const BING_URL_FILTERS = [
  { hostEquals: 'www.bing.com' }, { hostEquals: 'bing.com' },
  { hostEquals: 'cn.bing.com' },
];
const DUCKDUCKGO_URL_FILTERS = [{ hostSuffix: 'duckduckgo.com' }];
const NAVER_URL_FILTERS = [{ hostSuffix: 'naver.com' }];
const WEATHER_URL_FILTERS = [{ hostSuffix: 'weather.com' }];
const SAMSUNG_URL_FILTERS = [{ hostSuffix: 'samsung.com' }];

// v1.10 flights pack
const KAYAK_URL_FILTERS = ['com','co.uk','de','fr','es','it','nl','ca','com.au','co.in','com.br','com.mx'].map((t) => ({ hostSuffix: 'kayak.' + t }));
const SKYSCANNER_URL_FILTERS = ['net','com','co.uk','de','fr','es','it','nl','co.in','com.au','jp','ca','com.mx','com.br'].map((t) => ({ hostSuffix: 'skyscanner.' + t }));
const FLIGHTAWARE_URL_FILTERS = [{ hostSuffix: 'flightaware.com' }];
const FLIGHTRADAR_URL_FILTERS = [{ hostSuffix: 'flightradar24.com' }, { hostSuffix: 'fr24.com' }];
const AIRLINES_URL_FILTERS = ['delta.com','united.com','aa.com','southwest.com','jetblue.com','alaskaair.com','ryanair.com','easyjet.com','lufthansa.com','britishairways.com','emirates.com','qatarairways.com'].map((h) => ({ hostSuffix: h }));
// v1.10 work-tools pack
const NETSUITE_URL_FILTERS = [{ hostSuffix: 'app.netsuite.com' }];
const ATLASSIAN_URL_FILTERS = [{ hostSuffix: 'atlassian.net' }];
const NOTION_URL_FILTERS = [{ hostSuffix: 'notion.so' }, { hostSuffix: 'notion.site' }];
const LOOM_URL_FILTERS = [{ hostSuffix: 'loom.com' }];
const FIGMA_URL_FILTERS = [{ hostSuffix: 'figma.com' }];
// v1.10 quick wins
const PRIMEVIDEO_URL_FILTERS = [{ hostSuffix: 'primevideo.com' }];
// v1.10 privacy-search + academic packs + Yelp
const ECOSIA_URL_FILTERS = [{ hostSuffix: 'ecosia.org' }];
const STARTPAGE_URL_FILTERS = [{ hostSuffix: 'startpage.com' }];
const BRAVESEARCH_URL_FILTERS = [{ hostEquals: 'search.brave.com' }];
const KAGI_URL_FILTERS = [{ hostSuffix: 'kagi.com' }];
const PUBMED_URL_FILTERS = [{ hostEquals: 'pubmed.ncbi.nlm.nih.gov' }];
const SCHOLAR_URL_FILTERS = [{ hostEquals: 'scholar.google.com' }];
const RESEARCHGATE_URL_FILTERS = [{ hostSuffix: 'researchgate.net' }];
const YELP_URL_FILTERS = ['com','ca','co.uk','de','fr','it','es','ie','com.au'].map((t) => ({ hostSuffix: 'yelp.' + t }));
// v1.10 mega coverage batch
const PLAYSTORE_URL_FILTERS = [{ hostEquals: 'play.google.com' }];
const APPSTORE_URL_FILTERS = [{ hostEquals: 'apps.apple.com' }];
const PARCELS_URL_FILTERS = ['ups.com','fedex.com','usps.com','dhl.com','dhl.de'].map((h) => ({ hostSuffix: h }));
const KICKSTARTER_URL_FILTERS = [{ hostSuffix: 'kickstarter.com' }];
const GOFUNDME_URL_FILTERS = [{ hostSuffix: 'gofundme.com' }];
const PATREON_URL_FILTERS = [{ hostSuffix: 'patreon.com' }];
const MEETUP_URL_FILTERS = [{ hostSuffix: 'meetup.com' }];
const RECIPES_URL_FILTERS = ['allrecipes.com','seriouseats.com','foodnetwork.com','bbcgoodfood.com'].map((h) => ({ hostSuffix: h }));
const RETAIL2_URL_FILTERS = ['costco.com','costco.ca','homedepot.com','homedepot.ca','lowes.com','ikea.com','nike.com','adidas.com','adidas.de','adidas.co.uk'].map((h) => ({ hostSuffix: h }));
const GAMING_URL_FILTERS = ['epicgames.com','gog.com','humblebundle.com','itch.io'].map((h) => ({ hostSuffix: h }));
const WEATHER2_URL_FILTERS = ['accuweather.com','wunderground.com'].map((h) => ({ hostSuffix: h }));
const SPORTS_URL_FILTERS = ['espn.com','flashscore.com','sofascore.com'].map((h) => ({ hostSuffix: h }));
const CN_URL_FILTERS = ['zhihu.com','weibo.com'].map((h) => ({ hostSuffix: h }));
const SHOPIFY_URL_FILTERS = [{ hostSuffix: 'myshopify.com' }];
const GODADDY_URL_FILTERS = [{ hostSuffix: 'godaddy.com' }];
const PRODUCTHUNT_URL_FILTERS = [{ hostSuffix: 'producthunt.com' }];
const CHANGEORG_URL_FILTERS = [{ hostSuffix: 'change.org' }];
const EVENTBRITE_URL_FILTERS = ['com','co.uk','ca','com.au','de','fr','es','it','nl','ie'].map((t) => ({ hostSuffix: 'eventbrite.' + t }));
// v1.10 international round 3
const INTL3_URL_FILTERS = [
  { hostEquals: 'search.yahoo.co.jp' },
  { hostSuffix: 'nicovideo.jp' }, { hostSuffix: 'daum.net' },
  { hostSuffix: 'gmarket.co.kr' }, { hostSuffix: '11st.co.kr' },
  { hostSuffix: 'myntra.com' }, { hostSuffix: 'zomato.com' },
  { hostSuffix: 'swiggy.com' }, { hostSuffix: 'bol.com' },
  { hostSuffix: 'otto.de' },
  { hostSuffix: 'mediamarkt.de' }, { hostSuffix: 'mediamarkt.at' },
  { hostSuffix: 'mediamarkt.es' }, { hostSuffix: 'mediamarkt.nl' },
  { hostSuffix: 'cdiscount.com' }, { hostSuffix: 'fnac.com' },
  { hostSuffix: 'trendyol.com' }, { hostSuffix: 'hepsiburada.com' },
  { hostSuffix: 'noon.com' },
  { hostSuffix: 'jumia.com.ng' }, { hostSuffix: 'jumia.co.ke' },
  { hostSuffix: 'jumia.com.eg' }, { hostSuffix: 'jumia.ma' },
  { hostSuffix: 'daraz.pk' }, { hostSuffix: 'daraz.lk' },
  { hostSuffix: 'daraz.com.bd' }, { hostSuffix: 'daraz.com.np' },
  { hostSuffix: 'americanas.com.br' }, { hostSuffix: 'magazineluiza.com.br' },
  { hostSuffix: 'wildberries.ru' }, { hostSuffix: 'ozon.ru' },
  { hostSuffix: 'avito.ru' },
];

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
  .concat(APPLEMUSIC_URL_FILTERS).concat(TWITCH_URL_FILTERS)
  .concat(WAYFAIR_URL_FILTERS).concat(BESTBUY_URL_FILTERS)
  .concat(BANDCAMP_URL_FILTERS).concat(LETTERBOXD_URL_FILTERS)
  .concat(TRIPADVISOR_URL_FILTERS).concat(MEESHO_URL_FILTERS)
  .concat(CAROUSELL_URL_FILTERS).concat(TAOBAO_URL_FILTERS)
  .concat(JD_URL_FILTERS).concat(LEBONCOIN_URL_FILTERS)
  .concat(OLX_URL_FILTERS).concat(WALLAPOP_URL_FILTERS)
  .concat(MARKTPLAATS_URL_FILTERS).concat(KLEINANZEIGEN_URL_FILTERS)
  .concat(ZALANDO_URL_FILTERS)
  .concat(NETFLIX_URL_FILTERS).concat(ROBLOX_URL_FILTERS)
  .concat(FANDOM_URL_FILTERS).concat(BILIBILI_URL_FILTERS)
  .concat(SHEIN_URL_FILTERS).concat(NEWS_URL_FILTERS)
  .concat(GOOGLE_URL_FILTERS).concat(GDRIVE_URL_FILTERS)
  .concat(BING_URL_FILTERS).concat(DUCKDUCKGO_URL_FILTERS)
  .concat(NAVER_URL_FILTERS).concat(WEATHER_URL_FILTERS)
  .concat(SAMSUNG_URL_FILTERS)
  .concat(KAYAK_URL_FILTERS).concat(SKYSCANNER_URL_FILTERS)
  .concat(FLIGHTAWARE_URL_FILTERS).concat(FLIGHTRADAR_URL_FILTERS)
  .concat(AIRLINES_URL_FILTERS)
  .concat(NETSUITE_URL_FILTERS).concat(ATLASSIAN_URL_FILTERS)
  .concat(NOTION_URL_FILTERS).concat(LOOM_URL_FILTERS)
  .concat(FIGMA_URL_FILTERS)
  .concat(PRIMEVIDEO_URL_FILTERS)
  .concat(ECOSIA_URL_FILTERS).concat(STARTPAGE_URL_FILTERS)
  .concat(BRAVESEARCH_URL_FILTERS).concat(KAGI_URL_FILTERS)
  .concat(PUBMED_URL_FILTERS).concat(SCHOLAR_URL_FILTERS)
  .concat(RESEARCHGATE_URL_FILTERS).concat(YELP_URL_FILTERS)
  .concat(PLAYSTORE_URL_FILTERS).concat(APPSTORE_URL_FILTERS)
  .concat(PARCELS_URL_FILTERS).concat(KICKSTARTER_URL_FILTERS)
  .concat(GOFUNDME_URL_FILTERS).concat(PATREON_URL_FILTERS)
  .concat(MEETUP_URL_FILTERS).concat(RECIPES_URL_FILTERS)
  .concat(RETAIL2_URL_FILTERS).concat(GAMING_URL_FILTERS)
  .concat(WEATHER2_URL_FILTERS).concat(SPORTS_URL_FILTERS)
  .concat(CN_URL_FILTERS)
  .concat(SHOPIFY_URL_FILTERS).concat(GODADDY_URL_FILTERS)
  .concat(PRODUCTHUNT_URL_FILTERS)
  .concat(CHANGEORG_URL_FILTERS).concat(EVENTBRITE_URL_FILTERS)
  .concat(INTL3_URL_FILTERS);

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
  const items = await chrome.storage.sync.get({ enabledUtmStrip: false });
  const flagOn = items.enabledUtmStrip === true;
  const hasPerm = await new Promise((resolve) => {
    chrome.permissions.contains({ origins: ['*://*/*'] }, (granted) => {
      void chrome.runtime.lastError;
      resolve(!!granted);
    });
  });
  if (flagOn && hasPerm) {
    await registerUtmContentScript();
    return;
  }
  await unregisterUtmContentScript();
  // Toggle explicitly OFF: hand the broad permission back to the browser.
  // The extension holds *://*/* only while the strip is actually on;
  // re-enabling re-triggers Chrome's permission prompt. (When the flag is
  // ON but the permission is missing we're mid-grant -- the prompt is on
  // screen -- so we deliberately do NOT remove anything in that state.)
  if (!flagOn && hasPerm && chrome.permissions.remove) {
    chrome.permissions.remove({ origins: ['*://*/*'] }, () => void chrome.runtime.lastError);
  }
}

chrome.runtime.onInstalled.addListener(syncUtmContentScript);
chrome.runtime.onStartup.addListener(syncUtmContentScript);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (!Object.prototype.hasOwnProperty.call(changes, 'enabledUtmStrip')) return;
  syncUtmContentScript();
});

if (chrome.permissions && chrome.permissions.onAdded) {
  chrome.permissions.onAdded.addListener(() => {
    // The popup closes (focus loss) the moment the permission dialog
    // opens, so its post-grant callback may never run. The grant itself
    // lands HERE, where the flag is already set optimistically -- register
    // the strip right away.
    syncUtmContentScript();
  });
}

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

// i18n helper: localized string when the locale provides one, English
// fallback otherwise (getMessage returns '' for unknown keys).
function t(key, fallback, subs) {
  try {
    const m = chrome.i18n && chrome.i18n.getMessage
      ? chrome.i18n.getMessage(key, subs) : '';
    return m || fallback;
  } catch (_e) {
    return fallback;
  }
}

// -- Local-only stats -----------------------------------------------------
// Counts live in chrome.storage.local (NEVER sync, NEVER the network):
// how many URLs were cleaned, how many characters of junk removed, plus
// unwrap/skip/copy/bulk event counts and an optional per-site tally.
// Purely informational -- shown in the popup footer and the Advanced page.
// Writes are chained so concurrent events can't clobber each other within
// one service-worker lifetime; across restarts the get/set pair is atomic
// enough for a vanity counter.
let statsChain = Promise.resolve();
function recordStats(delta) {
  statsChain = statsChain.then(() => new Promise((resolve) => {
    chrome.storage.local.get({ stats: null }, (items) => {
      void chrome.runtime.lastError;
      const s = (items && items.stats) || {
        urls: 0, chars: 0, unwraps: 0, skips: 0, copies: 0, bulk: 0,
        perSite: {}, since: Date.now(),
      };
      if (!s.perSite) s.perSite = {};
      for (const k of ['urls', 'chars', 'unwraps', 'skips', 'copies', 'bulk']) {
        if (delta[k]) s[k] += delta[k];
      }
      if (delta.site && Object.keys(s.perSite).length < 400) {
        s.perSite[delta.site] = (s.perSite[delta.site] || 0) + 1;
      }
      chrome.storage.local.set({ stats: s }, () => {
        void chrome.runtime.lastError;
        resolve();
      });
    });
  })).catch(() => { statsChain = Promise.resolve(); });
}

// Per-tab stash of the pre-rewrite URL, so the popup can show what was
// removed and offer "Copy original URL". storage.session: memory-only,
// cleared when the browser closes, never synced.
function stashOriginal(tabId, original, cleaned) {
  if (!chrome.storage.session || tabId == null) return;
  const key = 'orig:' + tabId;
  chrome.storage.session.get(key, (items) => {
    void chrome.runtime.lastError;
    const prev = items ? items[key] : null;
    // Second pass on the SAME page (e.g. Amazon's title-slug pass rewrites
    // the already-shortened URL again): chain back to the FIRST original,
    // so the popup's diff shows everything the address bar actually lost.
    // The chain condition is exact -- the new rewrite must start where the
    // previous one ended -- so cross-page stashes can never merge.
    const trueOriginal = prev && prev.cleaned === original && typeof prev.original === 'string'
      ? prev.original
      : original;
    chrome.storage.session.set(
      { [key]: { original: trueOriginal, cleaned, t: Date.now() } },
      () => void chrome.runtime.lastError,
    );
  });
}

// Tabs come and go; their stashes shouldn't outlive them. (Stale entries
// are also ignored by the popup's cleaned===tab.url check, so this is
// housekeeping, not correctness.)
if (chrome.tabs && chrome.tabs.onRemoved) {
  chrome.tabs.onRemoved.addListener((tabId) => {
    if (!chrome.storage.session) return;
    chrome.storage.session.remove('orig:' + tabId, () => void chrome.runtime.lastError);
  });
}

// Where the copy menus appear. file:///* is included on Chrome so the
// menus work on saved pages and local HTML (including the dev smoke-test
// page): Chrome only surfaces file-pattern menu items when the user has
// granted "Allow access to file URLs" -- which is exactly when the
// clipboard injection can run there, so no dead menu items. Firefox
// cannot inject into file: documents at all, so the pattern is omitted
// there (an item that appears and silently fails is worse than none).
const MENU_URL_PATTERNS = chrome.runtime.getURL('').startsWith('moz-extension:')
  ? ['http://*/*', 'https://*/*']
  : ['http://*/*', 'https://*/*', 'file:///*'];

const CONTEXT_MENU_ID = 'copy-clean-url';
const SELECTION_MENU_ID = 'copy-clean-url-selection';


// removeAll + create is idempotent and covers both browsers: Chrome
// persists menus across restarts, Firefox event pages don't reliably —
// so we recreate on BOTH onInstalled and onStartup. Note that
// contextMenus.create reports duplicate-id failures via
// chrome.runtime.lastError in its callback; a try/catch can't see them.
function ensureContextMenu() {
  chrome.contextMenus.removeAll(() => {
    void chrome.runtime.lastError;
    // documentUrlPatterns: only show the menus where the clipboard
    // injection can actually run. On restricted pages (chrome://, the
    // Web Store, the PDF viewer) the item would appear and then fail
    // with zero feedback — an absent menu is honest, a dead one isn't.
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: t('menuCopyClean', 'Copy clean URL'),
      contexts: ['link', 'page'],
      documentUrlPatterns: MENU_URL_PATTERNS,
    }, () => void chrome.runtime.lastError);
    // Selected TEXT containing a URL (plain-prose links in emails/docs
    // that aren't anchor tags). TextUrlExtractor handles schemes-less
    // domains, surrounding prose, and trailing punctuation.
    chrome.contextMenus.create({
      id: SELECTION_MENU_ID,
      title: t('menuCopyCleanSelection', 'Copy clean URL from selection'),
      contexts: ['selection'],
      documentUrlPatterns: MENU_URL_PATTERNS,
    }, () => void chrome.runtime.lastError);
  });
}
// NOTE on menu shape: Chrome shows a lone item INLINE in the context menu
// but nests 2+ visible items under an extension submenu. The copy item and
// the selection item never appear in the same context, so each stays
// inline. Rich copy formats and the cleanup reporter therefore live in the
// POPUP's format menu, not here -- adding them back as context-menu items
// would bury "Copy clean URL" one hover deep.

// Build the prefilled new-issue URL for a report. Body shows the original
// URL and the cleaned form (or "unchanged"). Values are truncated so the
// final URL stays well under browser/GitHub URL-length limits.
function buildReportUrl(sourceUrl, cleaned) {
  const trim = (s) => (s && s.length > 1500 ? s.slice(0, 1500) + '…' : (s || ''));
  let host = '';
  try { host = new URL(sourceUrl).hostname; } catch (_e) { /* keep '' */ }
  const title = 'Link didn\'t clean right' + (host ? ': ' + host : '');
  const body = [
    '**Original URL**',
    '```',
    trim(sourceUrl),
    '```',
    '**What the extension produced**',
    '```',
    cleaned === sourceUrl ? '(unchanged)' : trim(cleaned),
    '```',
    '**What I expected instead**',
    '',
    '(fill in)',
    '',
    '_Reported from the right-click menu, v' + chrome.runtime.getManifest().version + '_',
  ].join('\n');
  return 'https://github.com/Tommytwolegs/link-shortener/issues/new'
    + '?title=' + encodeURIComponent(title)
    + '&body=' + encodeURIComponent(body);
}

chrome.runtime.onInstalled.addListener(ensureContextMenu);
chrome.runtime.onStartup.addListener(ensureContextMenu);

// Try every per-site shortener in turn, then fall back to UTM stripping,
// then to the original URL. Returns the cleanest form we can produce.
function cleanAnyUrl(input, keepParams, prefs) {
  // First, unwrap tracking redirectors (Gmail/Google's /url?q=, Facebook's
  // l.php?u=, Reddit's out.reddit.com, YouTube's /redirect) so the per-site
  // cleanup below runs against the REAL destination. Context-menu only —
  // the address bar never sees these URLs.
  if (self.RedirectUnwrapper) {
    input = self.RedirectUnwrapper.unwrapRedirects(input);
  }
  let url;
  try {
    url = new URL(input);
  } catch (_e) {
    return input;
  }
  const h = url.hostname;

  let working = input;
  let handled = false;
  // "Include Amazon item name": honor the user's slug preference on every
  // copy surface (popup preview/copy/QR, context menu, shortcut, omnibox,
  // bulk cleaner), not just the address-bar rewrite. The slug is taken
  // from the URL itself -- the same rule the content script applies to
  // in-page links -- so this never invents a title, it only KEEPS one
  // that the URL already carries.
  if (prefs && prefs.amazonSlug && self.AmazonLinkShortener
      && typeof self.AmazonLinkShortener.isAmazonHost === 'function'
      && self.AmazonLinkShortener.isAmazonHost(h)
      && typeof self.AmazonLinkShortener.extractSlug === 'function') {
    const A = self.AmazonLinkShortener;
    let slug = null;
    try { slug = A.extractSlug(url.pathname, url.search); } catch (_e) { slug = null; }
    const out = A.shortenAmazonUrl(working, slug ? { slug } : undefined);
    if (out) {
      working = out;
      handled = true;
    }
  }
  if (!handled) {
    for (const s of SHORTENERS) {
      if (!s.match(h)) continue;
      const out = s.shorten(working);
      if (out) {
        working = out;
        break;
      }
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

// Shared by the context menu, the keyboard shortcut, and (via onMessage)
// the popup: clean `sourceUrl` and copy the result to the clipboard of tab
// `tabId` through an injected script. `activeTab` is granted by any of
// those user gestures. The user's "always keep these parameters" list is
// read fresh on every call — if this gesture is what woke the service
// worker, a module-level cache would still be empty here. (Skip-domains is
// intentionally not honored: an explicit copy gesture means the user wants
// the cleanest possible URL even on hosts they've allowlisted.)
function copyTextToTab(tabId, text, html) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: (text, html) => {
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
      function plain() {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
        } else {
          legacyCopy(text);
        }
      }
      // For the HTML format, put BOTH flavors on the clipboard: rich
      // editors paste a live link, plain editors paste the source.
      if (html && navigator.clipboard && navigator.clipboard.write
          && typeof ClipboardItem !== 'undefined') {
        try {
          navigator.clipboard.write([new ClipboardItem({
            'text/plain': new Blob([text], { type: 'text/plain' }),
            'text/html': new Blob([html], { type: 'text/html' }),
          })]).catch(plain);
        } catch (_e) {
          plain();
        }
      } else {
        plain();
      }
    },
    args: [text, html || null],
  }, () => void chrome.runtime.lastError);
}

function copyCleanUrlToTab(tabId, sourceUrl) {
  chrome.storage.sync.get({ utmStripKeepParams: [], includeAmazonTitle: false }, (items) => {
    const keepParams = Array.isArray(items.utmStripKeepParams) ? items.utmStripKeepParams : [];
    const cleaned = cleanAnyUrl(sourceUrl, keepParams, { amazonSlug: items.includeAmazonTitle === true });
    recordStats({
      copies: 1,
      urls: cleaned === sourceUrl ? 0 : 1,
      chars: Math.max(0, sourceUrl.length - cleaned.length),
    });
    copyTextToTab(tabId, cleaned, null);
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || tab.id == null) return;
  if (info.menuItemId === CONTEXT_MENU_ID) {
    const sourceUrl = info.linkUrl || info.pageUrl;
    if (sourceUrl) copyCleanUrlToTab(tab.id, sourceUrl);
    return;
  }
  if (info.menuItemId === SELECTION_MENU_ID) {
    const extracted = self.TextUrlExtractor
      && self.TextUrlExtractor.extractUrlFromText(info.selectionText);
    if (extracted) copyCleanUrlToTab(tab.id, extracted);
    // No URL in the selection: quietly do nothing — a notification would
    // need the notifications permission for a case the user can see.
    return;
  }
});

// -- Keyboard shortcut: "copy-clean-url" --------------------------------------
// Registered under `commands` in the manifest; default Ctrl+Shift+L
// (Cmd+Shift+L on Mac). Chrome passes the active tab as the second
// argument; some Firefox versions don't, so fall back to querying it.
// Non-http(s) pages (chrome://, about:) are ignored — nothing to clean
// and executeScript would fail there anyway.
if (chrome.commands && chrome.commands.onCommand) {
  chrome.commands.onCommand.addListener((command, tab) => {
    if (command !== 'copy-clean-url') return;
    const run = (t) => {
      if (t && t.id != null && t.url && /^https?:/i.test(t.url)) {
        copyCleanUrlToTab(t.id, t.url);
      }
    };
    if (tab && tab.id != null) {
      run(tab);
      return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      void chrome.runtime.lastError;
      run(tabs && tabs[0]);
    });
  });
}

// -- Omnibox keyword: "clean <url>" --------------------------------------------
// Type "clean", Tab/Space, then paste a URL: the suggestion shows the
// cleaned form; Enter navigates to it (per disposition). Clipboard
// writes aren't possible here — omnibox input is not an activeTab
// gesture — so navigation IS the feature: you land on the clean URL and
// the address bar has it. Only http(s) results are navigated.
if (chrome.omnibox) {
  const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

  const DEFAULT_HINT = 'Clean a URL: paste it after the keyword';
  chrome.omnibox.setDefaultSuggestion({ description: DEFAULT_HINT });

  function cleanFromOmnibox(text, cb) {
    const extracted = self.TextUrlExtractor
      && self.TextUrlExtractor.extractUrlFromText(text);
    if (!extracted) { cb(null); return; }
    chrome.storage.sync.get({ utmStripKeepParams: [], includeAmazonTitle: false }, (items) => {
      const keepParams = Array.isArray(items.utmStripKeepParams) ? items.utmStripKeepParams : [];
      const cleaned = cleanAnyUrl(extracted, keepParams, { amazonSlug: items.includeAmazonTitle === true });
      try {
        const u = new URL(cleaned);
        cb((u.protocol === 'http:' || u.protocol === 'https:') ? cleaned : null);
      } catch (_e) { cb(null); }
    });
  }

  chrome.omnibox.onInputChanged.addListener((text, suggest) => {
    cleanFromOmnibox(text, (cleaned) => {
      if (!cleaned) {
        // Live feedback instead of a silent dead-end: tell the user why
        // Enter would do nothing right now.
        chrome.omnibox.setDefaultSuggestion({
          description: text.trim()
            ? 'No URL detected yet - paste a full link'
            : DEFAULT_HINT,
        });
        suggest([]);
        return;
      }
      // Plain escaped text — Chrome supports <url>/<match> markup here
      // but Firefox may render the tags literally, so we use none.
      chrome.omnibox.setDefaultSuggestion({
        description: 'Press Enter to open: ' + escapeXml(cleaned),
      });
      suggest([{ content: cleaned, description: 'Clean: ' + escapeXml(cleaned) }]);
    });
  });

  chrome.omnibox.onInputEntered.addListener((text, disposition) => {
    cleanFromOmnibox(text, (cleaned) => {
      if (!cleaned) return;
      if (disposition === 'newForegroundTab') {
        chrome.tabs.create({ url: cleaned, active: true });
      } else if (disposition === 'newBackgroundTab') {
        chrome.tabs.create({ url: cleaned, active: false });
      } else {
        chrome.tabs.update({ url: cleaned });
      }
    });
  });
}

// -- Popup message API ---------------------------------------------------------
// The popup asks the background to clean the current tab's URL so its
// preview + copy button reuse the exact pipeline as the context menu and
// keyboard shortcut (redirect unwrapping -> per-site shortener -> UTM strip).
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== 'clean-url' || typeof msg.url !== 'string') return undefined;
  chrome.storage.sync.get({ utmStripKeepParams: [], includeAmazonTitle: false }, (items) => {
    const keepParams = Array.isArray(items.utmStripKeepParams) ? items.utmStripKeepParams : [];
    sendResponse({ cleaned: cleanAnyUrl(msg.url, keepParams, { amazonSlug: items.includeAmazonTitle === true }) });
  });
  return true; // keep the message channel open for the async sendResponse
});

// Content scripts report every successful address-bar rewrite here: the
// original goes into the per-tab session stash (popup diff + "Copy
// original"), and the local stats tick up. The popup reports copy
// gestures, and the bulk cleaner page sends whole text blobs to reuse
// the exact cleanup pipeline.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return undefined;
  if (msg.type === 'url-rewritten'
      && typeof msg.original === 'string' && typeof msg.cleaned === 'string') {
    const tabId = sender && sender.tab ? sender.tab.id : null;
    stashOriginal(tabId, msg.original, msg.cleaned);
    recordStats({
      urls: 1,
      chars: Math.max(0, msg.original.length - msg.cleaned.length),
      site: typeof msg.site === 'string' ? msg.site.slice(0, 64) : undefined,
    });
    return undefined;
  }
  if (msg.type === 'record-copy') {
    recordStats({
      copies: 1,
      urls: msg.changed ? 1 : 0,
      chars: typeof msg.saved === 'number' && msg.saved > 0 ? msg.saved : 0,
    });
    return undefined;
  }
  if (msg.type === 'open-report'
      && typeof msg.original === 'string' && typeof msg.cleaned === 'string') {
    // Prefilled GitHub issue. User-initiated navigation; the extension
    // itself still makes zero network requests.
    chrome.tabs.create({
      url: buildReportUrl(msg.original, msg.cleaned),
      active: true,
    }, () => void chrome.runtime.lastError);
    return undefined;
  }
  if (msg.type === 'bulk-clean' && typeof msg.text === 'string') {
    chrome.storage.sync.get({ utmStripKeepParams: [], includeAmazonTitle: false }, (items) => {
      const keepParams = Array.isArray(items.utmStripKeepParams) ? items.utmStripKeepParams : [];
      const result = self.TextUrlExtractor && self.TextUrlExtractor.cleanAllUrlsInText
        ? self.TextUrlExtractor.cleanAllUrlsInText(msg.text, (u) => cleanAnyUrl(u, keepParams, { amazonSlug: items.includeAmazonTitle === true }))
        : { text: msg.text, found: 0, changed: 0, saved: 0 };
      if (result.changed > 0) {
        recordStats({ bulk: result.changed, urls: result.changed, chars: result.saved });
      }
      sendResponse(result);
    });
    return true;
  }
  return undefined;
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
  ['WayfairLinkShortener', 'isWayfairHost'],
  ['BestbuyLinkShortener', 'isBestbuyHost'],
  ['BandcampLinkShortener', 'isBandcampHost'],
  ['LetterboxdLinkShortener', 'isLetterboxdHost'],
  ['TripadvisorLinkShortener', 'isTripadvisorHost'],
  ['MeeshoLinkShortener', 'isMeeshoHost'],
  ['CarousellLinkShortener', 'isCarousellHost'],
  ['TaobaoLinkShortener', 'isTaobaoHost'],
  ['JdLinkShortener', 'isJdHost'],
  ['LeboncoinLinkShortener', 'isLeboncoinHost'],
  ['OlxLinkShortener', 'isOlxHost'],
  ['WallapopLinkShortener', 'isWallapopHost'],
  ['MarktplaatsLinkShortener', 'isMarktplaatsHost'],
  ['KleinanzeigenLinkShortener', 'isKleinanzeigenHost'],
  ['ZalandoLinkShortener', 'isZalandoHost'],
  ['NetflixLinkShortener', 'isNetflixHost'],
  ['RobloxLinkShortener', 'isRobloxHost'],
  ['FandomLinkShortener', 'isFandomHost'],
  ['BilibiliLinkShortener', 'isBilibiliHost'],
  ['SheinLinkShortener', 'isSheinHost'],
  ['NewsLinkShortener', 'isNewsHost'],
  ['GoogleLinkShortener', 'isGoogleHost'],
  ['GdriveLinkShortener', 'isGdriveHost'],
  ['BingLinkShortener', 'isBingHost'],
  ['DuckduckgoLinkShortener', 'isDuckduckgoHost'],
  ['NaverLinkShortener', 'isNaverHost'],
  ['WeatherLinkShortener', 'isWeatherHost'],
  ['SamsungLinkShortener', 'isSamsungHost'],
  ['KayakLinkShortener', 'isKayakHost'],
  ['SkyscannerLinkShortener', 'isSkyscannerHost'],
  ['FlightawareLinkShortener', 'isFlightawareHost'],
  ['FlightradarLinkShortener', 'isFlightradarHost'],
  ['AirlinesLinkShortener', 'isAirlineHost'],
  ['NetsuiteLinkShortener', 'isNetsuiteHost'],
  ['AtlassianLinkShortener', 'isAtlassianHost'],
  ['NotionLinkShortener', 'isNotionHost'],
  ['LoomLinkShortener', 'isLoomHost'],
  ['FigmaLinkShortener', 'isFigmaHost'],
  ['PrimevideoLinkShortener', 'isPrimevideoHost'],
  ['EcosiaLinkShortener', 'isEcosiaHost'],
  ['StartpageLinkShortener', 'isStartpageHost'],
  ['BravesearchLinkShortener', 'isBravesearchHost'],
  ['KagiLinkShortener', 'isKagiHost'],
  ['PubmedLinkShortener', 'isPubmedHost'],
  ['ScholarLinkShortener', 'isScholarHost'],
  ['ResearchgateLinkShortener', 'isResearchgateHost'],
  ['YelpLinkShortener', 'isYelpHost'],
  ['PlaystoreLinkShortener', 'isPlaystoreHost'],
  ['AppstoreLinkShortener', 'isAppstoreHost'],
  ['ParcelsLinkShortener', 'isParcelsHost'],
  ['KickstarterLinkShortener', 'isKickstarterHost'],
  ['GofundmeLinkShortener', 'isGofundmeHost'],
  ['PatreonLinkShortener', 'isPatreonHost'],
  ['MeetupLinkShortener', 'isMeetupHost'],
  ['AllrecipesLinkShortener', 'isAllrecipesHost'],
  ['SeriouseatsLinkShortener', 'isSeriouseatsHost'],
  ['FoodnetworkLinkShortener', 'isFoodnetworkHost'],
  ['BbcgoodfoodLinkShortener', 'isBbcgoodfoodHost'],
  ['CostcoLinkShortener', 'isCostcoHost'],
  ['HomedepotLinkShortener', 'isHomedepotHost'],
  ['LowesLinkShortener', 'isLowesHost'],
  ['IkeaLinkShortener', 'isIkeaHost'],
  ['NikeLinkShortener', 'isNikeHost'],
  ['AdidasLinkShortener', 'isAdidasHost'],
  ['EpicLinkShortener', 'isEpicHost'],
  ['GogLinkShortener', 'isGogHost'],
  ['HumbleLinkShortener', 'isHumbleHost'],
  ['ItchioLinkShortener', 'isItchioHost'],
  ['AccuweatherLinkShortener', 'isAccuweatherHost'],
  ['WundergroundLinkShortener', 'isWundergroundHost'],
  ['EspnLinkShortener', 'isEspnHost'],
  ['FlashscoreLinkShortener', 'isFlashscoreHost'],
  ['SofascoreLinkShortener', 'isSofascoreHost'],
  ['ZhihuLinkShortener', 'isZhihuHost'],
  ['WeiboLinkShortener', 'isWeiboHost'],
  ['ShopifyLinkShortener', 'isShopifyHost'],
  ['GodaddyLinkShortener', 'isGodaddyHost'],
  ['ProducthuntLinkShortener', 'isProducthuntHost'],
  ['ChangeorgLinkShortener', 'isChangeorgHost'],
  ['EventbriteLinkShortener', 'isEventbriteHost'],
  ['YahoojpLinkShortener', 'isYahoojpHost'],
  ['NiconicoLinkShortener', 'isNiconicoHost'],
  ['DaumLinkShortener', 'isDaumHost'],
  ['GmarketLinkShortener', 'isGmarketHost'],
  ['ElevenstLinkShortener', 'isElevenstHost'],
  ['MyntraLinkShortener', 'isMyntraHost'],
  ['ZomatoLinkShortener', 'isZomatoHost'],
  ['SwiggyLinkShortener', 'isSwiggyHost'],
  ['BolLinkShortener', 'isBolHost'],
  ['OttoLinkShortener', 'isOttoHost'],
  ['MediamarktLinkShortener', 'isMediamarktHost'],
  ['CdiscountLinkShortener', 'isCdiscountHost'],
  ['FnacLinkShortener', 'isFnacHost'],
  ['TrendyolLinkShortener', 'isTrendyolHost'],
  ['HepsiburadaLinkShortener', 'isHepsiburadaHost'],
  ['NoonLinkShortener', 'isNoonHost'],
  ['JumiaLinkShortener', 'isJumiaHost'],
  ['DarazLinkShortener', 'isDarazHost'],
  ['AmericanasLinkShortener', 'isAmericanasHost'],
  ['MagaluLinkShortener', 'isMagaluHost'],
  ['WildberriesLinkShortener', 'isWildberriesHost'],
  ['OzonLinkShortener', 'isOzonHost'],
  ['AvitoLinkShortener', 'isAvitoHost'],
];

// Per-site dispatch table for cleanAnyUrl (context menu / keyboard shortcut /
// popup message), generated ONCE per service-worker wake from HOST_CHECKS.
// Replaces a ~300-line hand-written closure array that was rebuilt on every
// call; verified 1:1 against it before removal. Resolution rule: every
// module exports a `shortenUrl` alias except amazon (shortenAmazonUrl) and
// the seven travel modules (shortPropertyUrl) — exactly the functions the
// old array named. Host order is immaterial: the collision audit shows
// every host is claimed by exactly one module. Modules all load before
// this file (importScripts / manifest scripts order), and cleanAnyUrl only
// runs from event handlers, so the table is always populated by call time.
const SHORTENERS = HOST_CHECKS.map(([ns, isHostFn]) => {
  const api = self[ns];
  if (!api || typeof api[isHostFn] !== 'function') return null;
  const shorten = api.shortenUrl || api.shortenAmazonUrl || api.shortPropertyUrl;
  if (typeof shorten !== 'function') return null;
  return { match: (h) => api[isHostFn](h), shorten: (u) => shorten(u) };
}).filter(Boolean);

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

// -- Skip redirect pages -------------------------------------------------------
// When the user CLICKS a wrapped link (search click-trackers, social
// outbound wrappers, affiliate wrappers, AMP viewers), navigate straight
// to the real destination instead of bouncing through the tracker. Same
// zero-network recovery as the copy pipeline: the target is decoded from
// the URL itself (RedirectUnwrapper), never fetched.
//
// Deliberate exclusions:
//   * Outlook SafeLinks — corporate click-time scanning has real security
//     value; SafeLinks stays copy-time-only. Its hosts are absent from the
//     filter below AND rejected in the handler (defense in depth).
//   * Subframes — only top-level navigations are redirected.
//
// Toggle: `enabledRedirectSkip` (popup, default ON), gated on the master
// switch. Uses webNavigation (held since v1.0 for SPA detection) +
// tabs.update — NO new permissions.
const REDIRECT_SKIP_FILTERS = [
  { hostEquals: 'www.google.com', pathPrefix: '/url' },
  { hostEquals: 'google.com', pathPrefix: '/url' },
  { hostEquals: 'www.google.com', pathPrefix: '/amp/' },
  { hostEquals: 'google.com', pathPrefix: '/amp/' },
  { hostEquals: 'www.bing.com', pathPrefix: '/ck/a' },
  { hostEquals: 'bing.com', pathPrefix: '/ck/a' },
  { hostEquals: 'cn.bing.com', pathPrefix: '/ck/a' },
  { hostEquals: 'www.bing.com', pathPrefix: '/amp/' },
  { hostEquals: 'bing.com', pathPrefix: '/amp/' },
  { hostSuffix: 'cdn.ampproject.org' },
  { hostEquals: 'l.facebook.com' },
  { hostEquals: 'lm.facebook.com' },
  { hostEquals: 'l.messenger.com' },
  { hostEquals: 'l.instagram.com' },
  { hostEquals: 'out.reddit.com' },
  { hostEquals: 'www.youtube.com', pathPrefix: '/redirect' },
  { hostEquals: 'youtube.com', pathPrefix: '/redirect' },
  { hostEquals: 'm.youtube.com', pathPrefix: '/redirect' },
  { hostEquals: 'www.youtube.com', pathPrefix: '/attribution_link' },
  { hostEquals: 'youtube.com', pathPrefix: '/attribution_link' },
  { hostEquals: 'm.youtube.com', pathPrefix: '/attribution_link' },
  { hostEquals: 'steamcommunity.com', pathPrefix: '/linkfilter/' },
  { hostEquals: 'www.steamcommunity.com', pathPrefix: '/linkfilter/' },
  { hostEquals: 't.umblr.com', pathPrefix: '/redirect' },
  { hostEquals: 'href.li' },
  { hostEquals: 'www.href.li' },
  { hostEquals: 'go.redirectingat.com' },
  { hostEquals: 'go.skimresources.com' },
  { hostEquals: 'slack-redir.net', pathPrefix: '/link' },
  { hostEquals: 'www.slack-redir.net', pathPrefix: '/link' },
  { hostEquals: 'exit.sc' },
  { hostEquals: 'www.exit.sc' },
  { hostEquals: 'duckduckgo.com', pathPrefix: '/l/' },
  { hostEquals: 'html.duckduckgo.com', pathPrefix: '/l/' },
  { hostEquals: 'lite.duckduckgo.com', pathPrefix: '/l/' },
  { hostEquals: 'vk.com', pathPrefix: '/away' },
  { hostEquals: 'www.vk.com', pathPrefix: '/away' },
  { hostEquals: 'm.vk.com', pathPrefix: '/away' },
  { hostEquals: 'disq.us', pathPrefix: '/url' },
  { hostEquals: 'www.disq.us', pathPrefix: '/url' },
  { hostEquals: 't.me', pathPrefix: '/iv' },
  { hostEquals: 'prf.hn', pathPrefix: '/click' },
  { hostEquals: 'www.prf.hn', pathPrefix: '/click' },
  { hostEquals: 'www.awin1.com' },
  { hostEquals: 'awin1.com' },
  { hostSuffix: 'anrdoezrs.net' },
  { hostSuffix: 'dpbolvw.net' },
  { hostSuffix: 'tkqlhce.com' },
  { hostSuffix: 'kqzyfj.com' },
  { hostSuffix: 'jdoqocy.com' },
  { hostEquals: 'click.linksynergy.com' },
  { hostEquals: 'www.pixiv.net', pathPrefix: '/jump.php' },
  { hostEquals: 'pixiv.net', pathPrefix: '/jump.php' },
  { hostEquals: 'www.deviantart.com', pathPrefix: '/users/outgoing' },
  { hostEquals: 'deviantart.com', pathPrefix: '/users/outgoing' },
  // NOTE: googleadservices.com/aclk and bing.com/aclick are deliberately
  // ABSENT — ad-click wrappers unwrap on copy only (advertiser billing).
];

// Enterprise email-protection wrappers are NEVER click-skipped: their
// click-time scanning has real security value. They unwrap on copy only.
// (None of them are in the filter list either — this is defense in depth.)
const PROTECTION_HOST_RE = new RegExp(
  '(?:^|\\.)safelinks\\.protection\\.outlook\\.com$'
  + '|^urldefense(?:\\.proofpoint)?\\.(?:com|us)$'
  + '|^linkprotect\\.cudasvc\\.com$', 'i');

function handleRedirectSkip(details) {
  if (details.frameId !== 0) return;
  if (!self.RedirectUnwrapper) return;
  let host;
  try { host = new URL(details.url).hostname; } catch (_e) { return; }
  if (PROTECTION_HOST_RE.test(host)) return;
  const target = self.RedirectUnwrapper.unwrapRedirects(details.url);
  if (!target || target === details.url) return;
  if (!/^https?:/i.test(target)) return;
  chrome.storage.sync.get({ enabled: true, enabledRedirectSkip: true }, (items) => {
    if (items.enabled === false || items.enabledRedirectSkip === false) return;
    chrome.tabs.update(details.tabId, { url: target }, () => void chrome.runtime.lastError);
    // Skip transparency: stash the wrapper -> destination pair so the popup
    // on the landing page can show an "unwrapped:" chip and offer the
    // original wrapper URL back. Same memory-only session stash as the
    // in-place rewrites.
    stashOriginal(details.tabId, details.url, target);
    recordStats({
      skips: 1,
      urls: 1,
      chars: Math.max(0, details.url.length - target.length),
    });
  });
}

chrome.webNavigation.onBeforeNavigate.addListener(handleRedirectSkip, {
  url: REDIRECT_SKIP_FILTERS,
});
