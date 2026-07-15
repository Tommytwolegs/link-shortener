const path = require('path');
const mod = require(path.join('..', 'src', 'researchgate.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'publication already clean',
    input: 'https://www.researchgate.net/publication/123456789_Some_Paper_Title',
    expected: 'https://www.researchgate.net/publication/123456789_Some_Paper_Title', expectedNeeds: false },
  { name: 'email enrichment blobs stripped',
    input: 'https://www.researchgate.net/publication/123456789_Some_Paper_Title?enrichId=rgreq-abc123&enrichSource=Y292ZXJQYWdlOzEyMzQ1Njc4OTtBUzo5ODc2NTQzMjE%3D&_sg=stuvwx',
    expected: 'https://www.researchgate.net/publication/123456789_Some_Paper_Title' },
  { name: 'ev + origin attribution stripped',
    input: 'https://www.researchgate.net/profile/Jane-Doe?ev=hdr_xprf&origin=publication_detail',
    expected: 'https://www.researchgate.net/profile/Jane-Doe' },
  { name: 'lookalike -> null',
    input: 'https://researchgate.net.evil.example/publication/1?ev=a', expected: null },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenResearchgateUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: researchgate.net', mod.isResearchgateHost('www.researchgate.net'), true);
check('host: lookalike', mod.isResearchgateHost('myresearchgate.net'), false);
check('shorten on garbage', mod.shortenResearchgateUrl('not a url'), null);
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
