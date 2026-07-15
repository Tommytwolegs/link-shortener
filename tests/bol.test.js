const path = require('path');
const mod = require(path.join('..', 'src', 'bol.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'already clean',
    input: 'https://www.bol.com/nl/nl/p/example-product/9300000012345678/',
    expected: 'https://www.bol.com/nl/nl/p/example-product/9300000012345678/', expectedNeeds: false },
  { name: 'junk stripped',
    input: 'https://www.bol.com/nl/nl/p/example-product/9300000012345678/?utm_source=share&gclid=abc&cjevent=xyz&bltgh=aBcD-eFgH',
    expected: 'https://www.bol.com/nl/nl/p/example-product/9300000012345678/' },
  { name: 'lookalike -> null',
    input: 'https://notbol.com/nl/nl/p/example-product/9300000012345678/?utm_source=a', expected: null },
  { name: 'bltgh affiliate id stripped',
    input: 'https://www.bol.com/nl/nl/p/example-product/9300000012345678/?bltgh=aBcD-eFgH.ProductTitle',
    expected: 'https://www.bol.com/nl/nl/p/example-product/9300000012345678/' },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenBolUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: primary', mod.isBolHost('www.bol.com'), true);
check('host: lookalike', mod.isBolHost('notbol.com'), false);
check('shorten on garbage', mod.shortenBolUrl('not a url'), null);
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
