// Unit tests for src/stockx.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenStockxUrl, needsShortening, isStockxHost, isPostUrl } =
  require(path.join('..', 'src', 'stockx.js'));

const CASES = [
  { name: 'product: size KEPT (functional), utm stripped',
    input: 'https://stockx.com/air-jordan-1-high?size=10&utm_source=x',
    expected: 'https://stockx.com/air-jordan-1-high?size=10' },
  { name: 'product: clean path unchanged',
    input: 'https://stockx.com/air-jordan-1-high',
    expected: 'https://stockx.com/air-jordan-1-high',
    expectedNeeds: false },
  { name: 'product: size clean → unchanged',
    input: 'https://stockx.com/air-jordan-1-high?size=10',
    expected: 'https://stockx.com/air-jordan-1-high?size=10',
    expectedNeeds: false },
  { name: 'hash preserved',
    input: 'https://stockx.com/x?utm_source=x#bids',
    expected: 'https://stockx.com/x#bids' },
  { name: 'lookalike → null',
    input: 'https://notstockx.com/x?utm_source=x',
    expected: null },
  { name: 'stockx.com.evil.com → null',
    input: 'https://stockx.com.evil.com/x?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) { if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); } }
for (const c of CASES) {
  check('shorten - ' + c.name, shortenStockxUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isStockxHost: stockx.com', isStockxHost('stockx.com'), true);
check('isStockxHost: notstockx.com', isStockxHost('notstockx.com'), false);
check('isStockxHost: stockx.com.evil.com', isStockxHost('stockx.com.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://stockx.com/x?utm_source=x'), true);
check('isPostUrl: only size false (functional)', isPostUrl('https://stockx.com/x?size=10'), false);
check('shorten on garbage', shortenStockxUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
