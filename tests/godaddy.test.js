const path = require('path');
const mod = require(path.join('..', 'src', 'godaddy.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'already clean',
    input: 'https://www.godaddy.com/domains/domain-name-search',
    expected: 'https://www.godaddy.com/domains/domain-name-search', expectedNeeds: false },
  { name: 'itc internal tracking stripped',
    input: 'https://www.godaddy.com/offers/domains?itc=mya_prd_lnk&utm_source=email',
    expected: 'https://www.godaddy.com/offers/domains' },
  { name: 'isc promo code SURVIVES (functional, costs money to lose)',
    input: 'https://www.godaddy.com/domains?isc=CJCSAVE30&itc=slbc_dom',
    expected: 'https://www.godaddy.com/domains?isc=CJCSAVE30' },
  { name: 'plid reseller storefront SURVIVES (pricing context)',
    input: 'https://www.godaddy.com/domains?plid=1234',
    expected: 'https://www.godaddy.com/domains?plid=1234', expectedNeeds: false },
  { name: 'lookalike -> null',
    input: 'https://godaddy.example.com/domains?itc=a', expected: null },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenGodaddyUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: godaddy.com', mod.isGodaddyHost('www.godaddy.com'), true);
check('host: lookalike', mod.isGodaddyHost('nogodaddy.com'), false);
check('shorten on garbage', mod.shortenGodaddyUrl('not a url'), null);
check('needs on garbage', mod.needsShortening('not a url'), false);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { console.log('\nFailures:'); for (const f of failures) { console.log('  - ' + f.label); console.log('      expected: ' + JSON.stringify(f.expected)); console.log('      actual:   ' + JSON.stringify(f.actual)); } process.exit(1); }
