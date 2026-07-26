// Unit tests for src/rottentomatoes.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenRottentomatoesUrl, needsShortening, isRottentomatoesHost, isPostUrl } =
  require(path.join('..', 'src', 'rottentomatoes.js'));

const CASES = [
  { name: 'path kept, utm + cmp stripped',
    input: 'https://www.rottentomatoes.com/m/some_movie?utm_source=share&cmp=zzz',
    expected: 'https://www.rottentomatoes.com/m/some_movie' },
  { name: 'already clean',
    input: 'https://www.rottentomatoes.com/m/some_movie',
    expected: 'https://www.rottentomatoes.com/m/some_movie',
    expectedNeeds: false },
  { name: 'hash preserved',
    input: 'https://www.rottentomatoes.com/m/some_movie?utm_source=x#section',
    expected: 'https://www.rottentomatoes.com/m/some_movie#section' },
  { name: 'lookalike host -> null',
    input: 'https://notrottentomatoes.com/m/some_movie?utm_source=x',
    expected: null },
  { name: 'rottentomatoes.com.evil.com -> null',
    input: 'https://rottentomatoes.com.evil.com/m/some_movie?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) { if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); } }
for (const c of CASES) {
  check('shorten - ' + c.name, shortenRottentomatoesUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isRottentomatoesHost: www.rottentomatoes.com', isRottentomatoesHost('www.rottentomatoes.com'), true);
check('isRottentomatoesHost: notrottentomatoes.com', isRottentomatoesHost('notrottentomatoes.com'), false);
check('isRottentomatoesHost: rottentomatoes.com.evil.com', isRottentomatoesHost('rottentomatoes.com.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://www.rottentomatoes.com/m/some_movie?utm_source=x'), true);
check('shorten on garbage', shortenRottentomatoesUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
