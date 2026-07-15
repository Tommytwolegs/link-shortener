const path = require('path');
const mod = require(path.join('..', 'src', 'eventbrite.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'event already clean',
    input: 'https://www.eventbrite.com/e/example-conf-tickets-123456789012',
    expected: 'https://www.eventbrite.com/e/example-conf-tickets-123456789012', expectedNeeds: false },
  { name: 'aff share attribution stripped',
    input: 'https://www.eventbrite.com/e/example-conf-tickets-123456789012?aff=ebdssbdestsearch&utm_campaign=social',
    expected: 'https://www.eventbrite.com/e/example-conf-tickets-123456789012' },
  { name: 'discount code SURVIVES (functional)',
    input: 'https://www.eventbrite.com/e/example-conf-tickets-123456789012?discount=EARLYBIRD&aff=odcleoeventsincollection',
    expected: 'https://www.eventbrite.com/e/example-conf-tickets-123456789012?discount=EARLYBIRD' },
  { name: 'ccTLD covered',
    input: 'https://www.eventbrite.co.uk/e/london-meetup-tickets-987654321?aff=erelexpmlt',
    expected: 'https://www.eventbrite.co.uk/e/london-meetup-tickets-987654321' },
  { name: 'lookalike -> null',
    input: 'https://eventbrite.example.com/e/x?aff=a', expected: null },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenEventbriteUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: eventbrite.com', mod.isEventbriteHost('www.eventbrite.com'), true);
check('host: eventbrite.co.uk', mod.isEventbriteHost('www.eventbrite.co.uk'), true);
check('host: lookalike', mod.isEventbriteHost('noteventbrite.com'), false);
check('shorten on garbage', mod.shortenEventbriteUrl('not a url'), null);
check('needs on garbage', mod.needsShortening('not a url'), false);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { console.log('\nFailures:'); for (const f of failures) { console.log('  - ' + f.label); console.log('      expected: ' + JSON.stringify(f.expected)); console.log('      actual:   ' + JSON.stringify(f.actual)); } process.exit(1); }
