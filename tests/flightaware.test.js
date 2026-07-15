const path = require('path');
const mod = require(path.join('..', 'src', 'flightaware.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
function run(cases) {
  for (const c of cases) {
    check('shorten - ' + c.name, mod.shortenFlightawareUrl(c.input), c.expected);
    let expectedNeeds;
    if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
    else if (c.expected === null) expectedNeeds = false;
    else expectedNeeds = c.input !== c.expected;
    check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
  }
}

run([
  { name: 'live flight already clean',
    input: 'https://www.flightaware.com/live/flight/UAL123',
    expected: 'https://www.flightaware.com/live/flight/UAL123',
    expectedNeeds: false },
  { name: 'history path already clean',
    input: 'https://www.flightaware.com/live/flight/AAL2613/history/20260524/1953Z/KOMA/KDFW',
    expected: 'https://www.flightaware.com/live/flight/AAL2613/history/20260524/1953Z/KOMA/KDFW',
    expectedNeeds: false },
  { name: 'utm junk stripped from shared link',
    input: 'https://www.flightaware.com/live/flight/UAL123?utm_source=twitter&utm_medium=social',
    expected: 'https://www.flightaware.com/live/flight/UAL123' },
  { name: 'ad-click ids stripped',
    input: 'https://flightaware.com/live/flight/DAL456?gclid=abc&fbclid=def',
    expected: 'https://flightaware.com/live/flight/DAL456' },
  { name: 'functional query survives (flight finder)',
    input: 'https://www.flightaware.com/live/findflight?origin=KSFO&destination=KJFK&utm_campaign=x',
    expected: 'https://www.flightaware.com/live/findflight?origin=KSFO&destination=KJFK' },
  { name: 'lookalike -> null',
    input: 'https://flightaware.example.com/live/flight/UAL123?utm_source=a',
    expected: null },
]);
check('isFlightawareHost: flightaware.com', mod.isFlightawareHost('flightaware.com'), true);
check('isFlightawareHost: www', mod.isFlightawareHost('www.flightaware.com'), true);
check('isFlightawareHost: lookalike', mod.isFlightawareHost('notflightaware.com'), false);
check('shorten on garbage', mod.shortenFlightawareUrl('not a url'), null);

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
