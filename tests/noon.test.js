const path = require('path');
const mod = require(path.join('..', 'src', 'noon.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'already clean',
    input: 'https://www.noon.com/uae-en/example-product/N12345678A/p/',
    expected: 'https://www.noon.com/uae-en/example-product/N12345678A/p/', expectedNeeds: false },
  { name: 'junk stripped',
    input: 'https://www.noon.com/uae-en/example-product/N12345678A/p/?utm_source=share&gclid=abc&cjevent=xyz',
    expected: 'https://www.noon.com/uae-en/example-product/N12345678A/p/' },
  { name: 'lookalike -> null',
    input: 'https://notnoon.com/uae-en/example-product/N12345678A/p/?utm_source=a', expected: null },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenNoonUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: primary', mod.isNoonHost('www.noon.com'), true);
check('host: lookalike', mod.isNoonHost('notnoon.com'), false);
check('shorten on garbage', mod.shortenNoonUrl('not a url'), null);
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
