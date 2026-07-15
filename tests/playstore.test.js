const path = require('path');
const mod = require(path.join('..', 'src', 'playstore.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'already clean',
    input: 'https://play.google.com/store/apps/details?id=com.example.app',
    expected: 'https://play.google.com/store/apps/details?id=com.example.app', expectedNeeds: false },
  { name: 'utm + ad-click junk stripped',
    input: 'https://play.google.com/store/apps/details?id=com.example.app&utm_source=share&gclid=abc&fbclid=IwAR1&cjevent=xyz',
    expected: 'https://play.google.com/store/apps/details?id=com.example.app' },
  { name: 'lookalike -> null',
    input: 'https://plays.google.com.example/store/apps/details?id=com.example.app&utm_source=a', expected: null },
  { name: 'id survives, referrer/pcampaignid stripped',
    input: 'https://play.google.com/store/apps/details?id=com.example.app&referrer=utm_source%3Dblog&pcampaignid=web_share',
    expected: 'https://play.google.com/store/apps/details?id=com.example.app' },
  { name: 'hl locale survives',
    input: 'https://play.google.com/store/apps/details?id=com.example.app&hl=de&gclid=abc',
    expected: 'https://play.google.com/store/apps/details?id=com.example.app&hl=de' },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenPlaystoreUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: primary', mod.isPlaystoreHost('play.google.com'), true);
check('host: lookalike', mod.isPlaystoreHost('plays.google.com.example'), false);
check('shorten on garbage', mod.shortenPlaystoreUrl('not a url'), null);
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
