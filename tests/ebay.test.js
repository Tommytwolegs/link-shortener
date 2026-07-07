const path = require('path');
const {
  shortenEbayUrl,
  needsShortening,
  isEbayHost,
  isPostUrl,
} = require(path.join('..', 'src', 'ebay.js'));

const CASES = [
  { name: 'search: _nkw survives, _trkparms dies (fallback)',
    input: 'https://www.ebay.com/sch/i.html?_nkw=camera&_trksid=p2334524.m570&_trkparms=abc',
    expected: 'https://www.ebay.com/sch/i.html?_nkw=camera' },
  // Bare canonical form
  { name: 'bare /itm/<id> already clean',
    input: 'https://www.ebay.com/itm/123456789012',
    expected: 'https://www.ebay.com/itm/123456789012',
    expectedNeeds: false },
  { name: 'bare /itm/<id> with trailing slash',
    input: 'https://www.ebay.com/itm/123456789012/',
    expected: 'https://www.ebay.com/itm/123456789012' },
  // Title-slug form folds to bare
  { name: 'slug+id form folds to bare',
    input: 'https://www.ebay.com/itm/Some-Product-Title/123456789012',
    expected: 'https://www.ebay.com/itm/123456789012' },
  { name: 'slug+id with full tracking',
    input: 'https://www.ebay.com/itm/Cool-Widget/123456789012?_trkparms=foo&epid=abc&hash=item123&mkcid=1&mkevt=1&siteid=0&campid=999&customid=xyz',
    expected: 'https://www.ebay.com/itm/123456789012' },
  // var preservation
  { name: 'var preserved (variation selector)',
    input: 'https://www.ebay.com/itm/Cool-Shirt/123456789012?var=654321&_trkparms=foo',
    expected: 'https://www.ebay.com/itm/123456789012?var=654321' },
  { name: 'var=0 (no variation) is dropped',
    input: 'https://www.ebay.com/itm/Cool-Shirt/123456789012?var=0&_trkparms=foo',
    expected: 'https://www.ebay.com/itm/123456789012' },
  { name: 'empty var is dropped',
    input: 'https://www.ebay.com/itm/Cool-Shirt/123456789012?var=&_trkparms=foo',
    expected: 'https://www.ebay.com/itm/123456789012' },
  // Case-insensitive var matching (defensive — eBay uses lowercase today
  // but this guarantees we never silently lose a variation if they ever
  // change capitalization)
  { name: 'UPPERCASE VAR preserved + lowercased',
    input: 'https://www.ebay.com/itm/Cool-Shirt/123456789012?VAR=654321&_trkparms=foo',
    expected: 'https://www.ebay.com/itm/123456789012?var=654321' },
  { name: 'MixedCase Var preserved + lowercased',
    input: 'https://www.ebay.com/itm/Cool-Shirt/123456789012?Var=654321',
    expected: 'https://www.ebay.com/itm/123456789012?var=654321' },
  { name: 'UPPERCASE VAR=0 is dropped',
    input: 'https://www.ebay.com/itm/Cool-Shirt/123456789012?VAR=0',
    expected: 'https://www.ebay.com/itm/123456789012' },
  // Hash preservation
  { name: 'hash preserved',
    input: 'https://www.ebay.com/itm/Cool/123456789012?_trkparms=foo#shipping',
    expected: 'https://www.ebay.com/itm/123456789012#shipping' },
  { name: 'hash preserved alongside var',
    input: 'https://www.ebay.com/itm/Cool/123456789012?var=654321#shipping',
    expected: 'https://www.ebay.com/itm/123456789012?var=654321#shipping' },
  // Regional TLDs
  { name: 'UK: ebay.co.uk preserved',
    input: 'https://www.ebay.co.uk/itm/Cool-Thing/123456789012?_trkparms=foo',
    expected: 'https://www.ebay.co.uk/itm/123456789012' },
  { name: 'DE: ebay.de preserved',
    input: 'https://www.ebay.de/itm/Cool-Thing/123456789012?_trkparms=foo',
    expected: 'https://www.ebay.de/itm/123456789012' },
  { name: 'AU: ebay.com.au preserved',
    input: 'https://www.ebay.com.au/itm/Cool-Thing/123456789012',
    expected: 'https://www.ebay.com.au/itm/123456789012' },
  { name: 'IT: ebay.it preserved',
    input: 'https://www.ebay.it/itm/Cool-Thing/123456789012',
    expected: 'https://www.ebay.it/itm/123456789012' },
  // New market: Taiwan
  { name: 'TW: ebay.com.tw preserved',
    input: 'https://www.ebay.com.tw/itm/Cool-Thing/123456789012?_trkparms=foo',
    expected: 'https://www.ebay.com.tw/itm/123456789012' },
  // Non-item pages
  { name: 'search page → null',
    input: 'https://www.ebay.com/sch/i.html?_nkw=widget',
    expected: 'https://www.ebay.com/sch/i.html?_nkw=widget',
    expectedNeeds: false },
  { name: 'category → null',
    input: 'https://www.ebay.com/b/Electronics/123/bn_456',
    expected: 'https://www.ebay.com/b/Electronics/123/bn_456',
    expectedNeeds: false },
  { name: 'seller page → null',
    input: 'https://www.ebay.com/usr/somebody',
    expected: 'https://www.ebay.com/usr/somebody',
    expectedNeeds: false },
  { name: 'home → null',
    input: 'https://www.ebay.com/',
    expected: 'https://www.ebay.com/',
    expectedNeeds: false },
  // Non-eBay
  { name: 'non-eBay → null',
    input: 'https://www.google.com/itm/Cool/123456789012',
    expected: null },
  // Non-numeric id falls through
  { name: 'non-numeric id → null',
    input: 'https://www.ebay.com/itm/Cool-Thing/notanumber',
    expected: 'https://www.ebay.com/itm/Cool-Thing/notanumber',
    expectedNeeds: false },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenEbayUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isEbayHost: ebay.com', isEbayHost('ebay.com'), true);
check('isEbayHost: www.ebay.com', isEbayHost('www.ebay.com'), true);
check('isEbayHost: ebay.co.uk', isEbayHost('ebay.co.uk'), true);
check('isEbayHost: ebay.de', isEbayHost('ebay.de'), true);
check('isEbayHost: ebay.com.tw', isEbayHost('ebay.com.tw'), true);
check('isEbayHost: ebay-fake.com', isEbayHost('ebay-fake.com'), false);
check('isPostUrl: /itm/', isPostUrl('https://www.ebay.com/itm/123456789012'), true);
check('isPostUrl: search', isPostUrl('https://www.ebay.com/sch/i.html'), false);
check('shorten on garbage', shortenEbayUrl('not a url'), null);
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
