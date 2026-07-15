const path = require('path');
const mod = require(path.join('..', 'src', 'atlassian.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
function run(cases) {
  for (const c of cases) {
    check('shorten - ' + c.name, mod.shortenAtlassianUrl(c.input), c.expected);
    let expectedNeeds;
    if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
    else if (c.expected === null) expectedNeeds = false;
    else expectedNeeds = c.input !== c.expected;
    check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
  }
}

run([
  { name: 'jira issue atlOrigin stripped',
    input: 'https://yourco.atlassian.net/browse/PROJ-123?atlOrigin=eyJpIjoiYWJjZGVmIiwicCI6ImoifQ',
    expected: 'https://yourco.atlassian.net/browse/PROJ-123' },
  { name: 'confluence page atlOrigin stripped',
    input: 'https://yourco.atlassian.net/wiki/spaces/ENG/pages/12345/Design+Doc?atlOrigin=eyJpIjoi',
    expected: 'https://yourco.atlassian.net/wiki/spaces/ENG/pages/12345/Design+Doc' },
  { name: 'focusedCommentId survives (comment deep-link)',
    input: 'https://yourco.atlassian.net/browse/PROJ-9?focusedCommentId=100&atlOrigin=xyz',
    expected: 'https://yourco.atlassian.net/browse/PROJ-9?focusedCommentId=100' },
  { name: 'board selectedIssue + jql survive',
    input: 'https://yourco.atlassian.net/jira/software/projects/P/boards/1?selectedIssue=P-2&jql=status%3DOpen',
    expected: 'https://yourco.atlassian.net/jira/software/projects/P/boards/1?selectedIssue=P-2&jql=status%3DOpen',
    expectedNeeds: false },
  { name: 'lookalike -> null',
    input: 'https://atlassian.net.example.com/browse/X-1?atlOrigin=abc',
    expected: null },
]);
check('host: tenant', mod.isAtlassianHost('yourco.atlassian.net'), true);
check('host: lookalike', mod.isAtlassianHost('myatlassian.net'), false);

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
