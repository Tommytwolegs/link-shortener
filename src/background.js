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
    'vimeo.js',
    'dailymotion.js',
    'waze.js',
    'zillow.js',
    'redfin.js',
    'realtor.js',
    'indeed.js',
    'glassdoor.js',
    'poshmark.js',
    'depop.js',
    'stockx.js',
    'goat.js',
    'grailed.js',
    'rottentomatoes.js',
    'metacritic.js',
    'genius.js',
    'discogs.js',
    'deezer.js',
    'tidal.js',
    'pandora.js',
    'gitlab.js',
    'bitbucket.js',
    'npm.js',
    'pypi.js',
    'dockerhub.js',
    'huggingface.js',
    'kaggle.js',
    'dropbox.js',
    'box.js',
    'wetransfer.js',
    'mediafire.js',
    'behance.js',
    'dribbble.js',
    'artstation.js',
    'flickr.js',
    'unsplash.js',
    'pexels.js',
    'deviantart.js',
    'pixiv.js',
    'pixabay.js',
    'shutterstock.js',
    'gettyimages.js',
    'freepik.js',
    'giphy.js',
    'tenor.js',
    'vsco.js',
    'smugmug.js',
    'adobestock.js',
    'alamy.js',
    'vecteezy.js',
    'istock.js',
    'dreamstime.js',
    'imgur.js',
    'rumble.js',
    'kick.js',
    'crunchyroll.js',
    'odysee.js',
    'myanimelist.js',
    'bitchute.js',
    'newgrounds.js',
    'coursera.js',
    'udemy.js',
    'khanacademy.js',
    'edx.js',
    'skillshare.js',
    'brilliant.js',
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
    'tickets.js',
    'fooddelivery.js',
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
    'dnr.js',
    'siteopts.js',
    'history.js',
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

// -- First-run welcome page (v1.14) -------------------------------------------
// Fresh installs only (never updates): a local, bundled page explaining the
// badge, the ways to get a clean link, and where the opt-ins live. Zero
// network, like everything else.

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason !== 'install') return;
  chrome.tabs.create(
    { url: chrome.runtime.getURL('src/welcome.html') },
    () => void chrome.runtime.lastError
  );
});

// -- One-shot migration: Airlines pack toggle -> per-carrier toggles (v1.14) --
// The single enabledAirlines key governed all 12 carriers through v1.13.
// Carriers now have their own keys (default true, like every site key), so
// the only state worth carrying over is "the user had the pack OFF": write
// all carrier keys false once. The legacy key itself is left in storage,
// harmless and ignored.

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason !== 'update') return;
  if (!self.AirlinesLinkShortener) return;
  const legacy = self.AirlinesLinkShortener.LEGACY_STORAGE_KEY;
  chrome.storage.sync.get({ [legacy]: true }, (items) => {
    void chrome.runtime.lastError;
    if (items[legacy] === false) {
      const off = {};
      for (const a of self.AirlinesLinkShortener.AIRLINES) off[a.key] = false;
      chrome.storage.sync.set(off);
    }
  });
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
  const items = await chrome.storage.sync.get({
    enabledUtmStrip: false, enabledActiveStrip: false, enabledActiveSkip: false,
  });
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
  // The Active strip and Active skip SHARE this permission: only hand it
  // back when all three features are off, or toggling one would silently
  // kill the others.
  if (!flagOn && items.enabledActiveStrip !== true && items.enabledActiveSkip !== true
      && hasPerm && chrome.permissions.remove) {
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

// ---------------------------------------------------------------------------
// Active strip: declarativeNetRequest dynamic rules that remove universal
// tracking params from main_frame navigations BEFORE the request leaves the
// browser (SPEC-active-mode.md). Same optional *://*/* permission and the
// same skip/keep lists as the Universal tracking strip; the rule content is
// computed by the pure builder in dnr.js. An over-strip here breaks the
// request rather than the address bar, so ONLY the utm.js universal denylist
// feeds this — never per-site params.
// ---------------------------------------------------------------------------

// The removeParams set of the currently installed rule; null when inactive.
// The attribution diff below only counts a navigation as "blocked before
// load" when the URL delta is exactly a removal of params from this set.
let activeRemoveSet = null;

// MV3 wrinkle: the DNR rule OUTLIVES this service worker (the browser
// enforces it while we sleep), but the module-global above does not. After
// an idle-kill, the first webNavigation event wakes a fresh worker where
// activeRemoveSet is null -- without repair, attribution and the "blocked"
// stat would silently stop until the next browser restart or toggle flip.
// ensureActiveRemoveSet() reconstructs the set from the installed rule
// itself (getDynamicRules reads reality and writes nothing), at most once
// per worker lifetime; syncActiveStrip marks the state known whenever it
// recomputes truth.
let removeSetKnown = false;
let removeSetLoad = null;
function ensureActiveRemoveSet() {
  if (removeSetKnown || !chrome.declarativeNetRequest
      || !chrome.declarativeNetRequest.getDynamicRules) {
    return Promise.resolve();
  }
  if (!removeSetLoad) {
    removeSetLoad = new Promise((resolve) => {
      chrome.declarativeNetRequest.getDynamicRules((rules) => {
        void chrome.runtime.lastError;
        const D = self.DnrRules;
        const rule = Array.isArray(rules) && D
          ? rules.find((x) => x && x.id === D.ACTIVE_RULE_ID)
          : null;
        const params = rule && rule.action && rule.action.redirect
          && rule.action.redirect.transform
          && rule.action.redirect.transform.queryTransform
          && rule.action.redirect.transform.queryTransform.removeParams;
        activeRemoveSet = Array.isArray(params) && params.length
          ? new Set(params)
          : null;
        removeSetKnown = true;
        resolve();
      });
    });
  }
  return removeSetLoad;
}

async function syncActiveStrip() {
  if (!chrome.declarativeNetRequest || !chrome.declarativeNetRequest.updateDynamicRules) return;
  const D = self.DnrRules;
  if (!D) return;
  const items = await chrome.storage.sync.get({
    enabled: true,
    enabledActiveStrip: false,
    enabledUtmStrip: false,
    enabledActiveSkip: false,
    utmStripSkipDomains: [],
    utmStripKeepParams: [],
  });
  // Gated on the master toggle like everything else: "Shorten All Links"
  // off means the network-layer strip stops too (rules cleared below). The
  // enabledActiveStrip flag itself is untouched, so flipping the master
  // back on restores the strip without re-prompting.
  const flagOn = items.enabledActiveStrip === true && items.enabled !== false;
  const hasPerm = await new Promise((resolve) => {
    chrome.permissions.contains({ origins: ['*://*/*'] }, (granted) => {
      void chrome.runtime.lastError;
      resolve(!!granted);
    });
  });
  try {
    if (flagOn && hasPerm && self.UtmStripper) {
      const rules = D.buildRules({
        params: Array.from(self.UtmStripper.TRACKING_PARAMS || []),
        keepParams: Array.isArray(items.utmStripKeepParams) ? items.utmStripKeepParams : [],
        skipDomains: Array.isArray(items.utmStripSkipDomains) ? items.utmStripSkipDomains : [],
      });
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [D.ACTIVE_RULE_ID],
        addRules: rules,
      });
      activeRemoveSet = rules.length
        ? new Set(rules[0].action.redirect.transform.queryTransform.removeParams)
        : null;
      removeSetKnown = true;
    } else {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [D.ACTIVE_RULE_ID],
      });
      activeRemoveSet = null;
      removeSetKnown = true;
    }
  } catch (e) {
    console.debug('[Link Shortener] could not update active-strip rules:', e);
    activeRemoveSet = null;
  }
  // Mirror of syncUtmContentScript's hand-back: this feature also holds the
  // broad permission only while one of the three network-layer features is
  // actually on.
  if (!flagOn && items.enabledUtmStrip !== true && items.enabledActiveSkip !== true
      && hasPerm && chrome.permissions.remove) {
    chrome.permissions.remove({ origins: ['*://*/*'] }, () => void chrome.runtime.lastError);
  }
}

