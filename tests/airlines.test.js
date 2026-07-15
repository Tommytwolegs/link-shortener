const path = require('path');
const {
  shortenAirlineUrl,
  needsShortening,
  isAirlineHost,
  isPostUrl,
  AIRLINES,
} = require(path.join('..', 'src', 'airlines.js'));

const CASES = [
  // Canonical
  { name: 'delta page already clean',
    input: 'https://www.delta.com/us/en/flight-deals/featured-flight-deals',
    expected: 'https://www.delta.com/us/en/flight-deals/featured-flight-deals',
    expectedNeeds: false },

  // Universal junk on every carrier
  { name: 'delta email campaign junk stripped (cmp/mkcpgn/utm)',
    input: 'https://www.delta.com/us/en/flight-deals?cmp=email_promo_2026&mkcpgn=EM_JULY&utm_source=email',
    expected: 'https://www.delta.com/us/en/flight-deals' },
  { name: 'united WT.mc_id stripped',
    input: 'https://www.united.com/en/us/fly/travel-deals.html?WT.mc_id=EM123456&gclid=abc',
    expected: 'https://www.united.com/en/us/fly/travel-deals.html' },
  { name: 'aa ad-click ids stripped',
    input: 'https://www.aa.com/i18n/aadvantage-program/miles/deals.jsp?fbclid=IwAR12&utm_campaign=social',
    expected: 'https://www.aa.com/i18n/aadvantage-program/miles/deals.jsp' },
  { name: 'southwest clk stripped',
    input: 'https://www.southwest.com/air/low-fare-calendar/?clk=GFOOTER-DEALS&utm_medium=display',
    expected: 'https://www.southwest.com/air/low-fare-calendar/' },
  { name: 'emirates utm stripped, hash preserved',
    input: 'https://www.emirates.com/us/english/destinations/?utm_source=newsletter#africa',
    expected: 'https://www.emirates.com/us/english/destinations/#africa' },

  // FUNCTIONAL deep-link params survive by construction
  { name: 'ryanair deep-link search params survive',
    input: 'https://www.ryanair.com/gb/en/trip/flights/select?adults=2&dateOut=2026-08-01&originIata=STN&destinationIata=DUB&utm_source=email',
    expected: 'https://www.ryanair.com/gb/en/trip/flights/select?adults=2&dateOut=2026-08-01&originIata=STN&destinationIata=DUB' },
  { name: 'easyjet deep-link params survive',
    input: 'https://www.easyjet.com/deeplink?dep=LGW&dest=AMS&dd=2026-08-01&apax=1&gclid=xyz',
    expected: 'https://www.easyjet.com/deeplink?dep=LGW&dest=AMS&dd=2026-08-01&apax=1' },

  // Auth / check-in battery — flows must be untouched
  { name: 'united check-in untouched',
    input: 'https://www.united.com/en/us/checkin?confirmationNumber=ABC123&lastName=POWERS',
    expected: 'https://www.united.com/en/us/checkin?confirmationNumber=ABC123&lastName=POWERS',
    expectedNeeds: false },
  { name: 'delta my-trips lookup untouched',
    input: 'https://www.delta.com/my-trips/search?confirmationNumber=XYZ789&firstName=T&lastName=P',
    expected: 'https://www.delta.com/my-trips/search?confirmationNumber=XYZ789&firstName=T&lastName=P',
    expectedNeeds: false },
  { name: 'lufthansa login redirect params untouched',
    input: 'https://www.lufthansa.com/us/en/login?redirectUrl=%2Fprofile&state=af0ifjsldkj',
    expected: 'https://www.lufthansa.com/us/en/login?redirectUrl=%2Fprofile&state=af0ifjsldkj',
    expectedNeeds: false },

  // cmp is delta-only: must NOT be stripped on other carriers
  { name: 'cmp param survives on british airways (delta-only extra)',
    input: 'https://www.britishairways.com/travel/home/public/en_us?cmp=keepme',
    expected: 'https://www.britishairways.com/travel/home/public/en_us?cmp=keepme',
    expectedNeeds: false },

  // Non-airline
  { name: 'lookalike -> null',
    input: 'https://deltafaucet.com/kitchen?cmp=abc',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenAirlineUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}

check('12 carriers in the table', AIRLINES.length, 12);
check('isAirlineHost: delta.com', isAirlineHost('www.delta.com'), true);
check('isAirlineHost: qatarairways.com', isAirlineHost('www.qatarairways.com'), true);
check('isAirlineHost: deltafaucet.com', isAirlineHost('deltafaucet.com'), false);
check('isAirlineHost: aa.com bare', isAirlineHost('aa.com'), true);
check('isAirlineHost: notaa.com', isAirlineHost('notaa.com'), false);
check('isPostUrl: has junk', isPostUrl('https://www.delta.com/deals?cmp=a'), true);
check('isPostUrl: clean', isPostUrl('https://www.delta.com/deals'), false);
check('shorten on garbage', shortenAirlineUrl('not a url'), null);
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
