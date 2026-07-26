// Unit tests for src/mediafire.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenMediafireUrl, needsShortening, isMediafireHost, isPostUrl } =
  require(path.join('..', 'src', 'mediafire.js'));

const CASES = [
  { name: 'path kept, utm stripped',
    input: 'https://www.mediafire.com/file/abc123/name/file?utm_source=share&fbclid=z',
    expected: 'https://www.mediafire.com/file/abc123/name/file' },
  { name: 'already clean',
    input: 'https://www.mediafire.com/file/abc123/name/file',
    expected: 'https://www.mediafire.com/file/abc123/name/file',
    expectedNeeds: false },
  { name: 'hash preserved',
    input: 'https://www.mediafire.com/file/abc123/name/file?utm_source=x#section',
    expected: 'https://www.mediafire.com/file/abc123/name/file#section' },
  { name: 'lookalike host -> null',
    input: 'https://notmediafire.com/file/abc123/name/file?utm_source=x',
    expected: null },
  { name: 'mediafire.com.evil.com -> null',
    input: 'https://mediafire.com.evil.com/file/abc123/name/file?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) { if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); } }
for (const c of CASES) {
  check('shorten - ' + c.name, shortenMediafireUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isMediafireHost: www.mediafire.com', isMediafireHost('www.mediafire.com'), true);
check('isMediafireHost: notmediafire.com', isMediafireHost('notmediafire.com'), false);
check('isMediafireHost: mediafire.com.evil.com', isMediafireHost('mediafire.com.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://www.mediafire.com/file/abc123/name/file?utm_source=x'), true);
check('shorten on garbage', shortenMediafireUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