chrome.runtime.onInstalled.addListener(syncActiveStrip);
chrome.runtime.onStartup.addListener(syncActiveStrip);

// ---------------------------------------------------------------------------
// Active redirect skip (v1.13): DNR redirect rules that jump straight to a
// wrapper's embedded destination BEFORE the request is sent, so the click
// tracker never hears about the click. Rules only match byte-identical raw
// targets (dnr.js); everything else falls through to the tab-layer skip
// below, which stays enabled as the universal fallback. Shares the optional
// *://*/* permission and the skip-domain list with the strips.
// ---------------------------------------------------------------------------

// Whether the skip rules are currently installed. Same MV3 repair story as
// activeRemoveSet: the rules outlive the worker, this global does not.
let activeSkipInstalled = false;
let skipKnown = false;
let skipLoad = null;
function ensureActiveSkipKnown() {
  if (skipKnown || !chrome.declarativeNetRequest
      || !chrome.declarativeNetRequest.getDynamicRules) {
    return Promise.resolve();
  }
  if (!skipLoad) {
    skipLoad = new Promise((resolve) => {
      chrome.declarativeNetRequest.getDynamicRules((rules) => {
        void chrome.runtime.lastError;
        const D = self.DnrRules;
        activeSkipInstalled = !!(Array.isArray(rules) && D
          && rules.some((x) => x && D.SKIP_RULE_IDS.indexOf(x.id) !== -1));
        skipKnown = true;
        resolve();
      });
    });
  }
  return skipLoad;
}

