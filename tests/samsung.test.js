const path = require('path');
const {
  shortenSamsungUrl,
  needsShortening,
  isSamsungHost,
  isPostUrl,
} = require(path.join('..', 'src', 'samsung.js'));

const CASES = [
  // Canonical
  { name: 'product page already clean',
    input: 'https://www.samsung.com/us/smartphones/galaxy-s25-ultra/',
    expected: 'https://www.samsung.com/us/smartphones/galaxy-s25-ultra/',
    expectedNeeds: false },

  // Tracking strip
  { name: 'cid campaign id stripped',
    input: 'https://www.samsung.com/us/smartphones/galaxy-s25-ultra/?cid=us_pd_ppc_google_galaxy-s25',
    expected: 'https://www.samsung.com/us/smartphones/galaxy-s25-ultra/' },
  { name: 'click ids stripped (dclid/msclkid/gclid/fbclid)',
    input: 'https://www.samsung.com/us/televisions-home-theater/tvs/?dclid=abc&msclkid=def&gclid=ghi&fbclid=jkl',
    expected: 'https://www.samsung.com/us/televisions-home-theater/tvs/' },
  { name: 'ppc + utm_* stripped',
    input: 'https://www.samsung.com/uk/offer/?ppc=brand&utm_source=google&utm_campaign=uk_brand',
    expected: 'https://www.samsung.com/uk/offer/' },

  // Functional params survive the denylist
  { name: 'modelCode survives on buy page',
    input: 'https://www.samsung.com/us/smartphones/galaxy-s25-ultra/buy/?modelCode=SM-S938UZKAXAA&cid=us_pd_ppc',
    expected: 'https://www.samsung.com/us/smartphones/galaxy-s25-ultra/buy/?modelCode=SM-S938UZKAXAA' },
  { name: 'regional subdomain works',
    input: 'https://shop.samsung.com/in/galaxy-book?cid=in_ppc_google',
    expected: 'https://shop.samsung.com/in/galaxy-book' },

  // Hash preservation
  { name: 'hash preserved',
    input: 'https://www.samsung.com/us/smartphones/galaxy-s25-ultra/?cid=abc#specs',
    expected: 'https://www.samsung.com/us/smartphones/galaxy-s25-ultra/#specs' },

  // Non-Samsung
  { name: 'lookalike -> null',
    input: 'https://notsamsung.com/us/phone?cid=abc',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenSamsungUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isSamsungHost: samsung.com', isSamsungHost('samsung.com'), true);
check('isSamsungHost: www.samsung.com', isSamsungHost('www.samsung.com'), true);
check('isSamsungHost: shop.samsung.com', isSamsungHost('shop.samsung.com'), true);
check('isSamsungHost: lookalike', isSamsungHost('notsamsung.com'), false);
check('isPostUrl: has junk', isPostUrl('https://www.samsung.com/us/x?cid=a'), true);
check('isPostUrl: clean', isPostUrl('https://www.samsung.com/us/x'), false);
check('shorten on garbage', shortenSamsungUrl('not a url'), null);
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
