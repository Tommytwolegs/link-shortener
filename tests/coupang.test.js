const path = require('path');
const {
  shortenCoupangUrl,
  needsShortening,
  isCoupangHost,
  isPostUrl,
} = require(path.join('..', 'src', 'coupang.js'));

const CASES = [

  { name: 'product already clean',
    input: 'https://www.coupang.com/vp/products/7335596976',
    expected: 'https://www.coupang.com/vp/products/7335596976',
    expectedNeeds: false },
  { name: 'itemId + vendorItemId PRESERVED, search junk stripped',
    input: 'https://www.coupang.com/vp/products/7335596976?itemId=18841862295&vendorItemId=85977221928&q=%EB%A7%88%EC%9A%B0%EC%8A%A4&searchId=abc123&sourceType=search&itemsCount=36&rank=2',
    expected: 'https://www.coupang.com/vp/products/7335596976?itemId=18841862295&vendorItemId=85977221928' },
  { name: 'src + spec + tag junk stripped',
    input: 'https://www.coupang.com/vp/products/123?src=1042503&spec=10304991&addtag=400&ctag=123&lptag=AF123&traceid=xyz',
    expected: 'https://www.coupang.com/vp/products/123' },
  { name: 'itemId alone preserved',
    input: 'https://www.coupang.com/vp/products/123?itemId=456&isAddedCart=true',
    expected: 'https://www.coupang.com/vp/products/123?itemId=456' },
  { name: 'hash preserved',
    input: 'https://www.coupang.com/vp/products/123?rank=1#sdpReview',
    expected: 'https://www.coupang.com/vp/products/123#sdpReview' },
  { name: 'search page → null',
    input: 'https://www.coupang.com/np/search?q=mouse',
    expected: null },
  { name: 'category → null',
    input: 'https://www.coupang.com/np/categories/186764',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://notcoupang.com/vp/products/1',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenCoupangUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isCoupangHost: coupang.com', isCoupangHost('coupang.com'), true);
check('isCoupangHost: www.coupang.com', isCoupangHost('www.coupang.com'), true);
check('isCoupangHost: notcoupang.com', isCoupangHost('notcoupang.com'), false);
check('isPostUrl: product', isPostUrl('https://coupang.com/vp/products/1'), true);
check('isPostUrl: search', isPostUrl('https://coupang.com/np/search?q=x'), false);
check('shorten on garbage', shortenCoupangUrl('not a url'), null);
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
