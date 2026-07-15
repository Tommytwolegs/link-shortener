const path = require('path');
const mod = require(path.join('..', 'src', 'trendyol.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'already clean',
    input: 'https://www.trendyol.com/example-brand/example-shoe-p-123456789',
    expected: 'https://www.trendyol.com/example-brand/example-shoe-p-123456789', expectedNeeds: false },
  { name: 'junk stripped',
    input: 'https://www.trendyol.com/example-brand/example-shoe-p-123456789?utm_source=share&gclid=abc&cjevent=xyz',
    expected: 'https://www.trendyol.com/example-brand/example-shoe-p-123456789' },
  { name: 'lookalike -> null',
    input: 'https://nottrendyol.com/example-brand/example-shoe-p-123456789?utm_source=a', expected: null },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenTrendyolUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: primary', mod.isTrendyolHost('www.trendyol.com'), true);
check('host: lookalike', mod.isTrendyolHost('nottrendyol.com'), false);
check('shorten on garbage', mod.shortenTrendyolUrl('not a url'), null);
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
