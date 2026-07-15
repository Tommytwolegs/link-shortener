const path = require('path');
const mod = require(path.join('..', 'src', 'notion.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
function run(cases) {
  for (const c of cases) {
    check('shorten - ' + c.name, mod.shortenNotionUrl(c.input), c.expected);
    let expectedNeeds;
    if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
    else if (c.expected === null) expectedNeeds = false;
    else expectedNeeds = c.input !== c.expected;
    check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
  }
}

run([
  { name: 'pvs share token stripped',
    input: 'https://www.notion.so/yourco/Meeting-Notes-0123456789abcdef0123456789abcdef?pvs=4',
    expected: 'https://www.notion.so/yourco/Meeting-Notes-0123456789abcdef0123456789abcdef' },
  { name: 'database view v= survives',
    input: 'https://www.notion.so/yourco/Tasks-abc123?v=def456&pvs=4',
    expected: 'https://www.notion.so/yourco/Tasks-abc123?v=def456' },
  { name: 'peek page p= survives',
    input: 'https://www.notion.so/yourco/Tasks-abc123?p=aaa111&pm=s&pvs=4',
    expected: 'https://www.notion.so/yourco/Tasks-abc123?p=aaa111&pm=s' },
  { name: 'public notion.site page covered, block anchor kept',
    input: 'https://yourco.notion.site/Public-Doc-abc?pvs=21#block-id-here',
    expected: 'https://yourco.notion.site/Public-Doc-abc#block-id-here' },
  { name: 'lookalike -> null',
    input: 'https://notnotion.so/page?pvs=4',
    expected: null },
]);
check('host: notion.so', mod.isNotionHost('www.notion.so'), true);
check('host: tenant notion.site', mod.isNotionHost('yourco.notion.site'), true);
check('host: lookalike', mod.isNotionHost('notion.sombrero.example'), false);

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
