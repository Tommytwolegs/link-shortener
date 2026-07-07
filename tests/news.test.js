const path = require('path');
const {
  shortenNewsUrl,
  needsShortening,
  isNewsHost,
  storageKeyFor,
  OUTLETS,
} = require(path.join('..', 'src', 'news.js'));

const CASES = [
  // Yahoo! News Japan
  { name: 'yahoojp: source share attribution stripped',
    input: 'https://news.yahoo.co.jp/articles/0123456789abcdef0123456789abcdef01234567?source=sns',
    expected: 'https://news.yahoo.co.jp/articles/0123456789abcdef0123456789abcdef01234567' },
  { name: 'yahoojp: article already clean',
    input: 'https://news.yahoo.co.jp/articles/0123456789abcdef0123456789abcdef01234567',
    expected: 'https://news.yahoo.co.jp/articles/0123456789abcdef0123456789abcdef01234567',
    expectedNeeds: false },
  { name: 'yahoojp: pickup + page param survives (functional)',
    input: 'https://news.yahoo.co.jp/articles/0123456789abcdef0123456789abcdef01234567?page=2&utm_source=x',
    expected: 'https://news.yahoo.co.jp/articles/0123456789abcdef0123456789abcdef01234567?page=2' },

  { name: 'NYT smid stripped',
    input: 'https://www.nytimes.com/2026/06/12/technology/article.html?smid=url-share&smtyp=cur',
    expected: 'https://www.nytimes.com/2026/06/12/technology/article.html' },
  { name: 'NYT gift token PRESERVED',
    input: 'https://www.nytimes.com/2026/06/12/tech/a.html?unlocked_article_code=1.abc&smid=url-share',
    expected: 'https://www.nytimes.com/2026/06/12/tech/a.html?unlocked_article_code=1.abc' },
  { name: 'WSJ mod stripped, st gift PRESERVED',
    input: 'https://www.wsj.com/tech/story?mod=hp_lead_pos1&st=xyzGift',
    expected: 'https://www.wsj.com/tech/story?st=xyzGift' },
  { name: 'Bloomberg sref stripped, accessToken PRESERVED',
    input: 'https://www.bloomberg.com/news/articles/story?sref=Ab&accessToken=xy&cmpid=socialflow',
    expected: 'https://www.bloomberg.com/news/articles/story?accessToken=xy' },
  { name: 'CBC cmp stripped',
    input: 'https://www.cbc.ca/news/canada/story-1.123?cmp=rss&__vfz=medium%3Dshare',
    expected: 'https://www.cbc.ca/news/canada/story-1.123' },
  { name: 'Globe and Mail cmpid stripped',
    input: 'https://www.theglobeandmail.com/business/article-x/?cmpid=rss',
    expected: 'https://www.theglobeandmail.com/business/article-x/' },
  { name: 'Globo utm-only stripped',
    input: 'https://g1.globo.com/economia/noticia/2026/06/12/x.ghtml?utm_source=whatsapp',
    expected: 'https://g1.globo.com/economia/noticia/2026/06/12/x.ghtml' },
  { name: 'Infobae clean passthrough',
    input: 'https://www.infobae.com/america/2026/06/12/nota/',
    expected: 'https://www.infobae.com/america/2026/06/12/nota/',
    expectedNeeds: false },
  { name: 'Guardian CMP stripped',
    input: 'https://www.theguardian.com/world/2026/jun/12/story?CMP=share_btn_url',
    expected: 'https://www.theguardian.com/world/2026/jun/12/story' },
  { name: 'BBC at_* prefix + xtor stripped',
    input: 'https://www.bbc.co.uk/news/articles/abc?at_medium=social&at_campaign=Social_Flow&xtor=AL-72',
    expected: 'https://www.bbc.co.uk/news/articles/abc' },
  { name: 'Telegraph WT.mc_id + icid stripped',
    input: 'https://www.telegraph.co.uk/news/2026/06/12/story/?WT.mc_id=tmg_share_tw&icid=x',
    expected: 'https://www.telegraph.co.uk/news/2026/06/12/story/' },
  { name: 'FT ftcamp stripped, gift params PRESERVED',
    input: 'https://www.ft.com/content/abc-123?ftcamp=traffic%2Fsocial&shareType=gift&token=99',
    expected: 'https://www.ft.com/content/abc-123?shareType=gift&token=99' },
  { name: 'Economist fsrc stripped',
    input: 'https://www.economist.com/leaders/2026/06/12/story?fsrc=core-app-economist',
    expected: 'https://www.economist.com/leaders/2026/06/12/story' },
  { name: 'Le Monde xtor stripped',
    input: 'https://www.lemonde.fr/international/article/2026/06/12/x.html?xtor=AL-32280270',
    expected: 'https://www.lemonde.fr/international/article/2026/06/12/x.html' },
  { name: 'France 24 at_ prefix stripped',
    input: 'https://www.france24.com/en/europe/20260612-story?at_medium=custom&at_campaign=fb',
    expected: 'https://www.france24.com/en/europe/20260612-story' },
  { name: 'DW maca stripped',
    input: 'https://www.dw.com/en/story/a-12345678?maca=en-rss-en-all-1573-rdf',
    expected: 'https://www.dw.com/en/story/a-12345678' },
  { name: 'Spiegel sara_ref stripped',
    input: 'https://www.spiegel.de/politik/story-a-1.html?sara_ref=re-so-app-sh',
    expected: 'https://www.spiegel.de/politik/story-a-1.html' },
  { name: 'El Pais prm + ssm stripped',
    input: 'https://elpais.com/internacional/2026-06-12/nota.html?prm=copy_link&ssm=whatsapp',
    expected: 'https://elpais.com/internacional/2026-06-12/nota.html' },
  { name: 'Repubblica ref stripped (scoped to this outlet)',
    input: 'https://www.repubblica.it/cronaca/2026/06/12/news/x-123/?ref=RHPPTP-BH-I0-P1-S1-T1',
    expected: 'https://www.repubblica.it/cronaca/2026/06/12/news/x-123/' },
  { name: 'SCMP module + pgtype stripped',
    input: 'https://www.scmp.com/news/china/article/123/story?module=perpetual_scroll_0&pgtype=article',
    expected: 'https://www.scmp.com/news/china/article/123/story' },
  { name: 'NDTV pfrom stripped',
    input: 'https://www.ndtv.com/india-news/story-123?pfrom=home-ndtv_topstories',
    expected: 'https://www.ndtv.com/india-news/story-123' },
  { name: 'Asahi iref stripped',
    input: 'https://www.asahi.com/articles/ASN123.html?iref=comtop_7_01',
    expected: 'https://www.asahi.com/articles/ASN123.html' },
  { name: 'Nikkei n_cid stripped',
    input: 'https://www.nikkei.com/article/DGXZQO123/?n_cid=SNSTW001',
    expected: 'https://www.nikkei.com/article/DGXZQO123/' },
  { name: 'ABC AU sf stripped',
    input: 'https://www.abc.net.au/news/2026-06-12/story/104567?sf=via-twitter',
    expected: 'https://www.abc.net.au/news/2026-06-12/story/104567' },
  { name: 'CNA cid stripped',
    input: 'https://www.channelnewsasia.com/singapore/story-456?cid=telegram_cna',
    expected: 'https://www.channelnewsasia.com/singapore/story-456' },
  { name: 'Al Jazeera traffic_source stripped',
    input: 'https://www.aljazeera.com/news/2026/6/12/story?traffic_source=rss',
    expected: 'https://www.aljazeera.com/news/2026/6/12/story' },
  { name: 'Reuters taid stripped',
    input: 'https://www.reuters.com/world/story-2026-06-12/?taid=abc',
    expected: 'https://www.reuters.com/world/story-2026-06-12/' },
  { name: 'AP utm stripped',
    input: 'https://apnews.com/article/abc?utm_source=copy',
    expected: 'https://apnews.com/article/abc' },
  { name: 'News24 clean passthrough',
    input: 'https://www.news24.com/news24/southafrica/news/story-20260612',
    expected: 'https://www.news24.com/news24/southafrica/news/story-20260612',
    expectedNeeds: false },
  { name: 'scoping: module NOT stripped on Guardian',
    input: 'https://www.theguardian.com/world/story?module=nav',
    expected: 'https://www.theguardian.com/world/story?module=nav',
    expectedNeeds: false },
  { name: 'scoping: ref NOT stripped on NYT',
    input: 'https://www.nytimes.com/2026/06/12/a.html?ref=oembed',
    expected: 'https://www.nytimes.com/2026/06/12/a.html?ref=oembed',
    expectedNeeds: false },
  { name: 'scoping: sf NOT stripped on BBC',
    input: 'https://www.bbc.com/news/articles/abc?sf=123',
    expected: 'https://www.bbc.com/news/articles/abc?sf=123',
    expectedNeeds: false },
  { name: 'hash preserved',
    input: 'https://www.lemonde.fr/x/article/2026/06/12/y.html?xtor=AL-1#comments',
    expected: 'https://www.lemonde.fr/x/article/2026/06/12/y.html#comments' },
  { name: 'non-outlet → null',
    input: 'https://www.economist-lookalike.com/story?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenNewsUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('host: nytimes', isNewsHost('www.nytimes.com'), true);
check('host: g1.globo.com subdomain', isNewsHost('g1.globo.com'), true);
check('host: lookalike', isNewsHost('nytimes.com.evil.com'), false);
check('storageKeyFor: nyt', storageKeyFor('www.nytimes.com'), 'enabledNewsNyt');
check('storageKeyFor: bbc.co.uk', storageKeyFor('www.bbc.co.uk'), 'enabledNewsBbc');
check('storageKeyFor: scmp', storageKeyFor('www.scmp.com'), 'enabledNewsScmp');
check('storageKeyFor: aljazeera', storageKeyFor('www.aljazeera.com'), 'enabledNewsAljazeera');
check('storageKeyFor: non-news null', storageKeyFor('example.com'), null);
check('outlet count', OUTLETS.length, 52);
// every outlet has a unique key
check('unique keys', new Set(OUTLETS.map(o=>o.key)).size, 52);
check('shorten on garbage', shortenNewsUrl('not a url'), null);
check('needs on garbage', needsShortening('not a url'), false);
// Mutation guard:
const probe = new URL('https://www.cnn.com/story?cid=x');
check('shorten on URL object', shortenNewsUrl(probe), 'https://www.cnn.com/story');
check('URL-object input not mutated', probe.href, 'https://www.cnn.com/story?cid=x');
console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log('  - ' + f.label);
    console.log('      expected: ' + JSON.stringify(f.expected));
    console.log('      actual:   ' + JSON.stringify(f.actual));
  }
  process.exit(1);
}
