const path = require('path');
const {
  shortenMeeshoUrl,
  needsShortening,
  isMeeshoHost,
  isPostUrl,
} = require(path.join('..', 'src', 'meesho.js'));

const VALID_HOST = 'www.meesho.com';

const CASES = [
  { name: 'product already clean',
    input: 'https://www.meesho.com/silk-cotton-saree/p/2smq2y',
    expected: 'https://www.meesho.com/silk-cotton-saree/p/2smq2y',
    expectedNeeds: false },
  { name: 'share short form cleaned',
    input: 'https://www.meesho.com/s/p/5dzn8f?utm_source=whatsapp',
    expected: 'https://www.meesho.com/s/p/5dzn8f' },
  { name: 'catalog /pl/ cleaned',
    input: 'https://www.meesho.com/jute-cotton-saree/pl/4ud?srsltid=abc',
    expected: 'https://www.meesho.com/jute-cotton-saree/pl/4ud' },
  { name: 'tracking stripped',
    input: 'https://www.meesho.com/silk-cotton-saree/p/2smq2y?utm_source=share&utm_medium=app',
    expected: 'https://www.meesho.com/silk-cotton-saree/p/2smq2y' },
  { name: 'hash preserved',
    input: 'https://www.meesho.com/x/p/1a?utm_source=a#reviews',
    expected: 'https://www.meesho.com/x/p/1a#reviews' },
  { name: 'home → null',
    input: 'https://www.meesho.com/',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://notmeesho.com/x/p/1a',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenMeeshoUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('host: valid', isMeeshoHost(VALID_HOST), true);
check('host: lookalike suffix', isMeeshoHost(VALID_HOST + '.evil.com'), false);
check('shorten on garbage', shortenMeeshoUrl('not a url'), null);
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
