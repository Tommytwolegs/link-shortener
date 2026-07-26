// Unit tests for src/box.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenBoxUrl, needsShortening, isBoxHost, isPostUrl } =
  require(path.join('..', 'src', 'box.js'));

const CASES = [
  { name: 'path kept, utm stripped',
    input: 'https://www.box.com/s/abc123sharedid?utm_source=share&fbclid=z',
    expected: 'https://www.box.com/s/abc123sharedid' },
  { name: 'already clean',
    input: 'https://www.box.com/s/abc123sharedid',
    expected: 'https://www.box.com/s/abc123sharedid',
    expectedNeeds: false },
  { name: 'hash preserved',
    input: 'https://www.box.com/s/abc123sharedid?utm_source=x#section',
    expected: 'https://www.box.com/s/abc123sharedid#section' },
  { name: 'lookalike host -> null',
    input: 'https://notbox.com/s/abc123sharedid?utm_source=x',
    expected: null },
  { name: 'box.com.evil.com -> null',
    input: 'https://box.com.evil.com/s/abc123sharedid?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) { if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); } }
for (const c of CASES) {
  check('shorten - ' + c.name, shortenBoxUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isBoxHost: www.box.com', isBoxHost('www.box.com'), true);
check('isBoxHost: notbox.com', isBoxHost('notbox.com'), false);
check('isBoxHost: box.com.evil.com', isBoxHost('box.com.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://www.box.com/s/abc123sharedid?utm_source=x'), true);
check('shorten on garbage', shortenBoxUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
