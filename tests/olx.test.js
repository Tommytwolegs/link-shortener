const path = require('path');
const {
  shortenOlxUrl,
  needsShortening,
  isOlxHost,
  isPostUrl,
} = require(path.join('..', 'src', 'olx.js'));

const VALID_HOST = 'www.olx.pl';

const CASES = [
  { name: 'offer already clean',
    input: 'https://www.olx.pl/d/oferta/go-pro-hero-13-nowe-nie-uzywane-CID99-ID15G9aU.html',
    expected: 'https://www.olx.pl/d/oferta/go-pro-hero-13-nowe-nie-uzywane-CID99-ID15G9aU.html',
    expectedNeeds: false },
  { name: 'reason junk stripped',
    input: 'https://www.olx.pl/d/oferta/przyczepa-kablowa-CID5-ID14cs56.html?reason=seller_profile&bs=seller_listing',
    expected: 'https://www.olx.pl/d/oferta/przyczepa-kablowa-CID5-ID14cs56.html' },
  { name: 'romanian TLD cleaned',
    input: 'https://www.olx.ro/d/oferta/apartament-2-camere-ID9aBcD.html?reason=extended_search',
    expected: 'https://www.olx.ro/d/oferta/apartament-2-camere-ID9aBcD.html' },
  { name: 'hash preserved',
    input: 'https://www.olx.pl/d/oferta/x-ID1a.html?reason=a#opis',
    expected: 'https://www.olx.pl/d/oferta/x-ID1a.html#opis' },
  { name: 'listing page → null',
    input: 'https://www.olx.pl/motoryzacja/samochody/',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://notolx.pl/d/oferta/x-ID1a.html',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenOlxUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('host: valid', isOlxHost(VALID_HOST), true);
check('host: lookalike suffix', isOlxHost(VALID_HOST + '.evil.com'), false);
check('shorten on garbage', shortenOlxUrl('not a url'), null);
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
