const path = require('path');
const mod = require(path.join('..', 'src', 'parcels.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'already clean',
    input: 'https://www.ups.com/track?tracknum=1Z999AA10123456784',
    expected: 'https://www.ups.com/track?tracknum=1Z999AA10123456784', expectedNeeds: false },
  { name: 'utm + ad-click junk stripped',
    input: 'https://www.ups.com/track?tracknum=1Z999AA10123456784&utm_source=share&gclid=abc&fbclid=IwAR1&cjevent=xyz',
    expected: 'https://www.ups.com/track?tracknum=1Z999AA10123456784' },
  { name: 'lookalike -> null',
    input: 'https://notups.com/track?tracknum=1Z999AA10123456784&utm_source=a', expected: null },
  { name: 'UPS tracknum survives, email junk goes',
    input: 'https://www.ups.com/track?tracknum=1Z999AA10123456784&utm_source=email&WT.mc_id=EM123',
    expected: 'https://www.ups.com/track?tracknum=1Z999AA10123456784' },
  { name: 'FedEx trknbr survives',
    input: 'https://www.fedex.com/fedextrack/?trknbr=123456789012&utm_campaign=shipalert',
    expected: 'https://www.fedex.com/fedextrack/?trknbr=123456789012' },
  { name: 'USPS tLabels survives',
    input: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400100000000000000000&utm_medium=email',
    expected: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400100000000000000000' },
  { name: 'DHL tracking-id survives',
    input: 'https://www.dhl.com/us-en/home/tracking.html?tracking-id=1234567890&utm_source=track_mail',
    expected: 'https://www.dhl.com/us-en/home/tracking.html?tracking-id=1234567890' },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenParcelsUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: primary', mod.isParcelsHost('www.ups.com'), true);
check('host: lookalike', mod.isParcelsHost('notups.com'), false);
check('shorten on garbage', mod.shortenParcelsUrl('not a url'), null);
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
