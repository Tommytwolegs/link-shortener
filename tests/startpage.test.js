const path = require('path');
const mod = require(path.join('..', 'src', 'startpage.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'search already clean',
    input: 'https://www.startpage.com/sp/search?query=privacy',
    expected: 'https://www.startpage.com/sp/search?query=privacy', expectedNeeds: false },
  { name: 'segment/sourceid partner attribution stripped',
    input: 'https://www.startpage.com/sp/search?query=privacy&segment=startpage.brave&sourceid=brave',
    expected: 'https://www.startpage.com/sp/search?query=privacy' },
  { name: 'sc anti-abuse token deliberately kept',
    input: 'https://www.startpage.com/sp/search?query=x&sc=abCDeF12gh34',
    expected: 'https://www.startpage.com/sp/search?query=x&sc=abCDeF12gh34', expectedNeeds: false },
  { name: 'lookalike -> null',
    input: 'https://startpage.example.com/sp/search?segment=a', expected: null },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenStartpageUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: startpage.com', mod.isStartpageHost('www.startpage.com'), true);
check('host: lookalike', mod.isStartpageHost('mystartpage.com'), false);
check('shorten on garbage', mod.shortenStartpageUrl('not a url'), null);
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
