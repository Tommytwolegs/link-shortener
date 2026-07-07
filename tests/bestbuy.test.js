const path = require('path');
const {
  shortenBestbuyUrl,
  needsShortening,
  isBestbuyHost,
  isPostUrl,
} = require(path.join('..', 'src', 'bestbuy.js'));

const VALID_HOST = 'www.bestbuy.com';

const CASES = [
  { name: 'product already clean',
    input: 'https://www.bestbuy.com/site/apple-airpods-pro-2/6447382.p',
    expected: 'https://www.bestbuy.com/site/apple-airpods-pro-2/6447382.p',
    expectedNeeds: false },
  { name: 'skuId + ref + loc stripped',
    input: 'https://www.bestbuy.com/site/apple-airpods-pro-2/6447382.p?skuId=6447382&ref=212&loc=1&extStoreId=123&irclickid=abc',
    expected: 'https://www.bestbuy.com/site/apple-airpods-pro-2/6447382.p' },
  { name: 'intl=nosplash PRESERVED',
    input: 'https://www.bestbuy.com/site/x/123.p?intl=nosplash&ref=212',
    expected: 'https://www.bestbuy.com/site/x/123.p?intl=nosplash' },
  { name: 'canada cleaned',
    input: 'https://www.bestbuy.ca/site/y/999.p?icmp=abc',
    expected: 'https://www.bestbuy.ca/site/y/999.p' },
  { name: 'hash preserved',
    input: 'https://www.bestbuy.com/site/x/1.p?ref=a#specs',
    expected: 'https://www.bestbuy.com/site/x/1.p#specs' },
  { name: 'search → null',
    input: 'https://www.bestbuy.com/site/searchpage.jsp?st=airpods',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://notbestbuy.com/site/x/1.p',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenBestbuyUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('host: valid', isBestbuyHost(VALID_HOST), true);
check('host: lookalike suffix', isBestbuyHost(VALID_HOST + '.evil.com'), false);
check('shorten on garbage', shortenBestbuyUrl('not a url'), null);
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
