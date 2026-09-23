const path = require('path');
const {
  shortenTicketsUrl,
  needsShortening,
  isTicketsHost,
  isPostUrl,
  storageKeyFor,
  TICKET_SITES,
} = require(path.join('..', 'src', 'tickets.js'));

const CASES = [
  // Canonical
  { name: 'ticketmaster event page already clean',
    input: 'https://www.ticketmaster.com/event/0B006247D6A12345',
    expected: 'https://www.ticketmaster.com/event/0B006247D6A12345',
    expectedNeeds: false },

  // Ticketmaster
  { name: 'ticketmaster partner attribution stripped (camefrom/tm_link)',
    input: 'https://www.ticketmaster.com/event/0B006247D6A12345?camefrom=CFC_BUZZFEED&tm_link=tm_homeA_header',
    expected: 'https://www.ticketmaster.com/event/0B006247D6A12345' },
  { name: 'ticketmaster marketing ids stripped (c_luid/awtrc/utm)',
    input: 'https://www.ticketmaster.com/artist/735647?c_luid=abc-123&awtrc=1&utm_source=email',
    expected: 'https://www.ticketmaster.com/artist/735647' },

  // StubHub
  { name: 'stubhub ad-landing attribution stripped',
    input: 'https://www.stubhub.com/taylor-swift-tickets/performer/1298/?gcid=chDIG-geUS&adcampaigngroup=brand&adname=exact',
    expected: 'https://www.stubhub.com/taylor-swift-tickets/performer/1298/' },
  { name: 'stubhub quantity selection survives',
    input: 'https://www.stubhub.com/event/105123456/?quantity=2&gcid=chDIG',
    expected: 'https://www.stubhub.com/event/105123456/?quantity=2' },

  // SeatGeek
  { name: 'seatgeek affiliate params stripped (aid/pcid/rtid)',
    input: 'https://seatgeek.com/lakers-tickets?aid=15990&pcid=3308&rtid=sg-999',
    expected: 'https://seatgeek.com/lakers-tickets' },
  { name: 'seatgeek ad click id stripped, hash preserved',
    input: 'https://seatgeek.com/concert-tickets?gclid=Cj0abc#dates',
    expected: 'https://seatgeek.com/concert-tickets#dates' },

  // AXS — universal set only; irclickid deliberately survives here
  { name: 'axs utm + fbclid stripped',
    input: 'https://www.axs.com/events/512345/some-tour-tickets?utm_source=fb&fbclid=IwAR9x',
    expected: 'https://www.axs.com/events/512345/some-tour-tickets' },
  { name: 'axs irclickid deliberately untouched (load-bearing on tix.axs.com)',
    input: 'https://tix.axs.com/checkout?irclickid=xyz123',
    expected: 'https://tix.axs.com/checkout?irclickid=xyz123',
    expectedNeeds: false },

  // aid is seatgeek-only: must NOT be stripped on other sites
  { name: 'aid survives on ticketmaster (seatgeek-only extra)',
    input: 'https://www.ticketmaster.com/search?q=concert&aid=keepme',
    expected: 'https://www.ticketmaster.com/search?q=concert&aid=keepme',
    expectedNeeds: false },

  // Functional search/filter params survive
  { name: 'ticketmaster search query + filters survive',
    input: 'https://www.ticketmaster.com/search?q=hamilton&sort=date%2Casc&utm_campaign=x',
    expected: 'https://www.ticketmaster.com/search?q=hamilton&sort=date%2Casc' },

  // Non-ticketing
  { name: 'lookalike -> null',
    input: 'https://ticketmaster.evil.com/event/1?camefrom=abc',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenTicketsUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}

check('4 sites in the table', TICKET_SITES.length, 4);
check('isTicketsHost: ticketmaster', isTicketsHost('www.ticketmaster.com'), true);
check('isTicketsHost: axs', isTicketsHost('tix.axs.com'), true);
check('isTicketsHost: lookalike', isTicketsHost('ticketmaster.evil.com'), false);
check('isPostUrl: has junk', isPostUrl('https://seatgeek.com/x?aid=1'), true);
check('isPostUrl: clean', isPostUrl('https://seatgeek.com/x'), false);
check('storageKeyFor: stubhub', storageKeyFor('www.stubhub.com'), 'enabledStubhub');
check('storageKeyFor: seatgeek', storageKeyFor('seatgeek.com'), 'enabledSeatgeek');
check('storageKeyFor: non-site', storageKeyFor('example.com'), null);
check('site keys unique', new Set(TICKET_SITES.map((s) => s.key)).size, TICKET_SITES.length);
check('shorten on garbage', shortenTicketsUrl('not a url'), null);
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
