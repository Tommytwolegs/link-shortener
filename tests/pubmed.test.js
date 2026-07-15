const path = require('path');
const mod = require(path.join('..', 'src', 'pubmed.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'article already clean',
    input: 'https://pubmed.ncbi.nlm.nih.gov/38412345/',
    expected: 'https://pubmed.ncbi.nlm.nih.gov/38412345/', expectedNeeds: false },
  { name: 'email-alert attribution stripped',
    input: 'https://pubmed.ncbi.nlm.nih.gov/38412345/?utm_source=Other&utm_campaign=pubmed-2&fc=20260101120000&ff=20260102',
    expected: 'https://pubmed.ncbi.nlm.nih.gov/38412345/' },
  { name: 'search term/sort survive',
    input: 'https://pubmed.ncbi.nlm.nih.gov/?term=crispr+delivery&sort=date&utm_medium=email',
    expected: 'https://pubmed.ncbi.nlm.nih.gov/?term=crispr+delivery&sort=date' },
  { name: 'otool institution affiliation kept',
    input: 'https://pubmed.ncbi.nlm.nih.gov/38412345/?otool=uniklib',
    expected: 'https://pubmed.ncbi.nlm.nih.gov/38412345/?otool=uniklib', expectedNeeds: false },
  { name: 'other ncbi hosts NOT covered',
    input: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC123/?utm_source=a', expected: null },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenPubmedUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: pubmed', mod.isPubmedHost('pubmed.ncbi.nlm.nih.gov'), true);
check('host: www.ncbi rejected', mod.isPubmedHost('www.ncbi.nlm.nih.gov'), false);
check('shorten on garbage', mod.shortenPubmedUrl('not a url'), null);
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
