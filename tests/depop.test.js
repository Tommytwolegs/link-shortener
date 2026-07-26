// Unit tests for src/depop.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenDepopUrl, needsShortening, isDepopHost, isPostUrl } =
  require(path.join('..', 'src', 'depop.js'));

const CASES = [
  { name: 'product: path kept, utm stripped',
    input: 'https://www.depop.com/products/user-cool-jacket/?utm_source=share',
    expected: 'https://www.depop.com/products/user-cool-jacket/' },
  { name: 'product: already clean',
    input: 'https://www.depop.com/products/user-cool-jacket/',
    expected: 'https://www.depop.com/products/user-cool-jacket/',
    expectedNeeds: false },
  { name: 'hash preserved',
    input: 'https://www.depop.com/products/x/?utm_source=x#desc',
    expected: 'https://www.depop.com/products/x/#desc' },
  { name: 'lookalike → null',
    input: 'https://notdepop.com/products/x/?utm_source=x',
    expected: null },
  { name: 'depop.com.evil.com → null',
    input: 'https://depop.com.evil.com/products/x/?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) { if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); } }
for (const c of CASES) {
  check('shorten - ' + c.name, shortenDepopUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isDepopHost: www.depop.com', isDepopHost('www.depop.com'), true);
check('isDepopHost: notdepop.com', isDepopHost('notdepop.com'), false);
check('isDepopHost: depop.com.evil.com', isDepopHost('depop.com.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://www.depop.com/products/x/?utm_source=x'), true);
check('shorten on garbage', shortenDepopUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
