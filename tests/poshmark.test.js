// Unit tests for src/poshmark.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenPoshmarkUrl, needsShortening, isPoshmarkHost, isPostUrl } =
  require(path.join('..', 'src', 'poshmark.js'));

const CASES = [
  { name: 'listing: path kept, utm + campaign stripped',
    input: 'https://poshmark.com/listing/Nike-Shoes-abc123?utm_source=share&campaign=x',
    expected: 'https://poshmark.com/listing/Nike-Shoes-abc123' },
  { name: 'listing: already clean',
    input: 'https://poshmark.com/listing/Nike-Shoes-abc123',
    expected: 'https://poshmark.com/listing/Nike-Shoes-abc123',
    expectedNeeds: false },
  { name: 'hash preserved',
    input: 'https://poshmark.com/listing/x-1?utm_source=x#photos',
    expected: 'https://poshmark.com/listing/x-1#photos' },
  { name: 'lookalike → null',
    input: 'https://notposhmark.com/listing/x-1?utm_source=x',
    expected: null },
  { name: 'poshmark.com.evil.com → null',
    input: 'https://poshmark.com.evil.com/listing/x-1?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) { if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); } }
for (const c of CASES) {
  check('shorten - ' + c.name, shortenPoshmarkUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isPoshmarkHost: poshmark.com', isPoshmarkHost('poshmark.com'), true);
check('isPoshmarkHost: notposhmark.com', isPoshmarkHost('notposhmark.com'), false);
check('isPoshmarkHost: poshmark.com.evil.com', isPoshmarkHost('poshmark.com.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://poshmark.com/listing/x?utm_source=x'), true);
check('shorten on garbage', shortenPoshmarkUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
