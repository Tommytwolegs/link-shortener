const path = require('path');
const {
  shortenTargetUrl,
  needsShortening,
  isTargetHost,
  isPostUrl,
} = require(path.join('..', 'src', 'target.js'));

const CASES = [
  // Canonical
  { name: 'product with slug + tcin already clean',
    input: 'https://www.target.com/p/some-product/-/A-89898989',
    expected: 'https://www.target.com/p/some-product/-/A-89898989',
    expectedNeeds: false },
  { name: 'product without slug already clean',
    input: 'https://www.target.com/p/-/A-89898989',
    expected: 'https://www.target.com/p/-/A-89898989',
    expectedNeeds: false },
  { name: 'trailing slash preserved',
    input: 'https://www.target.com/p/some-product/-/A-89898989/',
    expected: 'https://www.target.com/p/some-product/-/A-89898989/',
    expectedNeeds: false },

  // Variant selector preserved — preselect carries the child TCIN of the
  // size/color the user picked (Target's analog of Amazon's th/psc).
  { name: 'preselect (variant selector) preserved',
    input: 'https://www.target.com/p/foo/-/A-12345678?preselect=99999999',
    expected: 'https://www.target.com/p/foo/-/A-12345678?preselect=99999999',
    expectedNeeds: false },

  // Tracking strip
  { name: 'lnk + clkid + ref stripped',
    input: 'https://www.target.com/p/foo/-/A-12345678?lnk=item&clkid=abc&ref=carousel',
    expected: 'https://www.target.com/p/foo/-/A-12345678' },
  { name: 'linkId (case-insensitive) stripped',
    input: 'https://www.target.com/p/foo/-/A-12345678?linkId=abc-def',
    expected: 'https://www.target.com/p/foo/-/A-12345678' },
  { name: 'searchTerm stripped',
    input: 'https://www.target.com/p/foo/-/A-12345678?searchTerm=cool+mug',
    expected: 'https://www.target.com/p/foo/-/A-12345678' },
  { name: 'afid + cpng + ci_src + ci_sku stripped',
    input: 'https://www.target.com/p/foo/-/A-12345678?afid=abc&cpng=spring&ci_src=email&ci_sku=A-12345678',
    expected: 'https://www.target.com/p/foo/-/A-12345678' },

  // Hash preservation
  { name: 'hash preserved alongside tracking strip',
    input: 'https://www.target.com/p/foo/-/A-12345678?clkid=abc#reviews',
    expected: 'https://www.target.com/p/foo/-/A-12345678#reviews' },
  { name: 'hash preserved when no tracking present',
    input: 'https://www.target.com/p/foo/-/A-12345678#specs',
    expected: 'https://www.target.com/p/foo/-/A-12345678#specs',
    expectedNeeds: false },

  // Functional params preserved
  { name: 'unknown query params left alone',
    input: 'https://www.target.com/p/foo/-/A-12345678?storeId=2999',
    expected: 'https://www.target.com/p/foo/-/A-12345678?storeId=2999',
    expectedNeeds: false },
  { name: 'mixed: tracking stripped, preselect + functional preserved',
    input: 'https://www.target.com/p/foo/-/A-12345678?preselect=999&clkid=abc&storeId=2999',
    expected: 'https://www.target.com/p/foo/-/A-12345678?preselect=999&storeId=2999' },

  // Not a product
  { name: 'category page → null',
    input: 'https://www.target.com/c/electronics/-/N-12345',
    expected: null },
  { name: '/+/ collection page → null',
    input: 'https://www.target.com/+/some-collection',
    expected: null },
  { name: 'home page → null',
    input: 'https://www.target.com/',
    expected: null },
  { name: 'search page → null',
    input: 'https://www.target.com/s?searchTerm=foo',
    expected: null },

  // Non-Target
  { name: 'non-Target → null',
    input: 'https://www.amazon.com/p/foo/-/A-12345678',
    expected: null },
  { name: 'fake host → null',
    input: 'https://target-clone.com/p/foo/-/A-12345678',
    expected: null },
  { name: 'malformed tcin (no digits) → null',
    input: 'https://www.target.com/p/foo/-/A-notanumber',
    expected: null },
  { name: 'malformed tcin (missing A-) → null',
    input: 'https://www.target.com/p/foo/-/12345678',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenTargetUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isTargetHost: target.com', isTargetHost('target.com'), true);
check('isTargetHost: www.target.com', isTargetHost('www.target.com'), true);
check('isTargetHost: target.ca', isTargetHost('target.ca'), false);
check('isTargetHost: target-clone.com', isTargetHost('target-clone.com'), false);
check('isPostUrl: /p/.../-/A-...', isPostUrl('https://www.target.com/p/foo/-/A-12345678'), true);
check('isPostUrl: /c/', isPostUrl('https://www.target.com/c/electronics/-/N-1'), false);
check('shorten on garbage', shortenTargetUrl('not a url'), null);
check('needs on garbage', needsShortening('not a url'), false);

// Mutation guard: URL-object inputs must not be modified in place.
const probe = new URL('https://www.target.com/p/foo/-/A-12345678?clkid=abc');
check('shorten on URL object', shortenTargetUrl(probe), 'https://www.target.com/p/foo/-/A-12345678');
check('URL-object input not mutated', probe.href, 'https://www.target.com/p/foo/-/A-12345678?clkid=abc');
check('needs on URL object', needsShortening(new URL('https://www.target.com/p/foo/-/A-12345678?clkid=abc')), true);

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
