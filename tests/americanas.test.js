const path = require('path');
const mod = require(path.join('..', 'src', 'americanas.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'already clean',
    input: 'https://www.americanas.com.br/produto/1234567890',
    expected: 'https://www.americanas.com.br/produto/1234567890', expectedNeeds: false },
  { name: 'junk stripped',
    input: 'https://www.americanas.com.br/produto/1234567890?utm_source=share&gclid=abc&cjevent=xyz&opn=YSMESP&epar=bp_pl_00',
    expected: 'https://www.americanas.com.br/produto/1234567890' },
  { name: 'lookalike -> null',
    input: 'https://notamericanas.com.br/produto/1234567890?utm_source=a', expected: null },
  { name: 'opn/epar affiliate stripped',
    input: 'https://www.americanas.com.br/produto/1234567890?opn=YSMESP&epar=bp_pl_00_go',
    expected: 'https://www.americanas.com.br/produto/1234567890' },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenAmericanasUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: primary', mod.isAmericanasHost('www.americanas.com.br'), true);
check('host: lookalike', mod.isAmericanasHost('notamericanas.com.br'), false);
check('shorten on garbage', mod.shortenAmericanasUrl('not a url'), null);
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
