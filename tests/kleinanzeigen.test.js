const path = require('path');
const {
  shortenKleinanzeigenUrl,
  needsShortening,
  isKleinanzeigenHost,
  isPostUrl,
} = require(path.join('..', 'src', 'kleinanzeigen.js'));

const VALID_HOST = 'www.kleinanzeigen.de';

const CASES = [
  { name: 'ad already clean',
    input: 'https://www.kleinanzeigen.de/s-anzeige/gazelle-herrenfahrrad/2621234567-217-3331',
    expected: 'https://www.kleinanzeigen.de/s-anzeige/gazelle-herrenfahrrad/2621234567-217-3331',
    expectedNeeds: false },
  { name: 'utm stripped',
    input: 'https://www.kleinanzeigen.de/s-anzeige/gazelle-herrenfahrrad/2621234567-217-3331?utm_source=copyToPasteboard&utm_campaign=socialbuttons',
    expected: 'https://www.kleinanzeigen.de/s-anzeige/gazelle-herrenfahrrad/2621234567-217-3331' },
  { name: 'hash preserved',
    input: 'https://www.kleinanzeigen.de/s-anzeige/x/1-2-3?utm_source=a#bilder',
    expected: 'https://www.kleinanzeigen.de/s-anzeige/x/1-2-3#bilder' },
  { name: 'category list → null',
    input: 'https://www.kleinanzeigen.de/s-fahrraeder/c217',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://notkleinanzeigen.de/s-anzeige/x/1-2-3',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenKleinanzeigenUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('host: valid', isKleinanzeigenHost(VALID_HOST), true);
check('host: lookalike suffix', isKleinanzeigenHost(VALID_HOST + '.evil.com'), false);
check('shorten on garbage', shortenKleinanzeigenUrl('not a url'), null);
check('needs on garbage', needsShortening('not a url'), false);

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
