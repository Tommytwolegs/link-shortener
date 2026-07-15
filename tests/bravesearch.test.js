const path = require('path');
const mod = require(path.join('..', 'src', 'bravesearch.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'search already clean',
    input: 'https://search.brave.com/search?q=rust+lifetimes',
    expected: 'https://search.brave.com/search?q=rust+lifetimes', expectedNeeds: false },
  { name: 'source attribution stripped, offset kept',
    input: 'https://search.brave.com/search?q=rust&offset=1&source=desktop',
    expected: 'https://search.brave.com/search?q=rust&offset=1' },
  { name: 'brave.com company site NOT covered',
    input: 'https://brave.com/download/?source=homepage', expected: null },
  { name: 'lookalike -> null',
    input: 'https://search.brave.com.evil.example/search?source=a', expected: null },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenBravesearchUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: search.brave.com', mod.isBravesearchHost('search.brave.com'), true);
check('host: brave.com rejected', mod.isBravesearchHost('brave.com'), false);
check('host: www.brave.com rejected', mod.isBravesearchHost('www.brave.com'), false);
check('shorten on garbage', mod.shortenBravesearchUrl('not a url'), null);
check('needs on garbage', mod.needsShortening('not a url'), false);

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
