const path = require('path');
const mod = require(path.join('..', 'src', 'flashscore.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'already clean',
    input: 'https://www.flashscore.com/match/example123/#/match-summary',
    expected: 'https://www.flashscore.com/match/example123/#/match-summary', expectedNeeds: false },
  { name: 'junk stripped, hash kept',
    input: 'https://www.flashscore.com/match/example123?utm_source=share&gclid=abc#/match-summary',
    expected: 'https://www.flashscore.com/match/example123#/match-summary' },
  { name: 'lookalike -> null',
    input: 'https://notflashscore.com/x?utm_source=a', expected: null },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenFlashscoreUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: primary', mod.isFlashscoreHost('www.flashscore.com'), true);
check('host: lookalike', mod.isFlashscoreHost('notflashscore.com'), false);
check('shorten on garbage', mod.shortenFlashscoreUrl('not a url'), null);
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
