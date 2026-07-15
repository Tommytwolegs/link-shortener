const path = require('path');
const mod = require(path.join('..', 'src', 'scholar.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'scholar search already clean',
    input: 'https://scholar.google.com/scholar?q=attention+is+all+you+need&hl=en',
    expected: 'https://scholar.google.com/scholar?q=attention+is+all+you+need&hl=en', expectedNeeds: false },
  { name: 'oi entry attribution stripped, cites kept',
    input: 'https://scholar.google.com/scholar?cites=12345678901234&oi=scholarr',
    expected: 'https://scholar.google.com/scholar?cites=12345678901234' },
  { name: 'citations profile user= kept',
    input: 'https://scholar.google.com/citations?user=AbCdEfG&utm_source=share',
    expected: 'https://scholar.google.com/citations?user=AbCdEfG' },
  { name: 'www.google.com NOT this module',
    input: 'https://www.google.com/scholar?oi=x', expected: null },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenScholarUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: scholar.google.com', mod.isScholarHost('scholar.google.com'), true);
check('host: www.google.com rejected', mod.isScholarHost('www.google.com'), false);
check('shorten on garbage', mod.shortenScholarUrl('not a url'), null);
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
