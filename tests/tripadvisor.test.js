const path = require('path');
const {
  shortenTripadvisorUrl,
  needsShortening,
  isTripadvisorHost,
  isPostUrl,
} = require(path.join('..', 'src', 'tripadvisor.js'));

const VALID_HOST = 'www.tripadvisor.com';

const CASES = [
  { name: 'hotel review already clean',
    input: 'https://www.tripadvisor.com/Hotel_Review-g60763-d93589-Reviews-Hotel_Edison-New_York_City_New_York.html',
    expected: 'https://www.tripadvisor.com/Hotel_Review-g60763-d93589-Reviews-Hotel_Edison-New_York_City_New_York.html',
    expectedNeeds: false },
  { name: 'm= marketing junk stripped',
    input: 'https://www.tripadvisor.com/Hotel_Review-g60763-d93589-Reviews-Hotel_Edison-New_York_City_New_York.html?m=19905&supag=abc&gclid=xyz',
    expected: 'https://www.tripadvisor.com/Hotel_Review-g60763-d93589-Reviews-Hotel_Edison-New_York_City_New_York.html' },
  { name: 'pagination IN PATH untouched',
    input: 'https://www.tripadvisor.com/Hotel_Review-g60763-d93589-Reviews-or10-Hotel_Edison-New_York_City_New_York.html?m=19905',
    expected: 'https://www.tripadvisor.com/Hotel_Review-g60763-d93589-Reviews-or10-Hotel_Edison-New_York_City_New_York.html' },
  { name: 'restaurant review cleaned',
    input: 'https://www.tripadvisor.co.uk/Restaurant_Review-g186338-d718538-Reviews-Dishoom-London_England.html?taml=1',
    expected: 'https://www.tripadvisor.co.uk/Restaurant_Review-g186338-d718538-Reviews-Dishoom-London_England.html' },
  { name: 'unknown params preserved (denylist)',
    input: 'https://www.tripadvisor.com/Attraction_Review-g1-d2-Reviews-X.html?m=19905&unknownState=1',
    expected: 'https://www.tripadvisor.com/Attraction_Review-g1-d2-Reviews-X.html?unknownState=1' },
  { name: 'hash preserved',
    input: 'https://www.tripadvisor.com/Hotel_Review-g1-d2-Reviews-X.html?m=1#REVIEWS',
    expected: 'https://www.tripadvisor.com/Hotel_Review-g1-d2-Reviews-X.html#REVIEWS' },
  { name: 'search → null',
    input: 'https://www.tripadvisor.com/Search?q=paris',
    expected: null },
  { name: 'geo page → null',
    input: 'https://www.tripadvisor.com/Tourism-g187147-Paris_Ile_de_France-Vacations.html',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenTripadvisorUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('host: valid', isTripadvisorHost(VALID_HOST), true);
check('host: lookalike suffix', isTripadvisorHost(VALID_HOST + '.evil.com'), false);
check('shorten on garbage', shortenTripadvisorUrl('not a url'), null);
check('needs on garbage', needsShortening('not a url'), false);
// Mutation guard (denylist module deletes params):
const probe = new URL('https://www.tripadvisor.com/Hotel_Review-g1-d2-Reviews-X.html?m=1');
check('shorten on URL object', shortenTripadvisorUrl(probe), 'https://www.tripadvisor.com/Hotel_Review-g1-d2-Reviews-X.html');
check('URL-object input not mutated', probe.href, 'https://www.tripadvisor.com/Hotel_Review-g1-d2-Reviews-X.html?m=1');
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
