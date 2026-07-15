const path = require('path');
const mod = require(path.join('..', 'src', 'elevenst.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'already clean',
    input: 'https://www.11st.co.kr/products/1234567890',
    expected: 'https://www.11st.co.kr/products/1234567890', expectedNeeds: false },
  { name: 'junk stripped',
    input: 'https://www.11st.co.kr/products/1234567890?utm_source=share&gclid=abc&cjevent=xyz',
    expected: 'https://www.11st.co.kr/products/1234567890' },
  { name: 'lookalike -> null',
    input: 'https://not11st.co.kr/products/1234567890?utm_source=a', expected: null },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenElevenstUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: primary', mod.isElevenstHost('www.11st.co.kr'), true);
check('host: lookalike', mod.isElevenstHost('not11st.co.kr'), false);
check('shorten on garbage', mod.shortenElevenstUrl('not a url'), null);
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
