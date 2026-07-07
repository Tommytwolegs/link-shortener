const path = require('path');
const {
  shortenBingUrl,
  needsShortening,
  isBingHost,
  isPostUrl,
} = require(path.join('..', 'src', 'bing.js'));

const CASES = [
  // Canonical
  { name: 'web search already clean',
    input: 'https://www.bing.com/search?q=hello+world',
    expected: 'https://www.bing.com/search?q=hello+world',
    expectedNeeds: false },

  // Tracking strip
  { name: 'FORM + cvid kitchen sink stripped, q survives',
    input: 'https://www.bing.com/search?q=hello+world&form=QBLH&sp=-1&pq=hello+wor&sc=10-9&qs=n&sk=&cvid=E8A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5',
    expected: 'https://www.bing.com/search?q=hello+world' },
  { name: 'pagination + locale survive, junk dies',
    input: 'https://www.bing.com/search?q=cats&first=11&count=10&mkt=en-US&form=PERE',
    expected: 'https://www.bing.com/search?q=cats&first=11&count=10&mkt=en-US' },
  { name: 'image search cleaned',
    input: 'https://www.bing.com/images/search?q=sunset&form=HDRSC2&ghsh=0&ghacc=0',
    expected: 'https://www.bing.com/images/search?q=sunset' },
  { name: 'video search cleaned',
    input: 'https://www.bing.com/videos/search?q=lofi&form=HDRSC3',
    expected: 'https://www.bing.com/videos/search?q=lofi' },
  { name: 'news search: qft filter survives',
    input: 'https://www.bing.com/news/search?q=economy&qft=interval%3d%227%22&form=PTFTNR',
    expected: 'https://www.bing.com/news/search?q=economy&qft=interval%3D%227%22' },
  { name: 'partner code + redirect telemetry stripped',
    input: 'https://www.bing.com/search?q=test&pc=U316&toWww=1&redig=ABC123',
    expected: 'https://www.bing.com/search?q=test' },
  { name: 'utm_* + fbclid stripped',
    input: 'https://www.bing.com/search?q=test&utm_source=share&fbclid=IwAR1',
    expected: 'https://www.bing.com/search?q=test' },
  { name: 'bare host works',
    input: 'https://bing.com/search?q=x&form=QBLH',
    expected: 'https://bing.com/search?q=x' },
  { name: 'cn subdomain works',
    input: 'https://cn.bing.com/search?q=x&form=QBLH',
    expected: 'https://cn.bing.com/search?q=x' },

  // Hash preservation
  { name: 'hash preserved',
    input: 'https://www.bing.com/search?q=test&form=QBLH#anchor',
    expected: 'https://www.bing.com/search?q=test#anchor' },

  // Out of scope
  { name: 'no q -> null',
    input: 'https://www.bing.com/search?form=QBLH',
    expected: null },
  { name: 'homepage -> null',
    input: 'https://www.bing.com/',
    expected: null },
  { name: 'maps -> null',
    input: 'https://www.bing.com/maps?q=paris',
    expected: null },
  { name: 'shopping -> null',
    input: 'https://www.bing.com/shop?q=shoes&form=SHOPTB',
    expected: null },
  { name: 'lookalike -> null',
    input: 'https://notbing.com/search?q=x&form=QBLH',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenBingUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isBingHost: www.bing.com', isBingHost('www.bing.com'), true);
check('isBingHost: bing.com', isBingHost('bing.com'), true);
check('isBingHost: cn.bing.com', isBingHost('cn.bing.com'), true);
check('isBingHost: notbing.com', isBingHost('notbing.com'), false);
check('isBingHost: bing.com.evil.com', isBingHost('bing.com.evil.com'), false);
check('isPostUrl: search with q', isPostUrl('https://www.bing.com/search?q=x'), true);
check('isPostUrl: homepage', isPostUrl('https://www.bing.com/'), false);
check('shorten on garbage', shortenBingUrl('not a url'), null);
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
