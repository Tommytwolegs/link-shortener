// Unit tests for src/zillow.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenZillowUrl, needsShortening, isZillowHost, isPostUrl } =
  require(path.join('..', 'src', 'zillow.js'));

const CASES = [
  { name: 'homedetails: zpid path kept, utm + fbclid stripped',
    input: 'https://www.zillow.com/homedetails/123-Main-St-Anytown/12345678_zpid/?utm_source=share&fbclid=z',
    expected: 'https://www.zillow.com/homedetails/123-Main-St-Anytown/12345678_zpid/' },
  { name: 'homedetails: already clean',
    input: 'https://www.zillow.com/homedetails/123-Main-St/12345678_zpid/',
    expected: 'https://www.zillow.com/homedetails/123-Main-St/12345678_zpid/',
    expectedNeeds: false },
  { name: 'homes search: functional filters kept, utm stripped',
    input: 'https://www.zillow.com/homes/for_sale/Seattle-WA/?searchQueryState=abc&utm_medium=x',
    expected: 'https://www.zillow.com/homes/for_sale/Seattle-WA/?searchQueryState=abc' },
  { name: 'hash preserved',
    input: 'https://www.zillow.com/homedetails/x/1_zpid/?utm_source=x#gallery',
    expected: 'https://www.zillow.com/homedetails/x/1_zpid/#gallery' },
  { name: 'lookalike → null',
    input: 'https://notzillow.com/homedetails/x/1_zpid/?utm_source=x',
    expected: null },
  { name: 'zillow.com.evil.com → null',
    input: 'https://zillow.com.evil.com/homedetails/x/1_zpid/?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  check('shorten - ' + c.name, shortenZillowUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isZillowHost: www.zillow.com', isZillowHost('www.zillow.com'), true);
check('isZillowHost: notzillow.com', isZillowHost('notzillow.com'), false);
check('isZillowHost: zillow.com.evil.com', isZillowHost('zillow.com.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://www.zillow.com/homedetails/x/1_zpid/?utm_source=x'), true);
check('shorten on garbage', shortenZillowUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