async function syncActiveSkip() {
  if (!chrome.declarativeNetRequest || !chrome.declarativeNetRequest.updateDynamicRules) return;
  const D = self.DnrRules;
  if (!D || !D.buildSkipRules) return;
  const items = await chrome.storage.sync.get({
    enabled: true,
    enabledActiveSkip: false,
    enabledActiveStrip: false,
    enabledUtmStrip: false,
    utmStripSkipDomains: [],
  });
  const flagOn = items.enabledActiveSkip === true && items.enabled !== false;
  const hasPerm = await new Promise((resolve) => {
    chrome.permissions.contains({ origins: ['*://*/*'] }, (granted) => {
      void chrome.runtime.lastError;
      resolve(!!granted);
    });
  });
  try {
    if (flagOn && hasPerm) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: D.SKIP_RULE_IDS,
        addRules: D.buildSkipRules({
          skipDomains: Array.isArray(items.utmStripSkipDomains) ? items.utmStripSkipDomains : [],
        }),
      });
      activeSkipInstalled = true;
    } else {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: D.SKIP_RULE_IDS,
      });
      activeSkipInstalled = false;
    }
    skipKnown = true;
  } catch (e) {
    console.debug('[Link Shortener] could not update active-skip rules:', e);
    activeSkipInstalled = false;
  }
  // Same hand-back interlock as the strips: the broad permission goes back
  // to the browser only when all three network-layer features are off.
  if (!flagOn && items.enabledUtmStrip !== true && items.enabledActiveStrip !== true
      && hasPerm && chrome.permissions.remove) {
    chrome.permissions.remove({ origins: ['*://*/*'] }, () => void chrome.runtime.lastError);
  }
}

chrome.runtime.onInstalled.addListener(syncActiveSkip);
chrome.runtime.onStartup.addListener(syncActiveSkip);

// ---------------------------------------------------------------------------
// Per-tab pause (v1.13): suspend every layer on ONE tab until the user
// resumes, the tab closes, or the tab navigates to a different origin.
// Source of truth is storage.session (survives worker restarts, dies with
// the browser). The network layers stand down via one high-priority
// SESSION-scoped allow rule (tabIds conditions are session-rule-only);
// the tab layers check pause state directly.
// ---------------------------------------------------------------------------
function getPausedTabs() {
  return new Promise((resolve) => {
    if (!chrome.storage.session) {
      resolve({});
      return;
    }
    chrome.storage.session.get({ pausedTabs: {} }, (items) => {
      void chrome.runtime.lastError;
      resolve(items && items.pausedTabs && typeof items.pausedTabs === 'object'
        ? items.pausedTabs : {});
    });
  });
}

async function setPausedTabs(map) {
  if (chrome.storage.session) {
    await new Promise((resolve) => {
      chrome.storage.session.set({ pausedTabs: map }, () => {
        void chrome.runtime.lastError;
        resolve();
      });
    });
  }
  // Session allow rule covering the paused tabs (or nothing when none).
  const D = self.DnrRules;
  if (!D || !chrome.declarativeNetRequest
      || !chrome.declarativeNetRequest.updateSessionRules) return;
  const ids = Object.keys(map).map(Number).filter((n) => Number.isInteger(n) && n >= 0);
  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [D.PAUSE_RULE_ID],
      addRules: D.buildPauseRules(ids),
    });
  } catch (e) {
    console.debug('[Link Shortener] could not update pause rule:', e);
  }
}

async function pauseTab(tabId, url) {
  if (typeof tabId !== 'number') return;
  const map = await getPausedTabs();
  let origin = '';
  try { origin = new URL(url).origin; } catch (_e) { /* keep '' */ }
  map[String(tabId)] = { origin, at: Date.now() };
  await setPausedTabs(map);
}

async function resumeTab(tabId) {
  const map = await getPausedTabs();
  if (!(String(tabId) in map)) return;
  delete map[String(tabId)];
  await setPausedTabs(map);
}

if (chrome.tabs && chrome.tabs.onRemoved) {
  chrome.tabs.onRemoved.addListener((tabId) => { resumeTab(tabId); });
}

// Pause housekeeping + tab-layer gate: expire the pause when the tab
// leaves the origin it was paused on.
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;
  getPausedTabs().then((map) => {
    const entry = map[String(details.tabId)];
    if (!entry) return;
    let origin = '';
    try { origin = new URL(details.url).origin; } catch (_e) { /* keep '' */ }
    if (entry.origin && origin && entry.origin !== origin) {
      resumeTab(details.tabId);
    }
  });
});

// Popup + content scripts ask whether their tab is paused; the popup also
// flips the state. Content scripts can't know their own tab id, so the
// sender's tab fills it in for them.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return undefined;
  if (msg.type === 'pause-info') {
    const tabId = typeof msg.tabId === 'number'
      ? msg.tabId
      : (sender && sender.tab ? sender.tab.id : null);
    if (tabId == null) {
      sendResponse({ paused: false });
      return false;
    }
    getPausedTabs().then((map) => sendResponse({ paused: String(tabId) in map }));
    return true;
  }
  if (msg.type === 'pause-tab' && typeof msg.tabId === 'number') {
    pauseTab(msg.tabId, typeof msg.url === 'string' ? msg.url : '').then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'resume-tab' && typeof msg.tabId === 'number') {
    resumeTab(msg.tabId).then(() => sendResponse({ ok: true }));
    return true;
  }
  return undefined;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (Object.prototype.hasOwnProperty.call(changes, 'enabled')
      || Object.prototype.hasOwnProperty.call(changes, 'enabledActiveStrip')
      || Object.prototype.hasOwnProperty.call(changes, 'utmStripSkipDomains')
      || Object.prototype.hasOwnProperty.call(changes, 'utmStripKeepParams')) {
    syncActiveStrip();
  }
  if (Object.prototype.hasOwnProperty.call(changes, 'enabled')
      || Object.prototype.hasOwnProperty.call(changes, 'enabledActiveSkip')
      || Object.prototype.hasOwnProperty.call(changes, 'utmStripSkipDomains')) {
    syncActiveSkip();
  }
});

