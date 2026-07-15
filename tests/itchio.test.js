const path = require('path');
const mod = require(path.join('..', 'src', 'itchio.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'already clean',
    input: 'https://somedev.itch.io/cool-game',
    expected: 'https://somedev.itch.io/cool-game', expectedNeeds: false },
  { name: 'utm + ad-click junk stripped',
    input: 'https://somedev.itch.io/cool-game?utm_source=share&gclid=abc&fbclid=IwAR1&cjevent=xyz',
    expected: 'https://somedev.itch.io/cool-game' },
  { name: 'lookalike -> null',
    input: 'https://notitch.example/cool-game?utm_source=a', expected: null },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenItchioUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: primary', mod.isItchioHost('somedev.itch.io'), true);
check('host: lookalike', mod.isItchioHost('notitch.example'), false);
check('shorten on garbage', mod.shortenItchioUrl('not a url'), null);
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
