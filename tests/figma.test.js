const path = require('path');
const mod = require(path.join('..', 'src', 'figma.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
function run(cases) {
  for (const c of cases) {
    check('shorten - ' + c.name, mod.shortenFigmaUrl(c.input), c.expected);
    let expectedNeeds;
    if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
    else if (c.expected === null) expectedNeeds = false;
    else expectedNeeds = c.input !== c.expected;
    check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
  }
}

run([
  { name: 't= share token stripped on /design/',
    input: 'https://www.figma.com/design/AbCdEf123/App-Redesign?node-id=12-345&t=Qw9RtY2u-1',
    expected: 'https://www.figma.com/design/AbCdEf123/App-Redesign?node-id=12-345' },
  { name: 'legacy /file/ path covered, m= mode survives',
    input: 'https://www.figma.com/file/AbCdEf123/App?type=design&node-id=1-2&m=dev&t=abc-0',
    expected: 'https://www.figma.com/file/AbCdEf123/App?type=design&node-id=1-2&m=dev' },
  { name: 'proto viewport params survive',
    input: 'https://www.figma.com/proto/AbCdEf123/Flow?page-id=0%3A1&node-id=1-2&viewport=241%2C48%2C0.32&scaling=min-zoom&t=xyz-1',
    expected: 'https://www.figma.com/proto/AbCdEf123/Flow?page-id=0%3A1&node-id=1-2&viewport=241%2C48%2C0.32&scaling=min-zoom' },
  { name: 't= NOT stripped off file paths (unverified there)',
    input: 'https://www.figma.com/community/search?t=icons',
    expected: 'https://www.figma.com/community/search?t=icons',
    expectedNeeds: false },
  { name: 'lookalike -> null',
    input: 'https://figma.example.com/design/x?t=abc',
    expected: null },
]);
check('host: figma.com', mod.isFigmaHost('www.figma.com'), true);
check('host: lookalike', mod.isFigmaHost('configma.com'), false);

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
