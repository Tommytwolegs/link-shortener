const path = require('path');
const {
  shortenLeboncoinUrl,
  needsShortening,
  isLeboncoinHost,
  isPostUrl,
} = require(path.join('..', 'src', 'leboncoin.js'));

const VALID_HOST = 'www.leboncoin.fr';

const CASES = [
  { name: 'modern ad already clean',
    input: 'https://www.leboncoin.fr/ad/voitures/2345678901',
    expected: 'https://www.leboncoin.fr/ad/voitures/2345678901',
    expectedNeeds: false },
  { name: 'tracking stripped',
    input: 'https://www.leboncoin.fr/ad/voitures/2345678901?utm_source=share&utm_campaign=partage',
    expected: 'https://www.leboncoin.fr/ad/voitures/2345678901' },
  { name: 'legacy .htm form cleaned',
    input: 'https://www.leboncoin.fr/ventes_immobilieres/1234567890.htm?utm_medium=share',
    expected: 'https://www.leboncoin.fr/ventes_immobilieres/1234567890.htm' },
  { name: 'hash preserved',
    input: 'https://www.leboncoin.fr/ad/motos/1?utm_source=a#photos',
    expected: 'https://www.leboncoin.fr/ad/motos/1#photos' },
  { name: 'search list → null',
    input: 'https://www.leboncoin.fr/recherche?category=9',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://notleboncoin.fr/ad/voitures/1',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenLeboncoinUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('host: valid', isLeboncoinHost(VALID_HOST), true);
check('host: lookalike suffix', isLeboncoinHost(VALID_HOST + '.evil.com'), false);
check('shorten on garbage', shortenLeboncoinUrl('not a url'), null);
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
