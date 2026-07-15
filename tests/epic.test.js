const path = require('path');
const mod = require(path.join('..', 'src', 'epic.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'already clean',
    input: 'https://store.epicgames.com/en-US/p/example-game',
    expected: 'https://store.epicgames.com/en-US/p/example-game', expectedNeeds: false },
  { name: 'utm + ad-click junk stripped',
    input: 'https://store.epicgames.com/en-US/p/example-game?utm_source=share&gclid=abc&fbclid=IwAR1&cjevent=xyz',
    expected: 'https://store.epicgames.com/en-US/p/example-game' },
  { name: 'lookalike -> null',
    input: 'https://notepicgames.com/en-US/p/example-game?utm_source=a', expected: null },
  { name: 'epic_affiliate stripped, epic_gameId deliberately kept',
    input: 'https://store.epicgames.com/en-US/p/example-game?epic_affiliate=somecreator&epic_gameId=abc123',
    expected: 'https://store.epicgames.com/en-US/p/example-game?epic_gameId=abc123' },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenEpicUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: primary', mod.isEpicHost('store.epicgames.com'), true);
check('host: lookalike', mod.isEpicHost('notepicgames.com'), false);
check('shorten on garbage', mod.shortenEpicUrl('not a url'), null);
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
