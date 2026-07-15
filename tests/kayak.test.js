const path = require('path');
const {
  shortenKayakUrl,
  needsShortening,
  isKayakHost,
  isPostUrl,
} = require(path.join('..', 'src', 'kayak.js'));

const CASES = [
  // Canonical — itinerary lives in the path
  { name: 'flight search already clean',
    input: 'https://www.kayak.com/flights/SFO-JFK/2026-08-01/2026-08-05',
    expected: 'https://www.kayak.com/flights/SFO-JFK/2026-08-01/2026-08-05',
    expectedNeeds: false },

  // FUNCTIONAL params must survive (the verified correction)
  { name: 'sort= survives (user-chosen sort order)',
    input: 'https://www.kayak.com/flights/SFO-JFK/2026-08-01/2026-08-05?sort=bestflight_a',
    expected: 'https://www.kayak.com/flights/SFO-JFK/2026-08-01/2026-08-05?sort=bestflight_a',
    expectedNeeds: false },
  { name: 'fs= filter survives (nonstop only)',
    input: 'https://www.kayak.com/flights/ZRH-MXP/2026-09-06/2026-09-09?sort=bestflight_a&fs=stops%3D0',
    expected: 'https://www.kayak.com/flights/ZRH-MXP/2026-09-06/2026-09-09?sort=bestflight_a&fs=stops%3D0',
    expectedNeeds: false },

  // Junk strip
  { name: 'ucs session token stripped',
    input: 'https://www.kayak.com/flights/SFO-JFK/2026-08-01?ucs=1abcd2ef&sort=price_a',
    expected: 'https://www.kayak.com/flights/SFO-JFK/2026-08-01?sort=price_a' },
  { name: 'ad-click ids stripped',
    input: 'https://www.kayak.com/flights/LAX-NRT/2026-10-10?gclid=abc&fbclid=def&msclkid=ghi',
    expected: 'https://www.kayak.com/flights/LAX-NRT/2026-10-10' },
  { name: 'utm_* stripped, hotels path too',
    input: 'https://www.kayak.com/hotels/Tokyo/2026-10-10/2026-10-14?utm_source=email&utm_campaign=deals',
    expected: 'https://www.kayak.com/hotels/Tokyo/2026-10-10/2026-10-14' },

  // ccTLD + hash
  { name: 'ccTLD host works, hash preserved',
    input: 'https://www.kayak.co.uk/flights/LHR-JFK/2026-08-01?ucs=zz#results',
    expected: 'https://www.kayak.co.uk/flights/LHR-JFK/2026-08-01#results' },

  // Non-Kayak
  { name: 'lookalike -> null',
    input: 'https://notkayak.com/flights/SFO-JFK?ucs=a',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenKayakUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isKayakHost: kayak.com', isKayakHost('kayak.com'), true);
check('isKayakHost: www.kayak.com', isKayakHost('www.kayak.com'), true);
check('isKayakHost: kayak.com.au', isKayakHost('www.kayak.com.au'), true);
check('isKayakHost: lookalike', isKayakHost('mykayak.net'), false);
check('isPostUrl: has junk', isPostUrl('https://www.kayak.com/flights/A-B/2026-01-01?ucs=a'), true);
check('isPostUrl: functional only', isPostUrl('https://www.kayak.com/flights/A-B/2026-01-01?sort=price_a'), false);
check('shorten on garbage', shortenKayakUrl('not a url'), null);
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
