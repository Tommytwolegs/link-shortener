const path = require('path');
const mod = require(path.join('..', 'src', 'lowes.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'already clean',
    input: 'https://www.lowes.com/pd/example-saw/1000123456',
    expected: 'https://www.lowes.com/pd/example-saw/1000123456', expectedNeeds: false },
  { name: 'utm + ad-click junk stripped',
    input: 'https://www.lowes.com/pd/example-saw/1000123456?utm_source=share&gclid=abc&fbclid=IwAR1&cjevent=xyz',
    expected: 'https://www.lowes.com/pd/example-saw/1000123456' },
  { name: 'lookalike -> null',
    input: 'https://notlowes.com/pd/example-saw/1000123456?utm_source=a', expected: null },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenLowesUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: primary', mod.isLowesHost('www.lowes.com'), true);
check('host: lookalike', mod.isLowesHost('notlowes.com'), false);
check('shorten on garbage', mod.shortenLowesUrl('not a url'), null);
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
