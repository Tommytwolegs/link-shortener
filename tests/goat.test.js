// Unit tests for src/goat.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenGoatUrl, needsShortening, isGoatHost, isPostUrl } =
  require(path.join('..', 'src', 'goat.js'));

const CASES = [
  { name: 'sneakers: path kept, utm stripped',
    input: 'https://www.goat.com/sneakers/air-max-90-abc?utm_medium=x',
    expected: 'https://www.goat.com/sneakers/air-max-90-abc' },
  { name: 'apparel: already clean',
    input: 'https://www.goat.com/apparel/hoodie-abc',
    expected: 'https://www.goat.com/apparel/hoodie-abc',
    expectedNeeds: false },
  { name: 'hash preserved',
    input: 'https://www.goat.com/sneakers/x?utm_source=x#reviews',
    expected: 'https://www.goat.com/sneakers/x#reviews' },
  { name: 'lookalike → null',
    input: 'https://notgoat.com/sneakers/x?utm_source=x',
    expected: null },
  { name: 'goat.com.evil.com → null',
    input: 'https://goat.com.evil.com/sneakers/x?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) { if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); } }
for (const c of CASES) {
  check('shorten - ' + c.name, shortenGoatUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isGoatHost: www.goat.com', isGoatHost('www.goat.com'), true);
check('isGoatHost: notgoat.com', isGoatHost('notgoat.com'), false);
check('isGoatHost: goat.com.evil.com', isGoatHost('goat.com.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://www.goat.com/sneakers/x?utm_source=x'), true);
check('shorten on garbage', shortenGoatUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
