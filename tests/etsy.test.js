const path = require('path');
const {
  shortenEtsyUrl,
  needsShortening,
  isEtsyHost,
  isPostUrl,
} = require(path.join('..', 'src', 'etsy.js'));

const CASES = [
  { name: 'search: q survives, ref dies (fallback)',
    input: 'https://www.etsy.com/search?q=mug&ref=pagination&page=2',
    expected: 'https://www.etsy.com/search?q=mug&page=2' },
  // Canonical
  { name: 'listing with slug already clean',
    input: 'https://www.etsy.com/listing/1234567890/some-handmade-thing',
    expected: 'https://www.etsy.com/listing/1234567890/some-handmade-thing',
    expectedNeeds: false },
  { name: 'listing with slug + tracking',
    input: 'https://www.etsy.com/listing/1234567890/some-handmade-thing?ref=hp_recent_listings&pro=1&frs=1',
    expected: 'https://www.etsy.com/listing/1234567890/some-handmade-thing' },
  { name: 'listing with epik + plkrid tracking',
    input: 'https://www.etsy.com/listing/1234567890/cool-mug?epik=ABC&plkrid=XYZ&click_key=k1',
    expected: 'https://www.etsy.com/listing/1234567890/cool-mug' },
  { name: 'listing without slug',
    input: 'https://www.etsy.com/listing/1234567890?ref=hp_recent_listings',
    expected: 'https://www.etsy.com/listing/1234567890' },
  { name: 'listing trailing slash preserved',
    input: 'https://www.etsy.com/listing/1234567890/cool-mug/?ref=foo',
    expected: 'https://www.etsy.com/listing/1234567890/cool-mug/' },

  // Hash preservation
  { name: 'hash preserved alongside tracking strip',
    input: 'https://www.etsy.com/listing/1234567890/cool-mug?ref=foo#reviews',
    expected: 'https://www.etsy.com/listing/1234567890/cool-mug#reviews' },

  // Locale prefix
  { name: 'locale prefix /de/ preserved',
    input: 'https://www.etsy.com/de/listing/1234567890/cool-mug?ref=hp',
    expected: 'https://www.etsy.com/de/listing/1234567890/cool-mug' },
  { name: 'locale prefix /de-en/ preserved',
    input: 'https://www.etsy.com/de-en/listing/1234567890/cool-mug?ref=hp',
    expected: 'https://www.etsy.com/de-en/listing/1234567890/cool-mug' },

  // Regional TLDs
  { name: 'UK: etsy.co.uk',
    input: 'https://www.etsy.co.uk/listing/1234567890/cool-mug?ref=foo',
    expected: 'https://www.etsy.co.uk/listing/1234567890/cool-mug' },
  { name: 'DE: etsy.de',
    input: 'https://www.etsy.de/listing/1234567890/cool-mug?ref=foo',
    expected: 'https://www.etsy.de/listing/1234567890/cool-mug' },
  { name: 'CA: etsy.ca',
    input: 'https://www.etsy.ca/listing/1234567890/cool-mug',
    expected: 'https://www.etsy.ca/listing/1234567890/cool-mug',
    expectedNeeds: false },

  // Non-listing pages
  { name: 'shop page → null',
    input: 'https://www.etsy.com/shop/somebody',
    expected: 'https://www.etsy.com/shop/somebody',
    expectedNeeds: false },
  { name: 'search → null',
    input: 'https://www.etsy.com/search?q=mug',
    expected: 'https://www.etsy.com/search?q=mug',
    expectedNeeds: false },
  { name: 'home → null',
    input: 'https://www.etsy.com/',
    expected: 'https://www.etsy.com/',
    expectedNeeds: false },
  { name: 'category → null',
    input: 'https://www.etsy.com/c/home-and-living',
    expected: 'https://www.etsy.com/c/home-and-living',
    expectedNeeds: false },

  // Non-Etsy
  { name: 'non-Etsy → null',
    input: 'https://www.google.com/listing/1234567890/cool-mug',
    expected: null },
  { name: 'fake host → null',
    input: 'https://etsy-clone.com/listing/1234567890/cool-mug',
    expected: null },
  { name: 'non-numeric id → null',
    input: 'https://www.etsy.com/listing/notanumber/cool-mug',
    expected: 'https://www.etsy.com/listing/notanumber/cool-mug',
    expectedNeeds: false },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenEtsyUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isEtsyHost: etsy.com', isEtsyHost('etsy.com'), true);
check('isEtsyHost: www.etsy.com', isEtsyHost('www.etsy.com'), true);
check('isEtsyHost: etsy.de', isEtsyHost('etsy.de'), true);
check('isEtsyHost: etsy-clone.com', isEtsyHost('etsy-clone.com'), false);
check('isPostUrl: /listing/', isPostUrl('https://www.etsy.com/listing/123/x'), true);
check('isPostUrl: /shop/', isPostUrl('https://www.etsy.com/shop/foo'), false);
check('shorten on garbage', shortenEtsyUrl('not a url'), null);
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
