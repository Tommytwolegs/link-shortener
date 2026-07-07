const path = require('path');
const {
  shortenNaverUrl,
  needsShortening,
  isNaverHost,
  isPostUrl,
} = require(path.join('..', 'src', 'naver.js'));

const CASES = [
  // Canonical
  { name: 'blog post already clean',
    input: 'https://blog.naver.com/someblogger/223456789012',
    expected: 'https://blog.naver.com/someblogger/223456789012',
    expectedNeeds: false },
  { name: 'modern news article already clean',
    input: 'https://n.news.naver.com/mnews/article/001/0014567890',
    expected: 'https://n.news.naver.com/mnews/article/001/0014567890',
    expectedNeeds: false },

  // Search telemetry strip — query + where survive
  { name: 'search: sm/tqi/oquery/ie stripped, query+where survive',
    input: 'https://search.naver.com/search.naver?where=nexearch&sm=top_hty&fbm=1&ie=utf8&query=%EB%82%A0%EC%94%A8&oquery=%EB%89%B4%EC%8A%A4&tqi=abcDEF123',
    expected: 'https://search.naver.com/search.naver?where=nexearch&query=%EB%82%A0%EC%94%A8' },
  { name: 'autocomplete telemetry stripped',
    input: 'https://search.naver.com/search.naver?query=test&ackey=abc123&qdt=0',
    expected: 'https://search.naver.com/search.naver?query=test' },

  // Legacy query-functional forms survive the denylist
  { name: 'legacy blog PostView: blogId+logNo survive, junk dies',
    input: 'https://blog.naver.com/PostView.naver?blogId=someblogger&logNo=223456789012&trackingCode=blog_bloghome_searchlist&proxyReferer=https',
    expected: 'https://blog.naver.com/PostView.naver?blogId=someblogger&logNo=223456789012' },
  { name: 'legacy cafe ArticleRead untouched (no junk)',
    input: 'https://cafe.naver.com/ArticleRead.nhn?clubid=12345&articleid=67890',
    expected: 'https://cafe.naver.com/ArticleRead.nhn?clubid=12345&articleid=67890',
    expectedNeeds: false },
  { name: 'fromRss share attribution stripped',
    input: 'https://blog.naver.com/someblogger/223456789012?fromRss=true&trackingCode=rss',
    expected: 'https://blog.naver.com/someblogger/223456789012' },
  { name: 'utm_* + fbclid stripped',
    input: 'https://n.news.naver.com/mnews/article/001/0014567890?utm_source=kakao&fbclid=IwAR1',
    expected: 'https://n.news.naver.com/mnews/article/001/0014567890' },

  // Hash preservation
  { name: 'hash preserved',
    input: 'https://blog.naver.com/someblogger/223456789012?fromRss=true#comments',
    expected: 'https://blog.naver.com/someblogger/223456789012#comments' },

  // Passthrough (denylist: unknown params stay)
  { name: 'unknown params untouched',
    input: 'https://shopping.naver.com/window-products/12345?frm=NVSCPRO',
    expected: 'https://shopping.naver.com/window-products/12345?frm=NVSCPRO',
    expectedNeeds: false },

  // Non-Naver
  { name: 'lookalike -> null',
    input: 'https://notnaver.com/search.naver?query=x&sm=top_hty',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenNaverUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isNaverHost: naver.com', isNaverHost('naver.com'), true);
check('isNaverHost: blog.naver.com', isNaverHost('blog.naver.com'), true);
check('isNaverHost: n.news.naver.com', isNaverHost('n.news.naver.com'), true);
check('isNaverHost: lookalike', isNaverHost('notnaver.com'), false);
check('isPostUrl: has junk', isPostUrl('https://blog.naver.com/x/1?fromRss=true'), true);
check('isPostUrl: clean', isPostUrl('https://blog.naver.com/x/1'), false);
check('shorten on garbage', shortenNaverUrl('not a url'), null);
check('needs on garbage', needsShortening('not a url'), false);

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
