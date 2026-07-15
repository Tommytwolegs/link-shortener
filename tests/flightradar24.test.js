const path = require('path');
const mod = require(path.join('..', 'src', 'flightradar24.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
function run(cases) {
  for (const c of cases) {
    check('shorten - ' + c.name, mod.shortenFlightradarUrl(c.input), c.expected);
    let expectedNeeds;
    if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
    else if (c.expected === null) expectedNeeds = false;
    else expectedNeeds = c.input !== c.expected;
    check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
  }
}

run([
  { name: 'selected flight already clean',
    input: 'https://www.flightradar24.com/UAL123/39a4c2f1',
    expected: 'https://www.flightradar24.com/UAL123/39a4c2f1',
    expectedNeeds: false },
  { name: 'data page already clean',
    input: 'https://www.flightradar24.com/data/flights/ua123',
    expected: 'https://www.flightradar24.com/data/flights/ua123',
    expectedNeeds: false },
  { name: 'share junk stripped',
    input: 'https://www.flightradar24.com/UAL123/39a4c2f1?utm_source=share&utm_medium=link',
    expected: 'https://www.flightradar24.com/UAL123/39a4c2f1' },
  { name: 'fr24.com shortcut host covered',
    input: 'https://fr24.com/UAL123?fbclid=abc',
    expected: 'https://fr24.com/UAL123' },
  { name: 'map-state hash preserved',
    input: 'https://www.flightradar24.com/UAL123/39a4c2f1?utm_source=x#37.62,-122.38,9',
    expected: 'https://www.flightradar24.com/UAL123/39a4c2f1#37.62,-122.38,9' },
  { name: 'lookalike -> null',
    input: 'https://myfr24.example.com/UAL123?utm_source=a',
    expected: null },
]);
check('isFlightradarHost: flightradar24.com', mod.isFlightradarHost('www.flightradar24.com'), true);
check('isFlightradarHost: fr24.com', mod.isFlightradarHost('fr24.com'), true);
check('isFlightradarHost: lookalike', mod.isFlightradarHost('flightradar24.example.com'), false);
check('shorten on garbage', mod.shortenFlightradarUrl('not a url'), null);

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