// Attribution: DNR does not report rule matches without the
// declarativeNetRequestFeedback permission (and its warning), so we diff
// the navigation's own URLs instead -- webNavigation is already held.
// The mechanics live on the two listeners below: onBeforeNavigate records
// what the user headed for, onCommitted compares it with what actually
// loaded. (An earlier cut paired two consecutive onBeforeNavigate events;
// a DNR redirect never fires a second one, so nothing was ever counted
// and the popup always fell back to "Already clean".)
const activeBlocks = new Map(); // tabId -> { count, at }
const pendingNav = new Map();   // tabId -> { url, at } (pre-redirect URL)

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;
  pendingNav.set(details.tabId, { url: details.url, at: Date.now() });
});

// A DNR redirect happens INSIDE a single navigation (it surfaces like an
// HTTP redirect, redirectCount 1 -- there is no second onBeforeNavigate).
// So the pair to diff is onBeforeNavigate's URL (what the user headed for)
// against onCommitted's URL (what actually loaded). Only a delta that is
// EXACTLY "params from our set removed" counts; server redirects and site
// rewrites fall through to -1 and are ignored. Every committed navigation
// either sets or clears the tab's entry, so a blocked count from a previous
// page never lingers on a later clean one.
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;
  // Fresh page, fresh badge count (redirect-skip credits are applied
  // inside the reset — see pendingCredits).
  resetTabCount(details.tabId);
  const started = pendingNav.get(details.tabId);
  pendingNav.delete(details.tabId);
  if (!started || !self.DnrRules) {
    activeBlocks.delete(details.tabId);
    return;
  }
  if (Date.now() - started.at > 10000 || started.url === details.url) {
    activeBlocks.delete(details.tabId);
    return;
  }
  // Active-skip attribution: a DNR fast-path skip is also ONE navigation
  // (wrapper in onBeforeNavigate, destination in onCommitted). Credit it
  // only when the delta is EXACTLY what our own rules produce — the
  // skipRuleTarget equality — and only while the rules are installed, so
  // a site's own redirect can never be miscounted.
  if (self.DnrRules && self.DnrRules.skipRuleTarget
      && self.DnrRules.skipRuleTarget(started.url) === details.url) {
    activeBlocks.delete(details.tabId);
    ensureActiveSkipKnown().then(() => {
      if (!activeSkipInstalled) return;
      stashOriginal(details.tabId, started.url, details.url);
      recordStats({
        skips: 1,
        urls: 1,
        chars: Math.max(0, started.url.length - details.url.length),
      });
      bumpTabCount(details.tabId, 1);
      if (self.HistoryLog) {
        recordHistory({
          host: self.HistoryLog.hostOf(details.url),
          kind: 'skip',
          chars: Math.max(0, started.url.length - details.url.length),
        });
      }
    });
    return;
  }
  // The diff runs after the (usually no-op) worker-restart repair. The
  // started/committed pair is captured above, so the async hop is safe.
  ensureActiveRemoveSet().then(() => {
    if (!activeRemoveSet) {
      activeBlocks.delete(details.tabId);
      return;
    }
    const removed = self.DnrRules.diffRemovedParams(started.url, details.url, activeRemoveSet);
    if (removed > 0) {
      activeBlocks.set(details.tabId, { count: removed, at: Date.now() });
      recordStats({ blocked: removed, chars: Math.max(0, started.url.length - details.url.length) });
      bumpTabCount(details.tabId, removed);
      if (self.HistoryLog) {
        recordHistory({
          host: self.HistoryLog.hostOf(details.url),
          kind: 'active',
          params: self.HistoryLog.removedParamNames(started.url, details.url),
          count: removed,
          chars: Math.max(0, started.url.length - details.url.length),
        });
      }
    } else {
      activeBlocks.delete(details.tabId);
    }
  });
});

if (chrome.tabs && chrome.tabs.onRemoved) {
  chrome.tabs.onRemoved.addListener((tabId) => {
    activeBlocks.delete(tabId);
    pendingNav.delete(tabId);
    tabCounts.delete(tabId);
    pendingCredits.delete(tabId);
  });
}

// Popup asks whether the current tab's page had trackers stripped before it
// loaded, so "Already clean" can credit the active strip instead.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== 'active-block-info' || typeof msg.tabId !== 'number') return undefined;
  const info = activeBlocks.get(msg.tabId);
  sendResponse({ count: info ? info.count : 0 });
  return false;
});

if (chrome.permissions && chrome.permissions.onAdded) {
  chrome.permissions.onAdded.addListener(() => {
    // The popup closes (focus loss) the moment the permission dialog
    // opens, so its post-grant callback may never run. The grant itself
    // lands HERE, where the flag is already set optimistically -- register
    // the strip right away. Same story for the active strip's rules and
    // the active skip's.
    syncUtmContentScript();
    syncActiveStrip();
    syncActiveSkip();
  });
}

