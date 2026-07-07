const path = require('path');
const {
  shortenWalmartUrl,
  needsShortening,
  isWalmartHost,
  isPostUrl,
} = require(path.join('..', 'src', 'walmart.js'));

const CASES = [
  { name: 'search: q survives, athcpid dies (fallback)',
    input: 'https://www.walmart.com/search?q=mug&athcpid=abc123',
    expected: 'https://www.walmart.com/search?q=mug' },
  // Canonical
  { name: 'product with slug + id already clean',
    input: 'https://www.walmart.com/ip/Some-Product/123456789',
    expected: 'https://www.walmart.com/ip/Some-Product/123456789',
    expectedNeeds: false },
  { name: 'product without slug already clean',
    input: 'https://www.walmart.com/ip/123456789',
    expected: 'https://www.walmart.com/ip/123456789',
    expectedNeeds: false },
  { name: 'trailing slash preserved',
    input: 'https://www.walmart.com/ip/Some-Product/123456789/',
    expected: 'https://www.walmart.com/ip/Some-Product/123456789/',
    expectedNeeds: false },

  // Tracking strip
  { name: 'athcpid/athpgid/athcgid stripped',
    input: 'https://www.walmart.com/ip/Some-Product/123456789?athcpid=abc&athpgid=def&athcgid=ghi',
    expected: 'https://www.walmart.com/ip/Some-Product/123456789' },
  { name: 'from + wmlspartner stripped',
    input: 'https://www.walmart.com/ip/Cool-Mug/987654321?from=email&wmlspartner=partner123',
    expected: 'https://www.walmart.com/ip/Cool-Mug/987654321' },
  { name: 'selectedSellerId stripped (case-insensitive)',
    input: 'https://www.walmart.com/ip/Cool-Mug/987654321?selectedSellerId=12345',
    expected: 'https://www.walmart.com/ip/Cool-Mug/987654321' },
  { name: 'sourceid + sid + oid + veh stripped',
    input: 'https://www.walmart.com/ip/Foo/123456?sourceid=abc&sid=def&oid=ghi&veh=jkl',
    expected: 'https://www.walmart.com/ip/Foo/123456' },
  { name: 'multiple ath* params stripped together',
    input: 'https://www.walmart.com/ip/Foo/123456?athbdg=1&athstid=CS020&athsdetail=detail&athasid=asid&athancid=ancid',
    expected: 'https://www.walmart.com/ip/Foo/123456' },

  // Hash preservation
  { name: 'hash preserved alongside tracking strip',
    input: 'https://www.walmart.com/ip/Foo/123456?athcpid=abc#reviews',
    expected: 'https://www.walmart.com/ip/Foo/123456#reviews' },
  { name: 'hash preserved when no tracking present',
    input: 'https://www.walmart.com/ip/Foo/123456#specs',
    expected: 'https://www.walmart.com/ip/Foo/123456#specs',
    expectedNeeds: false },

  // Functional params preserved (universal strip handles utm_/gclid)
  { name: 'unknown query params left alone',
    input: 'https://www.walmart.com/ip/Foo/123456?variant=red&size=L',
    expected: 'https://www.walmart.com/ip/Foo/123456?variant=red&size=L',
    expectedNeeds: false },
  { name: 'mixed: tracking stripped, functional preserved',
    input: 'https://www.walmart.com/ip/Foo/123456?athcpid=abc&variant=red',
    expected: 'https://www.walmart.com/ip/Foo/123456?variant=red' },

  // Regional
  { name: 'walmart.ca works',
    input: 'https://www.walmart.ca/ip/Cool-Mug/123456?athcpid=abc',
    expected: 'https://www.walmart.ca/ip/Cool-Mug/123456' },

  // Not a product
  { name: 'category page → null',
    input: 'https://www.walmart.com/browse/electronics/12345',
    expected: 'https://www.walmart.com/browse/electronics/12345',
    expectedNeeds: false },
  { name: 'search page → null',
    input: 'https://www.walmart.com/search?q=foo',
    expected: 'https://www.walmart.com/search?q=foo',
    expectedNeeds: false },
  { name: 'seller page → null',
    input: 'https://www.walmart.com/seller/12345',
    expected: 'https://www.walmart.com/seller/12345',
    expectedNeeds: false },
  { name: 'home page → null',
    input: 'https://www.walmart.com/',
    expected: 'https://www.walmart.com/',
    expectedNeeds: false },

  // Non-Walmart
  { name: 'non-Walmart → null',
    input: 'https://www.amazon.com/ip/Cool-Mug/123456',
    expected: null },
  { name: 'fake host → null',
    input: 'https://walmart-clone.com/ip/Cool-Mug/123456',
    expected: null },
  { name: 'non-numeric id → null',
    input: 'https://www.walmart.com/ip/Cool-Mug/notanumber',
    expected: 'https://www.walmart.com/ip/Cool-Mug/notanumber',
    expectedNeeds: false },
  { name: 'too-short id (< 4 digits) → null',
    input: 'https://www.walmart.com/ip/Cool-Mug/123',
    expected: 'https://www.walmart.com/ip/Cool-Mug/123',
    expectedNeeds: false },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenWalmartUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isWalmartHost: walmart.com', isWalmartHost('walmart.com'), true);
check('isWalmartHost: www.walmart.com', isWalmartHost('www.walmart.com'), true);
check('isWalmartHost: walmart.ca', isWalmartHost('walmart.ca'), true);
check('isWalmartHost: walmart-clone.com', isWalmartHost('walmart-clone.com'), false);
check('isPostUrl: /ip/', isPostUrl('https://www.walmart.com/ip/foo/123456'), true);
check('isPostUrl: /browse/', isPostUrl('https://www.walmart.com/browse/x/12345'), false);
check('shorten on garbage', shortenWalmartUrl('not a url'), null);
check('needs on garbage', needsShortening('not a url'), false);

// Mutation guard: URL-object inputs must not be modified in place.
const probe = new URL('https://www.walmart.com/ip/Foo/123456?athcpid=abc');
check('shorten on URL object', shortenWalmartUrl(probe), 'https://www.walmart.com/ip/Foo/123456');
check('URL-object input not mutated', probe.href, 'https://www.walmart.com/ip/Foo/123456?athcpid=abc');
check('needs on URL object', needsShortening(new URL('https://www.walmart.com/ip/Foo/123456?athcpid=abc')), true);

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
