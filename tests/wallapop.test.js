const path = require('path');
const {
  shortenWallapopUrl,
  needsShortening,
  isWallapopHost,
  isPostUrl,
} = require(path.join('..', 'src', 'wallapop.js'));

const VALID_HOST = 'es.wallapop.com';

const CASES = [
  { name: 'item already clean',
    input: 'https://es.wallapop.com/item/bicicleta-montana-987654321',
    expected: 'https://es.wallapop.com/item/bicicleta-montana-987654321',
    expectedNeeds: false },
  { name: 'utm stripped',
    input: 'https://es.wallapop.com/item/bicicleta-montana-987654321?utm_source=share&utm_medium=app',
    expected: 'https://es.wallapop.com/item/bicicleta-montana-987654321' },
  { name: 'hash preserved',
    input: 'https://es.wallapop.com/item/x-1?utm_source=a#info',
    expected: 'https://es.wallapop.com/item/x-1#info' },
  { name: 'user profile → null',
    input: 'https://es.wallapop.com/user/juan-123',
    expected: null },
  { name: 'search → null',
    input: 'https://es.wallapop.com/app/search?keywords=bici',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://notwallapop.com/item/x-1',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenWallapopUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('host: valid', isWallapopHost(VALID_HOST), true);
check('host: lookalike suffix', isWallapopHost(VALID_HOST + '.evil.com'), false);
check('shorten on garbage', shortenWallapopUrl('not a url'), null);
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
