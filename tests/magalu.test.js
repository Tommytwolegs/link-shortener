const path = require('path');
const mod = require(path.join('..', 'src', 'magalu.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'already clean',
    input: 'https://www.magazineluiza.com.br/example-produto/p/1234567/te/exte/',
    expected: 'https://www.magazineluiza.com.br/example-produto/p/1234567/te/exte/', expectedNeeds: false },
  { name: 'junk stripped',
    input: 'https://www.magazineluiza.com.br/example-produto/p/1234567/te/exte/?utm_source=share&gclid=abc&cjevent=xyz',
    expected: 'https://www.magazineluiza.com.br/example-produto/p/1234567/te/exte/' },
  { name: 'lookalike -> null',
    input: 'https://notmagazineluiza.com.br/example-produto/p/1234567/te/exte/?utm_source=a', expected: null },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenMagaluUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: primary', mod.isMagaluHost('www.magazineluiza.com.br'), true);
check('host: lookalike', mod.isMagaluHost('notmagazineluiza.com.br'), false);
check('shorten on garbage', mod.shortenMagaluUrl('not a url'), null);
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
