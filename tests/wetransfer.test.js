// Unit tests for src/wetransfer.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenWetransferUrl, needsShortening, isWetransferHost, isPostUrl } =
  require(path.join('..', 'src', 'wetransfer.js'));

const CASES = [
  { name: 'path kept, utm stripped',
    input: 'https://www.wetransfer.com/downloads/aaa/bbb/ccc?utm_source=share&fbclid=z',
    expected: 'https://www.wetransfer.com/downloads/aaa/bbb/ccc' },
  { name: 'already clean',
    input: 'https://www.wetransfer.com/downloads/aaa/bbb/ccc',
    expected: 'https://www.wetransfer.com/downloads/aaa/bbb/ccc',
    expectedNeeds: false },
  { name: 'hash preserved',
    input: 'https://www.wetransfer.com/downloads/aaa/bbb/ccc?utm_source=x#section',
    expected: 'https://www.wetransfer.com/downloads/aaa/bbb/ccc#section' },
  { name: 'lookalike host -> null',
    input: 'https://notwetransfer.com/downloads/aaa/bbb/ccc?utm_source=x',
    expected: null },
  { name: 'wetransfer.com.evil.com -> null',
    input: 'https://wetransfer.com.evil.com/downloads/aaa/bbb/ccc?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) { if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); } }
for (const c of CASES) {
  check('shorten - ' + c.name, shortenWetransferUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isWetransferHost: www.wetransfer.com', isWetransferHost('www.wetransfer.com'), true);
check('isWetransferHost: notwetransfer.com', isWetransferHost('notwetransfer.com'), false);
check('isWetransferHost: wetransfer.com.evil.com', isWetransferHost('wetransfer.com.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://www.wetransfer.com/downloads/aaa/bbb/ccc?utm_source=x'), true);
check('shorten on garbage', shortenWetransferUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