if (chrome.permissions && chrome.permissions.onRemoved) {
  chrome.permissions.onRemoved.addListener((p) => {
    if (p && Array.isArray(p.origins) && p.origins.includes('*://*/*')) {
      unregisterUtmContentScript();
      // All three network-layer features ride this permission; revoking it
      // (browser UI or our own hand-back) turns them all off. The storage
      // write triggers the sync functions, which clear the DNR rules.
      chrome.storage.sync.set({
        enabledUtmStrip: false, enabledActiveStrip: false, enabledActiveSkip: false,
      });
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
        blocked: 0, perSite: {}, since: Date.now(),
      };
      if (!s.perSite) s.perSite = {};
      if (typeof s.blocked !== 'number') s.blocked = 0; // pre-1.12 stats object
      for (const k of ['urls', 'chars', 'unwraps', 'skips', 'copies', 'bulk', 'blocked']) {
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

// -- Toolbar badge + local activity history (v1.13) ---------------------------
// The badge shows, for the CURRENT tab, how many cleanups this extension
// performed on the page: each address-bar rewrite counts 1, each
// blocked-before-load parameter counts 1, each skipped redirect counts 1.
// Ephemeral by design — the count map dies with the service worker and
// resets on every committed navigation, so a stale number never lingers.
//
// The history is a 50-entry newest-first ring buffer in storage.local
// (NEVER sync): hostnames, kinds, and parameter NAMES only — history.js
// has no field for a full URL or a value, so none can be stored.
const tabCounts = new Map();      // tabId -> cleanups on the current page
const pendingCredits = new Map(); // tabId -> credit applied at the next commit
                                  // (redirect skips land before the target
                                  // page commits, which would wipe them)

// Cached prefs for the hot paths. Lazily loaded, kept fresh by onChanged.
let uiPrefs = null;
function ensureUiPrefs() {
  if (uiPrefs) return Promise.resolve(uiPrefs);
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      { enabled: true, showBadge: true, keepHistory: true },
      (items) => {
        void chrome.runtime.lastError;
        // Another caller may have won the race; keep the first result.
        if (!uiPrefs) {
          uiPrefs = {
            enabled: items.enabled !== false,
            showBadge: items.showBadge !== false,
            keepHistory: items.keepHistory !== false,
          };
        }
        resolve(uiPrefs);
      },
    );
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  // Toolbar title mirrors the master switch no matter where it was
  // flipped (popup, keyboard command, another device via sync).
  if (Object.prototype.hasOwnProperty.call(changes, 'enabled')
      && chrome.action && chrome.action.setTitle) {
    chrome.action.setTitle({
      title: changes.enabled.newValue !== false
        ? "Rather's Link Shortener"
        : "Rather's Link Shortener (off)",
    }, () => void chrome.runtime.lastError);
  }
  if (!uiPrefs) return;
  if (Object.prototype.hasOwnProperty.call(changes, 'enabled')) {
    uiPrefs.enabled = changes.enabled.newValue !== false;
  }
  if (Object.prototype.hasOwnProperty.call(changes, 'showBadge')) {
    uiPrefs.showBadge = changes.showBadge.newValue !== false;
  }
  if (Object.prototype.hasOwnProperty.call(changes, 'keepHistory')) {
    uiPrefs.keepHistory = changes.keepHistory.newValue !== false;
  }
  if ((('showBadge' in changes) && changes.showBadge.newValue === false)
      || (('enabled' in changes) && changes.enabled.newValue === false)) {
    clearAllBadges();
  }
});

// Badge colors once per worker start. Brand deep blue behind white text
// (the orange is too light for readable badge text).
if (chrome.action && chrome.action.setBadgeBackgroundColor) {
  chrome.action.setBadgeBackgroundColor({ color: '#184459' }, () => void chrome.runtime.lastError);
  if (chrome.action.setBadgeTextColor) {
    chrome.action.setBadgeTextColor({ color: '#FFFFFF' }, () => void chrome.runtime.lastError);
  }
}

function renderBadge(tabId) {
  if (!chrome.action || !chrome.action.setBadgeText || tabId == null) return;
  const n = tabCounts.get(tabId) || 0;
  chrome.action.setBadgeText(
    { tabId, text: n > 0 ? String(n) : '' },
    () => void chrome.runtime.lastError,
  );
}

function clearAllBadges() {
  if (!chrome.action || !chrome.action.setBadgeText || !chrome.tabs || !chrome.tabs.query) return;
  tabCounts.clear();
  chrome.tabs.query({}, (tabs) => {
    void chrome.runtime.lastError;
    for (const tab of tabs || []) {
      if (tab && tab.id != null) {
        chrome.action.setBadgeText({ tabId: tab.id, text: '' }, () => void chrome.runtime.lastError);
      }
    }
  });
}

function bumpTabCount(tabId, n) {
  if (tabId == null || !(n > 0)) return;
  ensureUiPrefs().then((prefs) => {
    if (!prefs.enabled || !prefs.showBadge) return;
    tabCounts.set(tabId, (tabCounts.get(tabId) || 0) + n);
    renderBadge(tabId);
  });
}

// Called from the committed-navigation listener: zero the count for the
// new page, then apply any credit from a redirect skip that produced
// this navigation.
function resetTabCount(tabId) {
  const credit = pendingCredits.get(tabId) || 0;
  pendingCredits.delete(tabId);
  tabCounts.set(tabId, 0);
  if (credit > 0) {
    bumpTabCount(tabId, credit);
  } else {
    ensureUiPrefs().then((prefs) => {
      if (prefs.showBadge) renderBadge(tabId);
    });
  }
}

// Serialized writer for the history ring buffer, same pattern as stats.
let historyChain = Promise.resolve();
function recordHistory(opts) {
  historyChain = historyChain.then(() => new Promise((resolve) => {
    ensureUiPrefs().then((prefs) => {
      if (!prefs.keepHistory || !self.HistoryLog) {
        resolve();
        return;
      }
      chrome.storage.local.get({ cleanHistory: [] }, (items) => {
        void chrome.runtime.lastError;
        const list = self.HistoryLog.push(
          Array.isArray(items.cleanHistory) ? items.cleanHistory : [],
          self.HistoryLog.makeEntry(opts),
        );
        chrome.storage.local.set({ cleanHistory: list }, () => {
          void chrome.runtime.lastError;
          resolve();
        });
      });
    });
  })).catch(() => { historyChain = Promise.resolve(); });
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
  chrome.storage.sync.get({ utmStripKeepParams: [], includeAmazonTitle: false, keepTitles: false, siteOpts: {} }, (items) => {
    const keepParams = Array.isArray(items.utmStripKeepParams) ? items.utmStripKeepParams : [];
    const cleaned = cleanAnyUrl(sourceUrl, keepParams, { amazonSlug: self.SiteOpts.resolveKeepTitles('enabledAmazon', items) });
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
    // "toggle-master" (v1.13): flip the master switch from the keyboard.
    // Ships UNBOUND — copy-clean keeps the prime binding; users assign
    // this one in the browser's shortcut settings. The action title
    // reflects the state so the flip is visible without opening the popup.
    if (command === 'toggle-master') {
      chrome.storage.sync.get({ enabled: true }, (items) => {
        void chrome.runtime.lastError;
        // The storage change also flips the toolbar title (see the
        // onChanged listener by the badge code), so the flip is visible
        // without opening the popup.
        chrome.storage.sync.set({ enabled: items.enabled === false });
      });
      return;
    }
    // "clean-page" (v1.14): the popup button's one-shot, from the keyboard.
    // Ships UNBOUND like toggle-master. The shortcut press is the user
    // gesture that grants activeTab, so no broad permissions are involved;
    // the injected function is byte-identical to the popup's.
    if (command === 'clean-page') {
      const run = (theTab) => {
        if (!theTab || theTab.id == null || !theTab.url || !/^https?:/i.test(theTab.url)) return;
        if (!chrome.scripting || !chrome.scripting.executeScript) return;
        chrome.scripting.executeScript({
          target: { tabId: theTab.id },
          func: async () => {
            const anchors = Array.from(document.links || []);
            const urls = [];
            const seen = new Set();
            for (const a of anchors) {
              const h = a.href;
              if (!/^https?:/i.test(h) || seen.has(h)) continue;
              seen.add(h);
              urls.push(h);
            }
            if (urls.length === 0) return { changed: 0, total: 0 };
            const resp = await chrome.runtime.sendMessage({ type: 'clean-links-batch', urls });
            const map = resp && resp.map ? resp.map : {};
            let changed = 0;
            for (const a of anchors) {
              const clean = map[a.href];
              if (clean) {
                a.href = clean;
                changed++;
              }
            }
            return { changed, total: urls.length };
          },
        }, () => void chrome.runtime.lastError);
      };
      if (tab && tab.id != null) run(tab);
      else chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => run(tabs && tabs[0]));
      return;
    }
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
    chrome.storage.sync.get({ utmStripKeepParams: [], includeAmazonTitle: false, keepTitles: false, siteOpts: {} }, (items) => {
      const keepParams = Array.isArray(items.utmStripKeepParams) ? items.utmStripKeepParams : [];
      const cleaned = cleanAnyUrl(extracted, keepParams, { amazonSlug: self.SiteOpts.resolveKeepTitles('enabledAmazon', items) });
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
  chrome.storage.sync.get({ utmStripKeepParams: [], includeAmazonTitle: false, keepTitles: false, siteOpts: {} }, (items) => {
    const keepParams = Array.isArray(items.utmStripKeepParams) ? items.utmStripKeepParams : [];
    sendResponse({ cleaned: cleanAnyUrl(msg.url, keepParams, { amazonSlug: self.SiteOpts.resolveKeepTitles('enabledAmazon', items) }) });
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
    bumpTabCount(tabId, 1);
    if (self.HistoryLog) {
      recordHistory({
        host: self.HistoryLog.hostOf(msg.cleaned),
        kind: 'rewrite',
        params: self.HistoryLog.removedParamNames(msg.original, msg.cleaned),
        chars: Math.max(0, msg.original.length - msg.cleaned.length),
      });
    }
    return undefined;
  }
  if (msg.type === 'record-copy') {
    recordStats({
      copies: 1,
      urls: msg.changed ? 1 : 0,
      chars: typeof msg.saved === 'number' && msg.saved > 0 ? msg.saved : 0,
    });
    if (msg.changed && self.HistoryLog) {
      recordHistory({
        host: typeof msg.host === 'string' ? msg.host.slice(0, 128) : '',
        kind: 'copy',
        chars: typeof msg.saved === 'number' && msg.saved > 0 ? msg.saved : 0,
      });
    }
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
  if (msg.type === 'add-skip-domain' && typeof msg.host === 'string') {
    // Self-healing flow (v1.13): one click in the popup excludes a hostname
    // from the universal strip, active strip, and active skip. The storage
    // write re-syncs the DNR rules and the content-script registration.
    chrome.storage.sync.get({ utmStripSkipDomains: [] }, (items) => {
      void chrome.runtime.lastError;
      const list = Array.isArray(items.utmStripSkipDomains) ? items.utmStripSkipDomains.slice() : [];
      list.push(msg.host);
      const normalized = self.DnrRules
        ? self.DnrRules.normalizeSkipDomains(list)
        : list;
      chrome.storage.sync.set({ utmStripSkipDomains: normalized }, () => {
        void chrome.runtime.lastError;
        sendResponse({ ok: true });
      });
    });
    return true;
  }
  if (msg.type === 'clean-links-batch' && Array.isArray(msg.urls)) {
    // "Clean all links on this page" (v1.13): the popup injects a collector
    // into the active tab; the hrefs come here in one batch and go through
    // the same pipeline as the bulk cleaner. Response maps ONLY the URLs
    // that changed. Capped defensively; a page with more links than that
    // gets its first 2000 cleaned rather than an error.
    const urls = msg.urls.filter((u) => typeof u === 'string' && /^https?:/i.test(u)).slice(0, 2000);
    chrome.storage.sync.get({ utmStripKeepParams: [], includeAmazonTitle: false, keepTitles: false, siteOpts: {} }, (items) => {
      void chrome.runtime.lastError;
      const keepParams = Array.isArray(items.utmStripKeepParams) ? items.utmStripKeepParams : [];
      const map = {};
      let saved = 0;
      for (const u of urls) {
        let cleaned;
        try {
          cleaned = cleanAnyUrl(u, keepParams, { amazonSlug: self.SiteOpts.resolveKeepTitles('enabledAmazon', items) });
        } catch (_e) {
          cleaned = u;
        }
        if (cleaned && cleaned !== u) {
          map[u] = cleaned;
          saved += Math.max(0, u.length - cleaned.length);
        }
      }
      const changed = Object.keys(map).length;
      // dryRun (v1.14): the bookmark cleaner's SCAN pass previews what
      // would change without counting anything; only its apply pass (and
      // every other caller) records stats and history.
      if (changed > 0 && !msg.dryRun) {
        recordStats({ bulk: changed, urls: changed, chars: saved });
        recordHistory({
          // The bookmark cleaner reuses this pipeline from the options
          // page, where there is no sender.tab; it labels itself.
          host: msg.source === 'bookmarks'
            ? 'bookmarks'
            : (sender && sender.tab && self.HistoryLog ? self.HistoryLog.hostOf(sender.tab.url || '') : ''),
          kind: 'bulk',
          count: changed,
          chars: saved,
        });
      }
      sendResponse({ map });
    });
    return true;
  }
  if (msg.type === 'bulk-clean' && typeof msg.text === 'string') {
    chrome.storage.sync.get({ utmStripKeepParams: [], includeAmazonTitle: false, keepTitles: false, siteOpts: {} }, (items) => {
      const keepParams = Array.isArray(items.utmStripKeepParams) ? items.utmStripKeepParams : [];
      const result = self.TextUrlExtractor && self.TextUrlExtractor.cleanAllUrlsInText
        ? self.TextUrlExtractor.cleanAllUrlsInText(msg.text, (u) => cleanAnyUrl(u, keepParams, { amazonSlug: self.SiteOpts.resolveKeepTitles('enabledAmazon', items) }))
        : { text: msg.text, found: 0, changed: 0, saved: 0 };
      if (result.changed > 0) {
        recordStats({ bulk: result.changed, urls: result.changed, chars: result.saved });
        recordHistory({ host: '', kind: 'bulk', count: result.changed, chars: result.saved });
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
  ['VimeoLinkShortener', 'isVimeoHost'],
  ['DailymotionLinkShortener', 'isDailymotionHost'],
  ['WazeLinkShortener', 'isWazeHost'],
  ['ZillowLinkShortener', 'isZillowHost'],
  ['RedfinLinkShortener', 'isRedfinHost'],
  ['RealtorLinkShortener', 'isRealtorHost'],
  ['IndeedLinkShortener', 'isIndeedHost'],
  ['GlassdoorLinkShortener', 'isGlassdoorHost'],
  ['PoshmarkLinkShortener', 'isPoshmarkHost'],
  ['DepopLinkShortener', 'isDepopHost'],
  ['StockxLinkShortener', 'isStockxHost'],
  ['GoatLinkShortener', 'isGoatHost'],
  ['GrailedLinkShortener', 'isGrailedHost'],
  ['RottentomatoesLinkShortener', 'isRottentomatoesHost'],
  ['MetacriticLinkShortener', 'isMetacriticHost'],
  ['GeniusLinkShortener', 'isGeniusHost'],
  ['DiscogsLinkShortener', 'isDiscogsHost'],
  ['DeezerLinkShortener', 'isDeezerHost'],
  ['TidalLinkShortener', 'isTidalHost'],
  ['PandoraLinkShortener', 'isPandoraHost'],
  ['GitlabLinkShortener', 'isGitlabHost'],
  ['BitbucketLinkShortener', 'isBitbucketHost'],
  ['NpmLinkShortener', 'isNpmHost'],
  ['PypiLinkShortener', 'isPypiHost'],
  ['DockerhubLinkShortener', 'isDockerhubHost'],
  ['HuggingfaceLinkShortener', 'isHuggingfaceHost'],
  ['KaggleLinkShortener', 'isKaggleHost'],
  ['DropboxLinkShortener', 'isDropboxHost'],
  ['BoxLinkShortener', 'isBoxHost'],
  ['WetransferLinkShortener', 'isWetransferHost'],
  ['MediafireLinkShortener', 'isMediafireHost'],
  ['BehanceLinkShortener', 'isBehanceHost'],
  ['DribbbleLinkShortener', 'isDribbbleHost'],
  ['ArtstationLinkShortener', 'isArtstationHost'],
  ['FlickrLinkShortener', 'isFlickrHost'],
  ['UnsplashLinkShortener', 'isUnsplashHost'],
  ['PexelsLinkShortener', 'isPexelsHost'],
  ['DeviantartLinkShortener', 'isDeviantartHost'],
  ['PixivLinkShortener', 'isPixivHost'],
  ['PixabayLinkShortener', 'isPixabayHost'],
  ['ShutterstockLinkShortener', 'isShutterstockHost'],
  ['GettyimagesLinkShortener', 'isGettyimagesHost'],
  ['FreepikLinkShortener', 'isFreepikHost'],
  ['GiphyLinkShortener', 'isGiphyHost'],
  ['TenorLinkShortener', 'isTenorHost'],
  ['VscoLinkShortener', 'isVscoHost'],
  ['SmugmugLinkShortener', 'isSmugmugHost'],
  ['AdobestockLinkShortener', 'isAdobestockHost'],
  ['AlamyLinkShortener', 'isAlamyHost'],
  ['VecteezyLinkShortener', 'isVecteezyHost'],
  ['IstockLinkShortener', 'isIstockHost'],
  ['DreamstimeLinkShortener', 'isDreamstimeHost'],
  ['ImgurLinkShortener', 'isImgurHost'],
  ['RumbleLinkShortener', 'isRumbleHost'],
  ['KickLinkShortener', 'isKickHost'],
  ['CrunchyrollLinkShortener', 'isCrunchyrollHost'],
  ['OdyseeLinkShortener', 'isOdyseeHost'],
  ['MyanimelistLinkShortener', 'isMyanimelistHost'],
  ['BitchuteLinkShortener', 'isBitchuteHost'],
  ['NewgroundsLinkShortener', 'isNewgroundsHost'],
  ['CourseraLinkShortener', 'isCourseraHost'],
  ['UdemyLinkShortener', 'isUdemyHost'],
  ['KhanacademyLinkShortener', 'isKhanacademyHost'],
  ['EdxLinkShortener', 'isEdxHost'],
  ['SkillshareLinkShortener', 'isSkillshareHost'],
  ['BrilliantLinkShortener', 'isBrilliantHost'],
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
  ['TicketsLinkShortener', 'isTicketsHost'],
  ['FooddeliveryLinkShortener', 'isFooddeliveryHost'],
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
  { hostEquals: 'l.threads.net' },
  { hostEquals: 'l.wl.co', pathPrefix: '/l' },
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
  chrome.storage.sync.get({ enabled: true, enabledRedirectSkip: true }, async (items) => {
    if (items.enabled === false || items.enabledRedirectSkip === false) return;
    // Stand down when the active skip's DNR fast path covers this URL: the
    // redirect already happened inside the network layer, and the commit
    // listener does the attribution. Acting here too would double-navigate
    // and double-count.
    await ensureActiveSkipKnown();
    if (activeSkipInstalled && self.DnrRules && self.DnrRules.skipRuleWouldMatch
        && self.DnrRules.skipRuleWouldMatch(details.url)) {
      return;
    }
    // Per-tab pause suspends the tab-layer skip too.
    const pausedMap = await getPausedTabs();
    if (String(details.tabId) in pausedMap) return;
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
    // Badge credit rides to the destination page: the target's own commit
    // resets the count first, then applies this credit.
    pendingCredits.set(details.tabId, (pendingCredits.get(details.tabId) || 0) + 1);
    if (self.HistoryLog) {
      recordHistory({
        host: self.HistoryLog.hostOf(target),
        kind: 'skip',
        chars: Math.max(0, details.url.length - target.length),
      });
    }
  });
}

chrome.webNavigation.onBeforeNavigate.addListener(handleRedirectSkip, {
  url: REDIRECT_SKIP_FILTERS,
});
