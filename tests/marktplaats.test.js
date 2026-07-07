const path = require('path');
const {
  shortenMarktplaatsUrl,
  needsShortening,
  isMarktplaatsHost,
  isPostUrl,
} = require(path.join('..', 'src', 'marktplaats.js'));

const VALID_HOST = 'www.marktplaats.nl';

const CASES = [
  { name: 'ad already clean',
    input: 'https://www.marktplaats.nl/v/fietsen-en-brommers/fietsen-heren/m2153412345-gazelle-herenfiets',
    expected: 'https://www.marktplaats.nl/v/fietsen-en-brommers/fietsen-heren/m2153412345-gazelle-herenfiets',
    expectedNeeds: false },
  { name: 'correlationId stripped',
    input: 'https://www.marktplaats.nl/v/fietsen-en-brommers/fietsen-heren/m2153412345-gazelle-herenfiets?correlationId=abc-123&casData=xyz',
    expected: 'https://www.marktplaats.nl/v/fietsen-en-brommers/fietsen-heren/m2153412345-gazelle-herenfiets' },
  { name: 'hash preserved',
    input: 'https://www.marktplaats.nl/v/a/b/m1-x?correlationId=a#foto',
    expected: 'https://www.marktplaats.nl/v/a/b/m1-x#foto' },
  { name: 'category list → null',
    input: 'https://www.marktplaats.nl/l/fietsen-en-brommers/',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://notmarktplaats.nl/v/a/b/m1-x',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenMarktplaatsUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('host: valid', isMarktplaatsHost(VALID_HOST), true);
check('host: lookalike suffix', isMarktplaatsHost(VALID_HOST + '.evil.com'), false);
check('shorten on garbage', shortenMarktplaatsUrl('not a url'), null);
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
