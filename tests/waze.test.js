// Unit tests for src/waze.js — runnable with plain Node, no dependencies.
//
// Usage: node tests/waze.test.js

const path = require('path');
const {
  shortenWazeUrl,
  needsShortening,
  isWazeHost,
  isPostUrl,
} = require(path.join('..', 'src', 'waze.js'));

const CASES = [
  { name: 'ul: ll + navigate kept, utm + ref stripped',
    input: 'https://www.waze.com/ul?ll=40.7128%2C-74.0060&navigate=yes&utm_source=x&ref=share',
    expected: 'https://www.waze.com/ul?ll=40.7128%2C-74.0060&navigate=yes' },
  { name: 'ul: zoom kept',
    input: 'https://www.waze.com/ul?ll=40.7%2C-74.0&z=17&utm_campaign=promo',
    expected: 'https://www.waze.com/ul?ll=40.7%2C-74.0&z=17' },
  { name: 'live-map directions: to= kept',
    input: 'https://www.waze.com/live-map/directions?to=ll.40.7%2C-74.0&utm_medium=share',
    expected: 'https://www.waze.com/live-map/directions?to=ll.40.7%2C-74.0' },
  { name: 'already clean → unchanged',
    input: 'https://www.waze.com/ul?ll=40.7%2C-74.0&navigate=yes',
    expected: 'https://www.waze.com/ul?ll=40.7%2C-74.0&navigate=yes',
    expectedNeeds: false },
  { name: 'hash preserved',
    input: 'https://www.waze.com/ul?ll=40.7%2C-74.0&utm_source=x#map',
    expected: 'https://www.waze.com/ul?ll=40.7%2C-74.0#map' },
  { name: 'lookalike host → null-ish (unchanged, not waze)',
    input: 'https://notwaze.com/ul?ll=1%2C2&utm_source=x',
    expected: null },
  { name: 'waze.com.evil.com → null',
    input: 'https://waze.com.evil.com/ul?ll=1%2C2',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  check('shorten - ' + c.name, shortenWazeUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}

check('isWazeHost: www.waze.com', isWazeHost('www.waze.com'), true);
check('isWazeHost: waze.com', isWazeHost('waze.com'), true);
check('isWazeHost: notwaze.com', isWazeHost('notwaze.com'), false);
check('isWazeHost: waze.com.evil.com', isWazeHost('waze.com.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://www.waze.com/ul?ll=1%2C2&utm_source=x'), true);
check('isPostUrl: clean false', isPostUrl('https://www.waze.com/ul?ll=1%2C2'), false);
check('shorten on garbage', shortenWazeUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) {
  for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual);
  process.exit(1);
}
