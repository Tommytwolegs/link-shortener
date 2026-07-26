// Unit tests for src/deezer.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenDeezerUrl, needsShortening, isDeezerHost, isPostUrl } =
  require(path.join('..', 'src', 'deezer.js'));

const CASES = [
  { name: 'path kept, utm + fbclid stripped',
    input: 'https://www.deezer.com/en/track/12345?utm_source=share&fbclid=zzz',
    expected: 'https://www.deezer.com/en/track/12345' },
  { name: 'already clean',
    input: 'https://www.deezer.com/en/track/12345',
    expected: 'https://www.deezer.com/en/track/12345',
    expectedNeeds: false },
  { name: 'hash preserved',
    input: 'https://www.deezer.com/en/track/12345?utm_source=x#section',
    expected: 'https://www.deezer.com/en/track/12345#section' },
  { name: 'lookalike host -> null',
    input: 'https://notdeezer.com/en/track/12345?utm_source=x',
    expected: null },
  { name: 'deezer.com.evil.com -> null',
    input: 'https://deezer.com.evil.com/en/track/12345?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) { if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); } }
for (const c of CASES) {
  check('shorten - ' + c.name, shortenDeezerUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isDeezerHost: www.deezer.com', isDeezerHost('www.deezer.com'), true);
check('isDeezerHost: notdeezer.com', isDeezerHost('notdeezer.com'), false);
check('isDeezerHost: deezer.com.evil.com', isDeezerHost('deezer.com.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://www.deezer.com/en/track/12345?utm_source=x'), true);
check('shorten on garbage', shortenDeezerUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
