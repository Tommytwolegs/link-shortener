const path = require('path');
const mod = require(path.join('..', 'src', 'kickstarter.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'already clean',
    input: 'https://www.kickstarter.com/projects/creator/cool-gadget',
    expected: 'https://www.kickstarter.com/projects/creator/cool-gadget', expectedNeeds: false },
  { name: 'utm + ad-click junk stripped',
    input: 'https://www.kickstarter.com/projects/creator/cool-gadget?utm_source=share&gclid=abc&fbclid=IwAR1&cjevent=xyz',
    expected: 'https://www.kickstarter.com/projects/creator/cool-gadget' },
  { name: 'lookalike -> null',
    input: 'https://notkickstarter.com/projects/creator/cool-gadget?utm_source=a', expected: null },
  { name: 'ref= referral stripped',
    input: 'https://www.kickstarter.com/projects/creator/cool-gadget?ref=discovery_category_newest',
    expected: 'https://www.kickstarter.com/projects/creator/cool-gadget' },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenKickstarterUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: primary', mod.isKickstarterHost('www.kickstarter.com'), true);
check('host: lookalike', mod.isKickstarterHost('notkickstarter.com'), false);
check('shorten on garbage', mod.shortenKickstarterUrl('not a url'), null);
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
