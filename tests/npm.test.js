// Unit tests for src/npm.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenNpmUrl, needsShortening, isNpmHost, isPostUrl } =
  require(path.join('..', 'src', 'npm.js'));

const CASES = [
  { name: 'path kept, utm stripped',
    input: 'https://npmjs.com/package/react?utm_source=share&fbclid=z',
    expected: 'https://npmjs.com/package/react' },
  { name: 'already clean',
    input: 'https://npmjs.com/package/react',
    expected: 'https://npmjs.com/package/react',
    expectedNeeds: false },
  { name: 'hash (line anchor) preserved',
    input: 'https://npmjs.com/package/react?utm_source=x#L10-L20',
    expected: 'https://npmjs.com/package/react#L10-L20' },
  { name: 'lookalike host -> null',
    input: 'https://notnpmjs.com/package/react?utm_source=x',
    expected: null },
  { name: 'npmjs.com.evil.com -> null',
    input: 'https://npmjs.com.evil.com/package/react?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) { if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); } }
for (const c of CASES) {
  check('shorten - ' + c.name, shortenNpmUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isNpmHost: npmjs.com', isNpmHost('npmjs.com'), true);
check('isNpmHost: notnpmjs.com', isNpmHost('notnpmjs.com'), false);
check('isNpmHost: npmjs.com.evil.com', isNpmHost('npmjs.com.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://npmjs.com/package/react?utm_source=x'), true);
check('shorten on garbage', shortenNpmUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
