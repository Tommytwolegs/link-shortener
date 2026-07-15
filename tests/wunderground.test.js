const path = require('path');
const mod = require(path.join('..', 'src', 'wunderground.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'already clean',
    input: 'https://www.wunderground.com/forecast/us/ny/new-york-city',
    expected: 'https://www.wunderground.com/forecast/us/ny/new-york-city', expectedNeeds: false },
  { name: 'utm + ad-click junk stripped',
    input: 'https://www.wunderground.com/forecast/us/ny/new-york-city?utm_source=share&gclid=abc&fbclid=IwAR1&cjevent=xyz',
    expected: 'https://www.wunderground.com/forecast/us/ny/new-york-city' },
  { name: 'lookalike -> null',
    input: 'https://notwunderground.com/forecast/us/ny/new-york-city?utm_source=a', expected: null },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenWundergroundUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: primary', mod.isWundergroundHost('www.wunderground.com'), true);
check('host: lookalike', mod.isWundergroundHost('notwunderground.com'), false);
check('shorten on garbage', mod.shortenWundergroundUrl('not a url'), null);
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
