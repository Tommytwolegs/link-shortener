const path = require('path');
const {
  shortenCarousellUrl,
  needsShortening,
  isCarousellHost,
  isPostUrl,
} = require(path.join('..', 'src', 'carousell.js'));

const VALID_HOST = 'www.carousell.sg';

const CASES = [
  { name: 'listing already clean',
    input: 'https://www.carousell.sg/p/vintage-camera-1234567890/',
    expected: 'https://www.carousell.sg/p/vintage-camera-1234567890/',
    expectedNeeds: false },
  { name: 't-id share junk stripped',
    input: 'https://www.carousell.sg/p/vintage-camera-1234567890/?t-id=abc_123&t-referrer_browse_type=search',
    expected: 'https://www.carousell.sg/p/vintage-camera-1234567890/' },
  { name: 'hk TLD cleaned',
    input: 'https://www.carousell.com.hk/p/item-99/?t-id=x',
    expected: 'https://www.carousell.com.hk/p/item-99/' },
  { name: 'hash preserved',
    input: 'https://www.carousell.tw/p/x-1/?t-id=a#desc',
    expected: 'https://www.carousell.tw/p/x-1/#desc' },
  { name: 'search → null',
    input: 'https://www.carousell.sg/search/camera',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://notcarousell.sg/p/x-1/',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenCarousellUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('host: valid', isCarousellHost(VALID_HOST), true);
check('host: lookalike suffix', isCarousellHost(VALID_HOST + '.evil.com'), false);
check('shorten on garbage', shortenCarousellUrl('not a url'), null);
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
