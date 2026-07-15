const path = require('path');
const mod = require(path.join('..', 'src', 'espn.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'already clean',
    input: 'https://www.espn.com/nba/story/_/id/12345678/example-headline',
    expected: 'https://www.espn.com/nba/story/_/id/12345678/example-headline', expectedNeeds: false },
  { name: 'utm + ad-click junk stripped',
    input: 'https://www.espn.com/nba/story/_/id/12345678/example-headline?utm_source=share&gclid=abc&fbclid=IwAR1&cjevent=xyz',
    expected: 'https://www.espn.com/nba/story/_/id/12345678/example-headline' },
  { name: 'lookalike -> null',
    input: 'https://notespn.com/nba/story/_/id/12345678/example-headline?utm_source=a', expected: null },
  { name: 'ex_cid stripped',
    input: 'https://www.espn.com/nba/story/_/id/12345678/example-headline?ex_cid=espnapp_share_ios',
    expected: 'https://www.espn.com/nba/story/_/id/12345678/example-headline' },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenEspnUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: primary', mod.isEspnHost('www.espn.com'), true);
check('host: lookalike', mod.isEspnHost('notespn.com'), false);
check('shorten on garbage', mod.shortenEspnUrl('not a url'), null);
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
