const path = require('path');
const mod = require(path.join('..', 'src', 'loom.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
function run(cases) {
  for (const c of cases) {
    check('shorten - ' + c.name, mod.shortenLoomUrl(c.input), c.expected);
    let expectedNeeds;
    if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
    else if (c.expected === null) expectedNeeds = false;
    else expectedNeeds = c.input !== c.expected;
    check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
  }
}

run([
  { name: 'sid stripped on share path',
    input: 'https://www.loom.com/share/0123456789abcdef0123456789abcdef?sid=f9a81b2c-1111-2222-3333-444455556666',
    expected: 'https://www.loom.com/share/0123456789abcdef0123456789abcdef' },
  { name: 't= timestamp deep-link survives',
    input: 'https://www.loom.com/share/abc123?sid=xyz&t=42',
    expected: 'https://www.loom.com/share/abc123?t=42' },
  { name: 'sid NOT stripped off the share path (unverified there)',
    input: 'https://www.loom.com/settings?sid=keep',
    expected: 'https://www.loom.com/settings?sid=keep',
    expectedNeeds: false },
  { name: 'utm stripped host-wide',
    input: 'https://www.loom.com/looms/videos?utm_source=email',
    expected: 'https://www.loom.com/looms/videos' },
  { name: 'lookalike -> null',
    input: 'https://loom.example.com/share/abc?sid=x',
    expected: null },
]);
check('host: loom.com', mod.isLoomHost('www.loom.com'), true);
check('host: lookalike', mod.isLoomHost('heirloom.com'), false);

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
