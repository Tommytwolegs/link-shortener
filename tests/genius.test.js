// Unit tests for src/genius.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenGeniusUrl, needsShortening, isGeniusHost, isPostUrl } =
  require(path.join('..', 'src', 'genius.js'));

const CASES = [
  { name: 'path kept, utm + fbclid stripped',
    input: 'https://www.genius.com/artist-song-lyrics?utm_source=share&fbclid=zzz',
    expected: 'https://www.genius.com/artist-song-lyrics' },
  { name: 'already clean',
    input: 'https://www.genius.com/artist-song-lyrics',
    expected: 'https://www.genius.com/artist-song-lyrics',
    expectedNeeds: false },
  { name: 'hash preserved',
    input: 'https://www.genius.com/artist-song-lyrics?utm_source=x#section',
    expected: 'https://www.genius.com/artist-song-lyrics#section' },
  { name: 'lookalike host -> null',
    input: 'https://notgenius.com/artist-song-lyrics?utm_source=x',
    expected: null },
  { name: 'genius.com.evil.com -> null',
    input: 'https://genius.com.evil.com/artist-song-lyrics?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) { if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); } }
for (const c of CASES) {
  check('shorten - ' + c.name, shortenGeniusUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isGeniusHost: www.genius.com', isGeniusHost('www.genius.com'), true);
check('isGeniusHost: notgenius.com', isGeniusHost('notgenius.com'), false);
check('isGeniusHost: genius.com.evil.com', isGeniusHost('genius.com.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://www.genius.com/artist-song-lyrics?utm_source=x'), true);
check('shorten on garbage', shortenGeniusUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
