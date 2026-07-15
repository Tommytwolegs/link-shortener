const path = require('path');
const mod = require(path.join('..', 'src', 'ecosia.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'search already clean',
    input: 'https://www.ecosia.org/search?q=solar+panels',
    expected: 'https://www.ecosia.org/search?q=solar+panels', expectedNeeds: false },
  { name: 'tt/addon install attribution stripped, q kept',
    input: 'https://www.ecosia.org/search?q=solar+panels&tt=mzl&addon=chrome',
    expected: 'https://www.ecosia.org/search?q=solar+panels' },
  { name: 'utm stripped on non-search path',
    input: 'https://www.ecosia.org/chat?utm_source=newsletter',
    expected: 'https://www.ecosia.org/chat' },
  { name: 'lookalike -> null',
    input: 'https://ecosia.org.example.com/search?q=x&tt=a', expected: null },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenEcosiaUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: ecosia.org', mod.isEcosiaHost('www.ecosia.org'), true);
check('host: lookalike', mod.isEcosiaHost('notecosia.org'), false);
check('shorten on garbage', mod.shortenEcosiaUrl('not a url'), null);
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
