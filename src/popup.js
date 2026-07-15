// popup.js
// ----------------------------------------------------------------------------
// Toolbar popup controller. Reads/writes the master `enabled` flag, the
// feature flags, and a per-site flag for each supported site in
// chrome.storage.sync. The background service worker and content scripts
// observe storage.onChanged and react on their own.
//
// Storage shape (all booleans):
//   enabled             -- master "Shorten All Links" toggle (default true)
//   hideTravelPopup     -- if true, suppresses the floating toolbar on hotel
//                          sites; URL-bar shortening still runs (default false)
//   includeAmazonTitle  -- if true, Amazon URLs are shortened to
//                          /<title-slug>/dp/ASIN instead of bare /dp/ASIN
//                          (default false)
//   enabledUtmStrip     -- if true, the Universal tracking strip runs on every
//                          http(s) page, stripping utm_*, gclid, fbclid, etc.
//                          regardless of host. Default FALSE: opt-in because
//                          this requests the broader *://*/* host permission.
//                          The popup requests the permission via
//                          chrome.permissions.request when the user flips
//                          this toggle on, and reverts the toggle if denied.
//   enabledAmazon …     -- per-site toggles (each default true)
// ----------------------------------------------------------------------------

(function () {
  'use strict';

  // Per-site toggle metadata. `group` matches the data-group attribute on the
  // checkbox in popup.html and the group-count-<id> element ID.
  // Set developer-authored rich text (catalog strings with <em>) without
  // innerHTML: parse in an inert document, then adopt the nodes.
  const setRichText = (el, html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    el.replaceChildren(...doc.body.childNodes);
  };

  // i18n helper: localized string when the locale has one, English
  // fallback otherwise. Site names are brands and are never translated.
  const t = (key, fallback, subs) => {
    try {
      const m = chrome.i18n && chrome.i18n.getMessage
        ? chrome.i18n.getMessage(key, subs) : '';
      return m || fallback;
    } catch (_e) {
      return fallback;
    }
  };

  // The full site catalog: every group, section subhead (i18n key +
  // English fallback), and toggle row (storage key, display label,
  // site tag). Rows are rendered ON DEMAND when a group opens or the
  // filter needs them -- the popup no longer lays out 200 rows just to
  // open. Generated from the v1.10 static markup; the wiring auditor
  // validates every key in here against the module registry.
  const SITE_GROUPS = {
    global: [
      { i18nKey: 'subSearchProd', en: 'Search & productivity', rows: [
        ['enabledGoogle', 'Google Search', 'Google'],
        ['enabledGdrive', 'Google Drive/Docs', 'Gdrive'],
        ['enabledBing', 'Bing', 'Bing'],
        ['enabledDuckduckgo', 'DuckDuckGo', 'Duckduckgo'],
        ['enabledWeather', 'Weather.com', 'Weather'],
        ['enabledAccuweather', 'AccuWeather', 'Accuweather'],
        ['enabledWunderground', 'Weather Underground', 'Wunderground'],
        ['enabledEcosia', 'Ecosia', 'Ecosia'],
        ['enabledStartpage', 'Startpage', 'Startpage'],
        ['enabledBravesearch', 'Brave Search', 'Bravesearch'],
        ['enabledKagi', 'Kagi', 'Kagi'],
      ] },
      { i18nKey: 'subAcademic', en: 'Academic', rows: [
        ['enabledPubmed', 'PubMed', 'Pubmed'],
        ['enabledScholar', 'Google Scholar', 'Scholar'],
        ['enabledResearchgate', 'ResearchGate', 'Researchgate'],
      ] },
      { i18nKey: 'subShopping', en: 'Shopping', rows: [
        ['enabledAmazon', 'Amazon', 'Amazon'],
        ['enabledEbay', 'eBay', 'Ebay'],
        ['enabledEtsy', 'Etsy', 'Etsy'],
        ['enabledAliexpress', 'AliExpress', 'Aliexpress'],
        ['enabledTemu', 'Temu', 'Temu'],
        ['enabledWayfair', 'Wayfair', 'Wayfair'],
        ['enabledShein', 'SHEIN', 'Shein'],
        ['enabledSamsung', 'Samsung', 'Samsung'],
        ['enabledCostco', 'Costco', 'Costco'],
        ['enabledHomedepot', 'Home Depot', 'Homedepot'],
        ['enabledLowes', 'Lowe\'s', 'Lowes'],
        ['enabledIkea', 'IKEA', 'Ikea'],
        ['enabledNike', 'Nike', 'Nike'],
        ['enabledAdidas', 'Adidas', 'Adidas'],
        ['enabledShopify', 'Shopify stores (myshopify.com)', 'Shopify'],
        ['enabledNoon', 'Noon', 'Noon'],
        ['enabledJumia', 'Jumia', 'Jumia'],
      ] },
      { i18nKey: 'subLocal', en: 'Local', rows: [
        ['enabledYelp', 'Yelp', 'Yelp'],
      ] },
      { i18nKey: 'subTravel', en: 'Travel', rows: [
        ['enabledBooking', 'Booking.com', 'Booking'],
        ['enabledExpedia', 'Expedia', 'Expedia'],
        ['enabledAirbnb', 'Airbnb', 'Airbnb'],
        ['enabledAgoda', 'Agoda', 'Agoda'],
        ['enabledTrip', 'Trip.com', 'Trip'],
        ['enabledHotelscom', 'Hotels.com', 'Hotelscom'],
        ['enabledVrbo', 'Vrbo', 'Vrbo'],
        ['enabledTripadvisor', 'Tripadvisor', 'Tripadvisor'],
      ] },
      { i18nKey: 'subFlights', en: 'Flights', rows: [
        ['enabledKayak', 'Kayak', 'Kayak'],
        ['enabledSkyscanner', 'Skyscanner', 'Skyscanner'],
        ['enabledFlightaware', 'FlightAware', 'Flightaware'],
        ['enabledFlightradar24', 'Flightradar24', 'Flightradar24'],
        ['enabledAirlines', 'Airlines (12 carriers)', 'Airlines'],
      ] },
      { i18nKey: 'subSocial', en: 'Social', rows: [
        ['enabledSocial', 'Facebook/Instagram', 'Social'],
        ['enabledThreads', 'Threads', 'Threads'],
        ['enabledLinkedin', 'LinkedIn', 'Linkedin'],
        ['enabledTwitter', 'Twitter/X', 'Twitter'],
        ['enabledTiktok', 'TikTok', 'Tiktok'],
        ['enabledReddit', 'Reddit', 'Reddit'],
        ['enabledBluesky', 'Bluesky', 'Bluesky'],
        ['enabledPinterest', 'Pinterest', 'Pinterest'],
      ] },
      { i18nKey: 'subMedia', en: 'Media & entertainment', rows: [
        ['enabledYoutube', 'YouTube', 'Youtube'],
        ['enabledSpotify', 'Spotify', 'Spotify'],
        ['enabledTwitch', 'Twitch', 'Twitch'],
        ['enabledSoundcloud', 'SoundCloud', 'Soundcloud'],
        ['enabledAppleMusic', 'Apple Music', 'AppleMusic'],
        ['enabledSteam', 'Steam', 'Steam'],
        ['enabledImdb', 'IMDb', 'Imdb'],
        ['enabledGoodreads', 'Goodreads', 'Goodreads'],
        ['enabledWikipedia', 'Wikipedia', 'Wikipedia'],
        ['enabledStackoverflow', 'Stack Overflow', 'Stackoverflow'],
        ['enabledGithub', 'GitHub', 'Github'],
        ['enabledMedium', 'Medium', 'Medium'],
        ['enabledQuora', 'Quora', 'Quora'],
        ['enabledSubstack', 'Substack', 'Substack'],
        ['enabledBandcamp', 'Bandcamp', 'Bandcamp'],
        ['enabledLetterboxd', 'Letterboxd', 'Letterboxd'],
        ['enabledNetflix', 'Netflix', 'Netflix'],
        ['enabledPrimevideo', 'Prime Video', 'Primevideo'],
        ['enabledRoblox', 'Roblox', 'Roblox'],
        ['enabledBilibili', 'Bilibili', 'Bilibili'],
        ['enabledFandom', 'Fandom', 'Fandom'],
        ['enabledEpic', 'Epic Games', 'Epic'],
        ['enabledGog', 'GOG', 'Gog'],
        ['enabledHumble', 'Humble Bundle', 'Humble'],
        ['enabledItchio', 'itch.io', 'Itchio'],
        ['enabledProducthunt', 'Product Hunt', 'Producthunt'],
      ] },
      { i18nKey: 'subWorkTools', en: 'Work tools', rows: [
        ['enabledNetsuite', 'NetSuite', 'Netsuite'],
        ['enabledAtlassian', 'Jira & Confluence', 'Atlassian'],
        ['enabledNotion', 'Notion', 'Notion'],
        ['enabledLoom', 'Loom', 'Loom'],
        ['enabledFigma', 'Figma', 'Figma'],
        ['enabledGodaddy', 'GoDaddy', 'Godaddy'],
      ] },
      { i18nKey: 'subAppStores', en: 'App stores', rows: [
        ['enabledPlaystore', 'Google Play', 'Playstore'],
        ['enabledAppstore', 'Apple App Store', 'Appstore'],
      ] },
      { i18nKey: 'subParcels', en: 'Package tracking', rows: [
        ['enabledParcels', 'UPS / FedEx / USPS / DHL', 'Parcels'],
      ] },
      { i18nKey: 'subCommunity', en: 'Community & events', rows: [
        ['enabledKickstarter', 'Kickstarter', 'Kickstarter'],
        ['enabledGofundme', 'GoFundMe', 'Gofundme'],
        ['enabledPatreon', 'Patreon', 'Patreon'],
        ['enabledMeetup', 'Meetup', 'Meetup'],
        ['enabledEventbrite', 'Eventbrite', 'Eventbrite'],
        ['enabledChangeorg', 'Change.org', 'Changeorg'],
      ] },
      { i18nKey: 'subFood', en: 'Food & recipes', rows: [
        ['enabledAllrecipes', 'AllRecipes', 'Allrecipes'],
        ['enabledSeriouseats', 'Serious Eats', 'Seriouseats'],
        ['enabledFoodnetwork', 'Food Network', 'Foodnetwork'],
        ['enabledBbcgoodfood', 'BBC Good Food', 'Bbcgoodfood'],
      ] },
      { i18nKey: 'subSports', en: 'Sports', rows: [
        ['enabledEspn', 'ESPN', 'Espn'],
        ['enabledFlashscore', 'Flashscore', 'Flashscore'],
        ['enabledSofascore', 'Sofascore', 'Sofascore'],
      ] },
    ],
    americas: [
      { i18nKey: 'subShopping', en: 'Shopping', rows: [
        ['enabledWalmart', 'Walmart', 'Walmart'],
        ['enabledTarget', 'Target', 'Target'],
        ['enabledMercadolibre', 'Mercado Libre', 'Mercadolibre'],
        ['enabledBestbuy', 'Best Buy', 'Bestbuy'],
        ['enabledAmericanas', 'Americanas', 'Americanas'],
        ['enabledMagalu', 'Magalu', 'Magalu'],
      ] },
    ],
    apac: [
      { i18nKey: 'subShopping', en: 'Shopping', rows: [
        ['enabledShopee', 'Shopee', 'Shopee'],
        ['enabledLazada', 'Lazada', 'Lazada'],
        ['enabledTokopedia', 'Tokopedia', 'Tokopedia'],
        ['enabledCoupang', 'Coupang', 'Coupang'],
        ['enabledFlipkart', 'Flipkart', 'Flipkart'],
        ['enabledMercari', 'Mercari', 'Mercari'],
        ['enabledRakuten', 'Rakuten', 'Rakuten'],
        ['enabledMeesho', 'Meesho', 'Meesho'],
        ['enabledCarousell', 'Carousell', 'Carousell'],
        ['enabledTaobao', 'Taobao/Tmall', 'Taobao'],
        ['enabledJd', 'JD.com', 'Jd'],
      ] },
      { i18nKey: 'subSearchPortals', en: 'Search & portals', rows: [
        ['enabledNaver', 'Naver', 'Naver'],
        ['enabledZhihu', 'Zhihu', 'Zhihu'],
        ['enabledWeibo', 'Weibo', 'Weibo'],
        ['enabledYahoojp', 'Yahoo! Japan Search', 'Yahoojp'],
        ['enabledNiconico', 'Niconico', 'Niconico'],
        ['enabledDaum', 'Daum', 'Daum'],
        ['enabledGmarket', 'Gmarket', 'Gmarket'],
        ['enabledElevenst', '11st', 'Elevenst'],
        ['enabledMyntra', 'Myntra', 'Myntra'],
        ['enabledZomato', 'Zomato', 'Zomato'],
        ['enabledSwiggy', 'Swiggy', 'Swiggy'],
        ['enabledDaraz', 'Daraz', 'Daraz'],
      ] },
    ],
    europe: [
      { i18nKey: 'subShopping', en: 'Shopping', rows: [
        ['enabledVinted', 'Vinted', 'Vinted'],
        ['enabledAllegro', 'Allegro', 'Allegro'],
        ['enabledLeboncoin', 'Leboncoin', 'Leboncoin'],
        ['enabledOlx', 'OLX', 'Olx'],
        ['enabledWallapop', 'Wallapop', 'Wallapop'],
        ['enabledMarktplaats', 'Marktplaats', 'Marktplaats'],
        ['enabledKleinanzeigen', 'Kleinanzeigen', 'Kleinanzeigen'],
        ['enabledZalando', 'Zalando', 'Zalando'],
        ['enabledBol', 'Bol.com', 'Bol'],
        ['enabledOtto', 'OTTO', 'Otto'],
        ['enabledMediamarkt', 'MediaMarkt', 'Mediamarkt'],
        ['enabledCdiscount', 'Cdiscount', 'Cdiscount'],
        ['enabledFnac', 'Fnac', 'Fnac'],
        ['enabledTrendyol', 'Trendyol', 'Trendyol'],
        ['enabledHepsiburada', 'Hepsiburada', 'Hepsiburada'],
        ['enabledWildberries', 'Wildberries', 'Wildberries'],
        ['enabledOzon', 'Ozon', 'Ozon'],
        ['enabledAvito', 'Avito', 'Avito'],
      ] },
    ],
    news: [
      { i18nKey: 'newsAmericas', en: 'Americas', rows: [
        ['enabledNewsNyt', 'New York Times', 'NewsNyt'],
        ['enabledNewsWapo', 'Washington Post', 'NewsWapo'],
        ['enabledNewsWsj', 'Wall Street Journal', 'NewsWsj'],
        ['enabledNewsBloomberg', 'Bloomberg', 'NewsBloomberg'],
        ['enabledNewsCnn', 'CNN', 'NewsCnn'],
        ['enabledNewsFox', 'Fox News', 'NewsFox'],
        ['enabledNewsNpr', 'NPR', 'NewsNpr'],
        ['enabledNewsCbc', 'CBC', 'NewsCbc'],
        ['enabledNewsGlobemail', 'The Globe and Mail', 'NewsGlobemail'],
        ['enabledNewsGlobo', 'Globo', 'NewsGlobo'],
        ['enabledNewsClarin', 'Clarín', 'NewsClarin'],
        ['enabledNewsInfobae', 'Infobae', 'NewsInfobae'],
      ] },
      { i18nKey: 'newsEurope', en: 'Europe', rows: [
        ['enabledNewsGuardian', 'The Guardian', 'NewsGuardian'],
        ['enabledNewsBbc', 'BBC', 'NewsBbc'],
        ['enabledNewsDailymail', 'Daily Mail', 'NewsDailymail'],
        ['enabledNewsTelegraph', 'The Telegraph', 'NewsTelegraph'],
        ['enabledNewsIndependent', 'The Independent', 'NewsIndependent'],
        ['enabledNewsFt', 'Financial Times', 'NewsFt'],
        ['enabledNewsEconomist', 'The Economist', 'NewsEconomist'],
        ['enabledNewsLemonde', 'Le Monde', 'NewsLemonde'],
        ['enabledNewsLefigaro', 'Le Figaro', 'NewsLefigaro'],
        ['enabledNewsFrance24', 'France 24', 'NewsFrance24'],
        ['enabledNewsEuronews', 'Euronews', 'NewsEuronews'],
        ['enabledNewsDw', 'DW', 'NewsDw'],
        ['enabledNewsSpiegel', 'Der Spiegel', 'NewsSpiegel'],
        ['enabledNewsBild', 'Bild', 'NewsBild'],
        ['enabledNewsElpais', 'El País', 'NewsElpais'],
        ['enabledNewsElmundo', 'El Mundo', 'NewsElmundo'],
        ['enabledNewsCorriere', 'Corriere della Sera', 'NewsCorriere'],
        ['enabledNewsRepubblica', 'la Repubblica', 'NewsRepubblica'],
      ] },
      { i18nKey: 'newsApac', en: 'Asia-Pacific', rows: [
        ['enabledNewsToi', 'Times of India', 'NewsToi'],
        ['enabledNewsThehindu', 'The Hindu', 'NewsThehindu'],
        ['enabledNewsNdtv', 'NDTV', 'NewsNdtv'],
        ['enabledNewsIndianexpress', 'Indian Express', 'NewsIndianexpress'],
        ['enabledNewsAsahi', 'Asahi Shimbun', 'NewsAsahi'],
        ['enabledNewsNikkei', 'Nikkei', 'NewsNikkei'],
        ['enabledNewsNhk', 'NHK', 'NewsNhk'],
        ['enabledNewsYahoojp', 'Yahoo! News Japan', 'NewsYahoojp'],
        ['enabledNewsScmp', 'South China Morning Post', 'NewsScmp'],
        ['enabledNewsStraitstimes', 'The Straits Times', 'NewsStraitstimes'],
        ['enabledNewsCna', 'CNA', 'NewsCna'],
        ['enabledNewsAbcAu', 'ABC News (AU)', 'NewsAbcAu'],
        ['enabledNewsSmh', 'Sydney Morning Herald', 'NewsSmh'],
        ['enabledNewsNewscomau', 'news.com.au', 'NewsNewscomau'],
        ['enabledNewsChosun', 'Chosun Ilbo', 'NewsChosun'],
      ] },
      { i18nKey: 'newsMea', en: 'Middle East & Africa', rows: [
        ['enabledNewsAljazeera', 'Al Jazeera', 'NewsAljazeera'],
        ['enabledNewsTimesofisrael', 'Times of Israel', 'NewsTimesofisrael'],
        ['enabledNewsHaaretz', 'Haaretz', 'NewsHaaretz'],
        ['enabledNewsArabnews', 'Arab News', 'NewsArabnews'],
        ['enabledNewsNews24', 'News24', 'NewsNews24'],
      ] },
      { i18nKey: 'newsAgencies', en: 'Global agencies', rows: [
        ['enabledNewsReuters', 'Reuters', 'NewsReuters'],
        ['enabledNewsAp', 'Associated Press', 'NewsAp'],
      ] },
    ],
  };

  const SITES = [];
  const SITE_LABEL_MAP = {};
  for (const group of Object.keys(SITE_GROUPS)) {
    for (const sec of SITE_GROUPS[group]) {
      for (const r of sec.rows) {
        SITES.push({ key: r[0], group });
        SITE_LABEL_MAP[r[0]] = r[1];
      }
    }
  }
  const SITE_KEYS = SITES.map((s) => s.key);

  const DEFAULTS = {
    enabled: true,
    hideTravelPopup: false,
    includeAmazonTitle: false,
    enabledUtmStrip: false,
    enabledRedirectSkip: true,
  };
  for (const k of SITE_KEYS) DEFAULTS[k] = true;

  const masterEl = document.getElementById('enabled');
  const hidePopupEl = document.getElementById('hideTravelPopup');
  const includeTitleEl = document.getElementById('includeAmazonTitle');
  const utmStripEl = document.getElementById('enabledUtmStrip');
  const redirectSkipEl = document.getElementById('enabledRedirectSkip');
  const status = document.getElementById('status');
  const versionEl = document.getElementById('version');
  const siteTogglesEl = document.getElementById('site-toggles');
  const currentPageEl = document.getElementById('current-page');

  // The current-page block (clean preview, diff chips, copy/QR) only makes
  // sense while the extension is actually working. With the master switch
  // OFF the address bar is left alone, so showing "Removes 6 tracking
  // params" directly under an "Off -- links left as-is" status read as the
  // popup arguing with itself. Gate the block on the master switch; it
  // reappears the moment the switch goes back on (no popup reopen needed).
  let currentPageReady = false;
  function syncCurrentPageVisibility() {
    if (!currentPageEl) return;
    const masterOn = !lastState || lastState.enabled !== false;
    currentPageEl.hidden = !(currentPageReady && masterOn);
  }

  // Map of storageKey -> checkbox element.
  // Toggle inputs register here as their rows render.
  const siteEls = {};
  const groupBodies = {};
  for (const el of document.querySelectorAll('.site-group[data-group]')) {
    const body = el.querySelector('.group-body');
    if (body) groupBodies[el.dataset.group] = body;
  }
  const renderedGroups = new Set();
  let lastState = null;
  // The filter registers a callback so late-rendered rows join its cache.
  let onGroupRendered = null;

  function buildRow(key, label, site, group) {
    const lab = document.createElement('label');
    lab.className = 'switch switch-sm';
    lab.htmlFor = key;
    const name = document.createElement('span');
    name.className = 'switch-label';
    name.textContent = label;
    const ctrl = document.createElement('span');
    ctrl.className = 'switch-control switch-control-sm';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = key;
    if (site) input.dataset.site = site;
    input.dataset.group = group;
    input.checked = lastState ? lastState[key] !== false : true;
    const slider = document.createElement('span');
    slider.className = 'slider';
    slider.setAttribute('aria-hidden', 'true');
    ctrl.appendChild(input);
    ctrl.appendChild(slider);
    lab.appendChild(name);
    lab.appendChild(ctrl);
    input.addEventListener('change', () => {
      chrome.storage.sync.set({ [key]: input.checked });
    });
    siteEls[key] = input;
    return lab;
  }

  function renderGroup(group) {
    if (renderedGroups.has(group) || !groupBodies[group]) return;
    renderedGroups.add(group);
    const frag = document.createDocumentFragment();
    for (const sec of SITE_GROUPS[group] || []) {
      const sub = document.createElement('p');
      sub.className = 'group-subhead';
      sub.textContent = t(sec.i18nKey, sec.en);
      frag.appendChild(sub);
      for (const r of sec.rows) frag.appendChild(buildRow(r[0], r[1], r[2], group));
    }
    groupBodies[group].appendChild(frag);
    if (onGroupRendered) onGroupRendered();
  }

  // Group-count summary elements (next to each <details><summary>).
  const groupCountEls = {
    global: document.getElementById('group-count-global'),
    americas: document.getElementById('group-count-americas'),
    apac: document.getElementById('group-count-apac'),
    europe: document.getElementById('group-count-europe'),
    news: document.getElementById('group-count-news'),
  };

  const SITE_LABELS = {
    Google: 'Google Search',
    Gdrive: 'Google Drive/Docs',
    Duckduckgo: 'DuckDuckGo',
    Weather: 'Weather.com',
    Accuweather: 'AccuWeather',
    Wunderground: 'Weather Underground',
    Bravesearch: 'Brave Search',
    Pubmed: 'PubMed',
    Scholar: 'Google Scholar',
    Researchgate: 'ResearchGate',
    Flightaware: 'FlightAware',
    Flightradar24: 'Flightradar24',
    Airlines: 'Airlines (12 carriers)',
    Netsuite: 'NetSuite',
    Playstore: 'Google Play',
    Appstore: 'Apple App Store',
    Parcels: 'UPS / FedEx / USPS / DHL',
    Gofundme: 'GoFundMe',
    Allrecipes: 'AllRecipes',
    Seriouseats: 'Serious Eats',
    Foodnetwork: 'Food Network',
    Bbcgoodfood: 'BBC Good Food',
    Homedepot: 'Home Depot',
    Lowes: "Lowe's",
    Ikea: 'IKEA',
    Epic: 'Epic Games',
    Gog: 'GOG',
    Humble: 'Humble Bundle',
    Itchio: 'itch.io',
    Espn: 'ESPN',
    Shopify: 'Shopify stores (myshopify.com)',
    Godaddy: 'GoDaddy',
    Producthunt: 'Product Hunt',
    Changeorg: 'Change.org',
    Yahoojp: 'Yahoo! Japan Search',
    Elevenst: '11st',
    Bol: 'Bol.com',
    Otto: 'OTTO',
    Mediamarkt: 'MediaMarkt',
    Atlassian: 'Jira & Confluence',
    Primevideo: 'Prime Video',
    NewsNyt: 'New York Times',
    NewsWapo: 'Washington Post',
    NewsWsj: 'Wall Street Journal',
    NewsBloomberg: 'Bloomberg',
    NewsCnn: 'CNN',
    NewsFox: 'Fox News',
    NewsNpr: 'NPR',
    NewsCbc: 'CBC',
    NewsGlobemail: 'The Globe and Mail',
    NewsGlobo: 'Globo',
    NewsClarin: 'Clarín',
    NewsInfobae: 'Infobae',
    NewsGuardian: 'The Guardian',
    NewsBbc: 'BBC',
    NewsDailymail: 'Daily Mail',
    NewsTelegraph: 'The Telegraph',
    NewsIndependent: 'The Independent',
    NewsFt: 'Financial Times',
    NewsEconomist: 'The Economist',
    NewsLemonde: 'Le Monde',
    NewsLefigaro: 'Le Figaro',
    NewsFrance24: 'France 24',
    NewsEuronews: 'Euronews',
    NewsDw: 'DW',
    NewsSpiegel: 'Der Spiegel',
    NewsBild: 'Bild',
    NewsElpais: 'El País',
    NewsElmundo: 'El Mundo',
    NewsCorriere: 'Corriere della Sera',
    NewsRepubblica: 'la Repubblica',
    NewsToi: 'Times of India',
    NewsThehindu: 'The Hindu',
    NewsNdtv: 'NDTV',
    NewsIndianexpress: 'Indian Express',
    NewsAsahi: 'Asahi Shimbun',
    NewsNikkei: 'Nikkei',
    NewsNhk: 'NHK',
    NewsYahoojp: 'Yahoo! News Japan',
    NewsScmp: 'South China Morning Post',
    NewsStraitstimes: 'The Straits Times',
    NewsCna: 'CNA',
    NewsAbcAu: 'ABC News (AU)',
    NewsSmh: 'Sydney Morning Herald',
    NewsNewscomau: 'news.com.au',
    NewsChosun: 'Chosun Ilbo',
    NewsAljazeera: 'Al Jazeera',
    NewsTimesofisrael: 'Times of Israel',
    NewsHaaretz: 'Haaretz',
    NewsArabnews: 'Arab News',
    NewsNews24: 'News24',
    NewsReuters: 'Reuters',
    NewsAp: 'Associated Press',
  };

  function siteLabelFromKey(key) {
    return SITE_LABEL_MAP[key] || key.replace(/^enabled/, '');
  }

  function setStatusText(state) {
    if (!state.enabled) {
      status.textContent = t('statusOff', 'Off -- links left as-is');
      status.classList.remove('on');
      status.classList.add('off');
      return;
    }
    const activeSites = SITE_KEYS
      .filter((k) => state[k] !== false)
      .map(siteLabelFromKey);
    const utmActive = state.enabledUtmStrip === true;

    status.classList.add('on');
    status.classList.remove('off');

    // Special case: nothing actually active under the master.
    if (activeSites.length === 0 && !utmActive) {
      status.textContent = t('statusOnNothing', 'On -- but nothing enabled');
      return;
    }
    // Per-site description fragment.
    let sitesFrag;
    let allSites = false;
    if (activeSites.length === SITE_KEYS.length) {
      allSites = true;
      sitesFrag = null;
    } else if (activeSites.length === 0) {
      sitesFrag = null;
    } else if (activeSites.length === 1) {
      sitesFrag = t('statusOneSiteOnly', activeSites[0] + ' only', [activeSites[0]]);
    } else if (activeSites.length <= 3) {
      sitesFrag = activeSites.join(', ');
    } else {
      sitesFrag = t('statusNSites', activeSites.length + ' sites', [String(activeSites.length)]);
    }
    // Combine site fragment with universal-strip fragment.
    if (utmActive && allSites) {
      // "On — everywhere + universal": the <em> is developer-authored
      // markup from the message catalog, never user input.
      setRichText(status, t('statusEverywhereUniversal', 'On <em>everywhere</em> + universal'));
    } else if (utmActive && sitesFrag) {
      status.textContent = t('statusOnSitesUniversal', 'On -- ' + sitesFrag + ' + universal', [sitesFrag]);
    } else if (utmActive) {
      status.textContent = t('statusOnUniversalOnly', 'On -- universal only');
    } else if (allSites) {
      // Every per-site toggle is on (universal strip off).
      setRichText(status, t('statusAllSites', 'On <em>all</em> sites'));
    } else {
      status.textContent = t('statusOnSites', 'On -- ' + sitesFrag, [sitesFrag]);
    }
  }

  // Update the "N of M" indicators next to each category summary.
  function setGroupCounts(state) {
    const totals = { global: 0, americas: 0, apac: 0, europe: 0, news: 0 };
    const ons = { global: 0, americas: 0, apac: 0, europe: 0, news: 0 };
    for (const s of SITES) {
      totals[s.group] += 1;
      if (state[s.key] !== false) ons[s.group] += 1;
    }
    for (const g of Object.keys(groupCountEls)) {
      const el = groupCountEls[g];
      if (!el) continue;
      el.textContent = t('groupCount', ons[g] + ' of ' + totals[g] + ' on',
        [String(ons[g]), String(totals[g])]);
    }
  }

  function setUi(state) {
    lastState = state;
    masterEl.checked = state.enabled !== false;
    if (hidePopupEl) hidePopupEl.checked = state.hideTravelPopup === true;
    if (includeTitleEl) includeTitleEl.checked = state.includeAmazonTitle === true;
    utmStripEl.checked = state.enabledUtmStrip === true;
    redirectSkipEl.checked = state.enabledRedirectSkip !== false;
    for (const k of SITE_KEYS) {
      if (siteEls[k]) siteEls[k].checked = state[k] !== false;
    }
    siteTogglesEl.classList.toggle('disabled', state.enabled === false);
    syncCurrentPageVisibility();
    setStatusText(state);
    setGroupCounts(state);
  }

  // Initial load.
  chrome.storage.sync.get(DEFAULTS, (items) => {
    setUi(items);
    // Truth check: if the strip flag is on but the permission is missing
    // (grant flow interrupted, or revoked via the browser's own UI), the
    // toggle would be a lie -- flip it back off.
    if (items.enabledUtmStrip === true && chrome.permissions && chrome.permissions.contains) {
      chrome.permissions.contains({ origins: ['*://*/*'] }, (has) => {
        void chrome.runtime.lastError;
        if (!has) chrome.storage.sync.set({ enabledUtmStrip: false });
      });
    }
  });

  // Master toggle.
  masterEl.addEventListener('change', () => {
    chrome.storage.sync.set({ enabled: masterEl.checked });
  });

  // "Hide travel popup" -- suppresses the floating toolbar widget on hotel
  // sites. Independent of the master and per-site toggles.
  if (hidePopupEl) hidePopupEl.addEventListener('change', () => {
    chrome.storage.sync.set({ hideTravelPopup: hidePopupEl.checked });
  });

  // "Include Amazon item name" -- when on, Amazon URLs are rewritten to
  // /<slug>/dp/ASIN instead of /dp/ASIN. Affects Amazon only.
  if (includeTitleEl) includeTitleEl.addEventListener('change', () => {
    chrome.storage.sync.set({ includeAmazonTitle: includeTitleEl.checked });
  });

  // "Universal tracking strip" -- gated on the optional *://*/* host
  // permission. When the user flips this on, we request the permission
  // first; if they decline, we revert the checkbox to off and don't
  // touch storage. When they flip off, we just write storage (the
  // permission stays granted at the OS level so re-enabling later
  // doesn't re-prompt).
  utmStripEl.addEventListener('change', () => {
    if (utmStripEl.checked) {
      // Persist the intent BEFORE the permission prompt. The prompt steals
      // focus, focus loss closes this popup, and a closed popup's JS is
      // destroyed -- so a callback-based "set after grant" never ran when
      // the user granted (the v1.10 dead-toggle bug). With the flag set
      // first: on grant, the background's permissions.onAdded registers
      // the strip; on deny, the callback below (if we're still alive) or
      // the next popup open's truth check flips the flag back off.
      chrome.storage.sync.set({ enabledUtmStrip: true });
      chrome.permissions.request({ origins: ['*://*/*'] }, (granted) => {
        void chrome.runtime.lastError;
        if (!granted) chrome.storage.sync.set({ enabledUtmStrip: false });
      });
    } else {
      chrome.storage.sync.set({ enabledUtmStrip: false });
    }
  });

  // "Skip redirect pages" -- navigate straight to a wrapped link's real
  // destination on click. Default ON; no permission dance (webNavigation
  // is already held). SafeLinks is excluded in the background handler.
  redirectSkipEl.addEventListener('change', () => {
    chrome.storage.sync.set({ enabledRedirectSkip: redirectSkipEl.checked });
  });

  // Per-site toggle listeners are attached in buildRow at render time.

  // React to storage changes from anywhere.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const touchesUs = Object.prototype.hasOwnProperty.call(changes, 'enabled')
      || Object.prototype.hasOwnProperty.call(changes, 'hideTravelPopup')
      || Object.prototype.hasOwnProperty.call(changes, 'includeAmazonTitle')
      || Object.prototype.hasOwnProperty.call(changes, 'enabledUtmStrip')
      || Object.prototype.hasOwnProperty.call(changes, 'enabledRedirectSkip')
      || SITE_KEYS.some((k) => Object.prototype.hasOwnProperty.call(changes, k));
    if (!touchesUs) return;
    chrome.storage.sync.get(DEFAULTS, (items) => setUi(items));
  });

  // Show the extension's own version in the footer.
  try {
    const { version } = chrome.runtime.getManifest();
    versionEl.textContent = 'v' + version;
  } catch (_e) {
    // runtime not available; skip.
  }

  // -- Category group-state persistence ------------------------------------
  // Remember which <details> groups the user expanded, in
  // chrome.storage.sync (popupOpenGroups: { shopping, travel, social }).
  // Programmatic restores also fire 'toggle' (asynchronously), so saves are
  // suppressed until shortly after the restore pass has applied.
  const groupEls = Array.from(
    document.querySelectorAll('details.site-group[data-group]'),
  );
  let restoringGroups = true;
  // While a filter query is active we force-open matching groups; those
  // programmatic toggles must not be persisted as the user's preference.
  let filtering = false;

  function saveGroupState() {
    if (restoringGroups || filtering) return;
    const state = {};
    for (const el of groupEls) state[el.dataset.group] = el.open;
    chrome.storage.sync.set({ popupOpenGroups: state });
  }

  for (const el of groupEls) {
    el.addEventListener('toggle', () => {
      if (el.open) renderGroup(el.dataset.group);
      saveGroupState();
    });
  }

  chrome.storage.sync.get({ popupOpenGroups: null }, (items) => {
    const saved = items.popupOpenGroups;
    if (saved && typeof saved === 'object') {
      for (const el of groupEls) {
        if (Object.prototype.hasOwnProperty.call(saved, el.dataset.group)) {
          el.open = saved[el.dataset.group] === true;
        }
      }
    }
    // <details> toggle events fire on a queued task, so lift the suppression
    // on a short delay — the restore's own toggles land before this runs.
    setTimeout(() => { restoringGroups = false; }, 50);
  });

  // "Advanced" footer link -> open the options page (rendered inline by the
  // browser when options_ui.open_in_tab is false).
  const advancedLinkEl = document.getElementById('open-options');
  if (advancedLinkEl) {
    advancedLinkEl.addEventListener('click', (e) => {
      e.preventDefault();
      if (chrome.runtime && chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      }
    });
  }

  // -- Keyboard-shortcut tip: show the REAL binding ---------------------------
  // Browsers silently assign NOTHING when the suggested key conflicts with
  // another extension; commands.getAll tells us what (if anything) is
  // actually bound so the tip never lies. Falls back to the static text
  // when the API is unavailable.
  // Help dots sit inside <label> elements; without this, clicking one
  // would flip the toggle it's trying to explain.
  for (const dot of document.querySelectorAll('.help-dot')) {
    dot.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  const bulkLinkEl = document.getElementById('open-bulk');
  if (bulkLinkEl) {
    bulkLinkEl.addEventListener('click', (e) => {
      e.preventDefault();
      if (chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: chrome.runtime.getURL('src/bulk.html') });
        window.close();
      }
    });
  }

  (function initShortcutTip() {
    const el = document.getElementById('shortcut-tip');
    if (!el || !chrome.commands || !chrome.commands.getAll) return;
    chrome.commands.getAll((cmds) => {
      void chrome.runtime.lastError;
      const cmd = (cmds || []).find((c) => c.name === 'copy-clean-url');
      if (!cmd) return;
      el.textContent = cmd.shortcut
        ? t('tipShortcut',
          'Tip: ' + cmd.shortcut + ' copies a clean URL of the current page. '
          + "Rebind it in your browser's extension shortcut settings.",
          [cmd.shortcut])
        : t('tipShortcutUnset',
          'Tip: the copy-clean-URL keyboard shortcut is not set (another '
          + "extension may have claimed it). Assign one in your browser's "
          + 'extension shortcut settings.');
    });
  })();

  // -- Current page: clean-URL preview + copy button --------------------------
  // Asks the background (which has every URL module loaded) to clean the
  // active tab's URL through the same pipeline as the context menu and the
  // keyboard shortcut. Hidden entirely on non-http(s) pages.
  (function initCurrentPage() {
    const section = document.getElementById('current-page');
    const urlEl = document.getElementById('current-url');
    const noteEl = document.getElementById('current-note');
    const btn = document.getElementById('copy-clean');
    const moreBtn = document.getElementById('copy-more');
    const menuEl = document.getElementById('copy-menu');
    const qrBtn = document.getElementById('qr-btn');
    const qrBox = document.getElementById('qr-box');
    const removedEl = document.getElementById('removed-details');
    const removedSummary = document.getElementById('removed-summary');
    const chipsEl = document.getElementById('removed-chips');
    const copyOriginalBtn = document.getElementById('copy-original');
    if (!section || !urlEl || !noteEl || !btn || !chrome.tabs) return;

    function legacyCopy(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand('copy'); } catch (_e) {}
      ta.remove();
    }

    function writeClipboard(text, html, done) {
      if (html && navigator.clipboard && navigator.clipboard.write
          && typeof ClipboardItem !== 'undefined') {
        try {
          navigator.clipboard.write([new ClipboardItem({
            'text/plain': new Blob([text], { type: 'text/plain' }),
            'text/html': new Blob([html], { type: 'text/html' }),
          })]).then(done, () => { legacyCopy(text); done(); });
          return;
        } catch (_e) { /* fall through */ }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, () => { legacyCopy(text); done(); });
      } else {
        legacyCopy(text);
        done();
      }
    }

    // Everything the address bar lost, as strikethrough chips: removed
    // query params, a changed path, a dropped hash, and (after an unwrap)
    // the wrapper host itself.
    function diffChips(orig, fin) {
      const chips = [];
      let o;
      let f;
      try { o = new URL(orig); f = new URL(fin); } catch (_e) { return chips; }
      if (o.hostname !== f.hostname) {
        // Unwrap case: the whole wrapper URL went away. Param-by-param
        // diffing across two different hosts is noise; one chip tells
        // the real story.
        chips.push({ label: t('chipUnwrapped', 'unwrapped:'), text: o.hostname });
        return chips;
      }
      const kept = new Set();
      f.searchParams.forEach((v, k) => kept.add(k + '=' + v));
      o.searchParams.forEach((v, k) => {
        if (!kept.has(k + '=' + v)) chips.push({ k, v });
      });
      if (o.pathname !== f.pathname) {
        chips.push({ label: t('chipPath', 'path:'), text: o.pathname });
      }
      if (o.hash && o.hash !== f.hash) {
        chips.push({ label: '#', text: o.hash.slice(1) });
      }
      return chips;
    }

    function trunc(str, n) {
      return str.length > n ? str.slice(0, n - 1) + '\u2026' : str;
    }

    function escapeMdLabel(str) {
      return String(str).replace(/([\\\[\]])/g, '\\$1');
    }

    function escapeHtml(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      void chrome.runtime.lastError;
      const tab = tabs && tabs[0];
      const tabUrl = tab && tab.url;
      if (!tabUrl || !/^https?:/i.test(tabUrl)) return;
      const tabTitle = (tab.title || '').trim();

      const start = (stash) => {
        chrome.runtime.sendMessage({ type: 'clean-url', url: tabUrl }, (resp) => {
          void chrome.runtime.lastError;
          const cleaned = (resp && resp.cleaned) || tabUrl;
          // Truest original: what the address bar showed BEFORE the content
          // script rewrote it in place (session stash), else the tab URL.
          const original = stash && stash.cleaned === tabUrl && typeof stash.original === 'string'
            ? stash.original
            : tabUrl;
          render(original, cleaned);
        });
      };
      if (chrome.storage.session && tab.id != null) {
        chrome.storage.session.get('orig:' + tab.id, (items) => {
          void chrome.runtime.lastError;
          start(items ? items['orig:' + tab.id] : null);
        });
      } else {
        start(null);
      }

      function recordCopy(original, cleaned) {
        try {
          chrome.runtime.sendMessage({
            type: 'record-copy',
            changed: cleaned !== original,
            saved: Math.max(0, original.length - cleaned.length),
          }, () => void chrome.runtime.lastError);
        } catch (_e) { /* ignore */ }
      }

      function render(original, cleaned) {
        urlEl.textContent = cleaned;
        urlEl.title = cleaned;
        const chips = diffChips(original, cleaned);
        if (original === cleaned) {
          noteEl.textContent = t('alreadyClean', 'Already clean');
          noteEl.classList.remove('dirty');
        } else {
          const removed = chips.filter((c) => c.k !== undefined).length;
          noteEl.textContent = removed > 0
            ? (removed === 1
              ? t('removesParamOne', 'Removes 1 tracking param')
              : t('removesParams', 'Removes ' + removed + ' tracking params', [String(removed)]))
            : t('shortensUrl', 'Shortens this URL');
          noteEl.classList.add('dirty');
        }
        currentPageReady = true;
        syncCurrentPageVisibility();

        // -- "What was removed" chips --
        if (chips.length && removedEl && chipsEl && removedSummary) {
          removedSummary.textContent = t('whatRemoved', 'What was removed (' + chips.length + ')', [String(chips.length)]);
          chipsEl.textContent = '';
          for (const c of chips) {
            const span = document.createElement('span');
            span.className = 'chip';
            if (c.k !== undefined) {
              const b = document.createElement('span');
              b.className = 'chip-k';
              b.textContent = c.k;
              span.appendChild(b);
              span.appendChild(document.createTextNode(
                c.v ? '=' + trunc(c.v, 24) : '',
              ));
              span.title = c.k + (c.v ? '=' + c.v : '');
            } else {
              span.textContent = c.label + ' ' + trunc(c.text, 30);
              span.title = c.label + ' ' + c.text;
            }
            chipsEl.appendChild(span);
          }
          removedEl.hidden = false;
        }

        // -- Copy button feedback --
        const done = () => {
          // Capture the resting label ONCE -- a second click inside the
          // 1.4s window must not capture "Copied" as the restore text.
          if (!btn.dataset.label) btn.dataset.label = btn.textContent;
          btn.textContent = t('copied', 'Copied \u2713');
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = btn.dataset.label;
            btn.classList.remove('copied');
          }, 1400);
        };

        btn.addEventListener('click', () => {
          writeClipboard(cleaned, null, done);
          recordCopy(original, cleaned);
        });

        // -- Format menu --
        if (moreBtn && menuEl) {
          moreBtn.addEventListener('click', () => {
            menuEl.hidden = !menuEl.hidden;
            if (!menuEl.hidden && qrBox) qrBox.hidden = true;
          });
          if (copyOriginalBtn && original !== cleaned) copyOriginalBtn.hidden = false;
          menuEl.addEventListener('click', (e) => {
            if (e.target && e.target.getAttribute
                && e.target.getAttribute('data-action') === 'report') {
              // Background builds the prefilled GitHub issue from the pair
              // we already have -- the truest original vs what we produced.
              try {
                chrome.runtime.sendMessage(
                  { type: 'open-report', original, cleaned },
                  () => void chrome.runtime.lastError,
                );
              } catch (_e) { /* ignore */ }
              menuEl.hidden = true;
              window.close();
              return;
            }
            const fmt = e.target && e.target.getAttribute
              ? e.target.getAttribute('data-fmt') : null;
            if (!fmt) return;
            const title = tabTitle || cleaned;
            let text = cleaned;
            let html = null;
            if (fmt === 'md') {
              const mdUrl = cleaned.replace(/\(/g, '%28').replace(/\)/g, '%29');
              text = '[' + escapeMdLabel(title) + '](' + mdUrl + ')';
            } else if (fmt === 'html') {
              text = '<a href="' + escapeHtml(cleaned) + '">' + escapeHtml(title) + '</a>';
              html = text;
            } else if (fmt === 'titleurl') {
              text = title + '\n' + cleaned;
            } else if (fmt === 'original') {
              text = original;
            }
            writeClipboard(text, html, done);
            if (fmt !== 'original') recordCopy(original, cleaned);
            menuEl.hidden = true;
          });
        }

        // -- QR --
        if (qrBtn && qrBox && self.QrEncoder && typeof self.QrEncoder.svg === 'function'
            && self.QrEncoder.encode(cleaned)) {
          qrBtn.hidden = false;
          let rendered = false;
          qrBtn.addEventListener('click', () => {
            if (!rendered) {
              const svg = self.QrEncoder.svg(cleaned);
              if (!svg) return;
              // Parse as real SVG and adopt the element -- no innerHTML.
              const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
              if (!doc.documentElement || doc.querySelector('parsererror')) return;
              qrBox.replaceChildren(doc.documentElement);
              rendered = true;
            }
            qrBox.hidden = !qrBox.hidden;
            if (!qrBox.hidden && menuEl) menuEl.hidden = true;
          });
        }
      }
    });
  })();

  // -- Local stats line ---------------------------------------------------------
  // Vanity counter from chrome.storage.local (device-only, never synced,
  // never sent anywhere). Hidden until the first cleaned URL.
  (function initStatsLine() {
    const el = document.getElementById('stats-line');
    if (!el || !chrome.storage || !chrome.storage.local) return;
    chrome.storage.local.get({ stats: null }, (items) => {
      void chrome.runtime.lastError;
      const s = items && items.stats;
      if (!s || !s.urls) return;
      const chars = (s.chars || 0).toLocaleString();
      const urls = (s.urls || 0).toLocaleString();
      el.textContent = t(
        'statsLine',
        urls + ' URLs cleaned on this device \u00b7 ' + chars + ' characters of junk removed',
        [urls, chars],
      );
      el.hidden = false;
    });
  })();

  // -- Site filter --------------------------------------------------------------
  // Live-filters the per-site toggle rows by label text. Groups with matches
  // are force-opened (without persisting that state — see `filtering`);
  // groups with none are hidden. Clearing the query restores the user's
  // pre-filter open/closed arrangement. Esc clears.
  (function initSiteFilter() {
    const input = document.getElementById('site-filter');
    if (!input) return;
    // Rows render lazily, so the search cache materializes everything the
    // first time a query is typed (a one-off ~200-row build, still far
    // cheaper than doing it on every popup open).
    let rows = [];
    let rowsComplete = false;
    function collectRows() {
      rows = [];
      for (const k of SITE_KEYS) {
        const el = siteEls[k];
        if (!el) continue;
        const row = el.closest('label.switch');
        if (!row) continue;
        const labelEl = row.querySelector('.switch-label');
        rows.push({
          row,
          text: ((labelEl && labelEl.textContent) || '').toLowerCase(),
          group: el.dataset.group,
        });
      }
      rowsComplete = rows.length === SITE_KEYS.length;
    }
    function ensureRows() {
      if (rowsComplete) return;
      for (const g of Object.keys(SITE_GROUPS)) renderGroup(g);
      collectRows();
    }
    onGroupRendered = () => { if (rows.length) collectRows(); };
    let preFilterOpen = null;

    function applyFilter() {
      const q = input.value.trim().toLowerCase();
      if (q) ensureRows();
      if (!q) {
        const emptyEl = document.getElementById('filter-empty');
        if (emptyEl) emptyEl.hidden = true;
        siteTogglesEl.classList.remove('filtering');
        for (const r of rows) r.row.classList.remove('filter-hidden');
        for (const el of groupEls) {
          el.classList.remove('filter-hidden');
          if (preFilterOpen && Object.prototype.hasOwnProperty.call(preFilterOpen, el.dataset.group)) {
            el.open = preFilterOpen[el.dataset.group];
          }
        }
        preFilterOpen = null;
        // Restoration fires 'toggle' on a queued task; lift the save
        // suppression after those land (same trick as the initial restore).
        setTimeout(() => { if (!input.value.trim()) filtering = false; }, 50);
        return;
      }
      if (preFilterOpen === null) {
        preFilterOpen = {};
        for (const el of groupEls) preFilterOpen[el.dataset.group] = el.open;
      }
      filtering = true;
      siteTogglesEl.classList.add('filtering');
      const groupHits = {};
      for (const r of rows) {
        const hit = r.text.indexOf(q) !== -1;
        r.row.classList.toggle('filter-hidden', !hit);
        if (hit) groupHits[r.group] = (groupHits[r.group] || 0) + 1;
      }
      let anyHit = false;
      for (const el of groupEls) {
        const hits = groupHits[el.dataset.group] || 0;
        el.classList.toggle('filter-hidden', hits === 0);
        if (hits > 0) { el.open = true; anyHit = true; }
      }
      const emptyEl = document.getElementById('filter-empty');
      if (emptyEl) emptyEl.hidden = anyHit;
    }

    input.addEventListener('input', applyFilter);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && input.value) {
        // preventDefault is what stops Chrome from closing the whole
        // popup on Esc (stopPropagation alone doesn't touch browser
        // defaults). With text present, Esc means "clear the filter";
        // with the box already empty, Esc closes the popup as usual.
        e.preventDefault();
        e.stopPropagation();
        input.value = '';
        applyFilter();
      }
    });
  })();
})();
