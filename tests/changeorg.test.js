const path = require('path');
const mod = require(path.join('..', 'src', 'changeorg.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'petition already clean',
    input: 'https://www.change.org/p/save-the-example-park',
    expected: 'https://www.change.org/p/save-the-example-park', expectedNeeds: false },
  { name: 'recruiter personal identifiers stripped',
    input: 'https://www.change.org/p/save-the-example-park?recruiter=123456789&recruited_by_id=abcd-1234-ef56&utm_source=share_petition',
    expected: 'https://www.change.org/p/save-the-example-park' },
  { name: 'share provenance stripped',
    input: 'https://www.change.org/p/save-the-example-park?source_location=petitions_browse&pt=AbCdEf&psf_variant=combo&share_intent=1',
    expected: 'https://www.change.org/p/save-the-example-park' },
  { name: 'lookalike -> null',
    input: 'https://change.org.example.com/p/x?recruiter=1', expected: null },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenChangeorgUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: change.org', mod.isChangeorgHost('www.change.org'), true);
check('host: lookalike', mod.isChangeorgHost('notchange.org'), false);
check('shorten on garbage', mod.shortenChangeorgUrl('not a url'), null);
check('needs on garbage', mod.needsShortening('not a url'), false);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { console.log('\nFailures:'); for (const f of failures) { console.log('  - ' + f.label); console.log('      expected: ' + JSON.stringify(f.expected)); console.log('      actual:   ' + JSON.stringify(f.actual)); } process.exit(1); }
