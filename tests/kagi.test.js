const path = require('path');
const mod = require(path.join('..', 'src', 'kagi.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'search already clean',
    input: 'https://kagi.com/search?q=typescript+generics',
    expected: 'https://kagi.com/search?q=typescript+generics', expectedNeeds: false },
  { name: 'universal junk stripped',
    input: 'https://kagi.com/search?q=typescript&utm_source=share&gclid=abc',
    expected: 'https://kagi.com/search?q=typescript' },
  { name: 'share token= functional, kept',
    input: 'https://kagi.com/search?q=x&token=AbCd123',
    expected: 'https://kagi.com/search?q=x&token=AbCd123', expectedNeeds: false },
  { name: 'lookalike -> null',
    input: 'https://notkagi.com/search?utm_source=a', expected: null },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenKagiUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: kagi.com', mod.isKagiHost('kagi.com'), true);
check('host: translate.kagi.com', mod.isKagiHost('translate.kagi.com'), true);
check('host: lookalike', mod.isKagiHost('notkagi.com'), false);
check('shorten on garbage', mod.shortenKagiUrl('not a url'), null);
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
