const path = require('path');
const mod = require(path.join('..', 'src', 'yahoojp.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'already clean',
    input: 'https://search.yahoo.co.jp/search?p=%E5%A4%A9%E6%B0%97',
    expected: 'https://search.yahoo.co.jp/search?p=%E5%A4%A9%E6%B0%97', expectedNeeds: false },
  { name: 'junk stripped',
    input: 'https://search.yahoo.co.jp/search?p=%E5%A4%A9%E6%B0%97&utm_source=share&gclid=abc&cjevent=xyz&fr=top_ga1_sa&fr2=sb-top',
    expected: 'https://search.yahoo.co.jp/search?p=%E5%A4%A9%E6%B0%97' },
  { name: 'lookalike -> null',
    input: 'https://notyahoo.co.jp/search?p=%E5%A4%A9%E6%B0%97?utm_source=a', expected: null },
  { name: 'fr/fr2 attribution stripped, query kept',
    input: 'https://search.yahoo.co.jp/search?p=%E5%A4%A9%E6%B0%97&fr=top_ga1_sa&fr2=sb-top',
    expected: 'https://search.yahoo.co.jp/search?p=%E5%A4%A9%E6%B0%97' },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenYahoojpUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: primary', mod.isYahoojpHost('search.yahoo.co.jp'), true);
check('host: lookalike', mod.isYahoojpHost('notyahoo.co.jp'), false);
check('shorten on garbage', mod.shortenYahoojpUrl('not a url'), null);
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
