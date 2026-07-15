const path = require('path');
const {
  shortenSkyscannerUrl,
  needsShortening,
  isSkyscannerHost,
  isPostUrl,
} = require(path.join('..', 'src', 'skyscanner.js'));

const CASES = [
  // Canonical — itinerary in the path
  { name: 'flight search already clean',
    input: 'https://www.skyscanner.net/transport/flights/sfo/jfk/260801/',
    expected: 'https://www.skyscanner.net/transport/flights/sfo/jfk/260801/',
    expectedNeeds: false },

  // FUNCTIONAL params survive (from Skyscanner's own deeplink docs)
  { name: 'passenger/cabin/rtn params survive',
    input: 'https://www.skyscanner.net/transport/flights/sfo/jfk/260801/?adultsv2=2&childrenv2=5%7C8&cabinclass=economy&rtn=0&preferdirects=true',
    expected: 'https://www.skyscanner.net/transport/flights/sfo/jfk/260801/?adultsv2=2&childrenv2=5%7C8&cabinclass=economy&rtn=0&preferdirects=true',
    expectedNeeds: false },
  { name: 'config deeplink keeps market/locale/currency',
    input: 'https://www.skyscanner.net/transport/flights/sfo/jfk/260801/config/16177-2608010745?market=US&locale=en-US&currency=USD',
    expected: 'https://www.skyscanner.net/transport/flights/sfo/jfk/260801/config/16177-2608010745?market=US&locale=en-US&currency=USD',
    expectedNeeds: false },

  // Junk strip
  { name: 'ref= referral stripped, functional kept',
    input: 'https://www.skyscanner.net/transport/flights/sfo/jfk/260801/?adultsv2=1&ref=home',
    expected: 'https://www.skyscanner.net/transport/flights/sfo/jfk/260801/?adultsv2=1' },
  { name: 'previousCultureSource + redirectedFrom stripped',
    input: 'https://www.skyscanner.com/transport/flights/lhr/bcn/261015/?previousCultureSource=GEO_LOCATION&redirectedFrom=www.skyscanner.net',
    expected: 'https://www.skyscanner.com/transport/flights/lhr/bcn/261015/' },
  { name: 'associateid + ad-click ids stripped',
    input: 'https://www.skyscanner.de/transport/fluge/fran/nyca/?associateid=SEM_FLI_00065&gclid=abc&utm_medium=cpc',
    expected: 'https://www.skyscanner.de/transport/fluge/fran/nyca/' },

  // Hash
  { name: 'hash preserved',
    input: 'https://www.skyscanner.net/transport/flights/sfo/jfk/260801/?ref=home#day-view',
    expected: 'https://www.skyscanner.net/transport/flights/sfo/jfk/260801/#day-view' },

  // Non-Skyscanner
  { name: 'lookalike -> null',
    input: 'https://skyscannerdeals.example.com/flights?ref=home',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenSkyscannerUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isSkyscannerHost: skyscanner.net', isSkyscannerHost('www.skyscanner.net'), true);
check('isSkyscannerHost: skyscanner.co.in', isSkyscannerHost('www.skyscanner.co.in'), true);
check('isSkyscannerHost: skyscanner.jp', isSkyscannerHost('www.skyscanner.jp'), true);
check('isSkyscannerHost: lookalike', isSkyscannerHost('skyscanner.example.com'), false);
check('isPostUrl: has junk', isPostUrl('https://www.skyscanner.net/transport/flights/a/b/?ref=x'), true);
check('isPostUrl: functional only', isPostUrl('https://www.skyscanner.net/transport/flights/a/b/?adultsv2=1'), false);
check('shorten on garbage', shortenSkyscannerUrl('not a url'), null);
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
