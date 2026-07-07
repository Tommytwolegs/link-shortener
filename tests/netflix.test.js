const path = require('path');
const {
  shortenNetflixUrl,
  needsShortening,
  isNetflixHost,
  isPostUrl,
} = require(path.join('..', 'src', 'netflix.js'));

const CASES = [
  { name: 'title already clean',
    input: 'https://www.netflix.com/title/81234567',
    expected: 'https://www.netflix.com/title/81234567',
    expectedNeeds: false },
  { name: 'trkid share tracker stripped',
    input: 'https://www.netflix.com/title/81234567?s=i&trkid=13747225&vlang=en',
    expected: 'https://www.netflix.com/title/81234567' },
  { name: 'locale-prefixed title cleaned',
    input: 'https://www.netflix.com/gb/title/81234567?trkid=1',
    expected: 'https://www.netflix.com/gb/title/81234567' },
  { name: 'watch page tctx stripped',
    input: 'https://www.netflix.com/watch/81234567?tctx=0%2C0%2Cabc&trackId=155573558',
    expected: 'https://www.netflix.com/watch/81234567' },
  { name: 'hash preserved',
    input: 'https://www.netflix.com/title/1?trkid=x#trailer',
    expected: 'https://www.netflix.com/title/1#trailer' },
  { name: 'browse → null',
    input: 'https://www.netflix.com/browse/genre/83',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://netflix.com.evil.com/title/1',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenNetflixUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('host: valid', isNetflixHost('www.netflix.com'), true);
check('host: lookalike', isNetflixHost('netflix.com.evil.com'), false);
check('shorten on garbage', shortenNetflixUrl('not a url'), null);
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
