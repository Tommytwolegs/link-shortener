// Unit tests for src/discogs.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenDiscogsUrl, needsShortening, isDiscogsHost, isPostUrl } =
  require(path.join('..', 'src', 'discogs.js'));

const CASES = [
  { name: 'path kept, utm + fbclid stripped',
    input: 'https://www.discogs.com/release/12345-Artist-Title?utm_source=share&fbclid=zzz',
    expected: 'https://www.discogs.com/release/12345-Artist-Title' },
  { name: 'already clean',
    input: 'https://www.discogs.com/release/12345-Artist-Title',
    expected: 'https://www.discogs.com/release/12345-Artist-Title',
    expectedNeeds: false },
  { name: 'hash preserved',
    input: 'https://www.discogs.com/release/12345-Artist-Title?utm_source=x#section',
    expected: 'https://www.discogs.com/release/12345-Artist-Title#section' },
  { name: 'lookalike host -> null',
    input: 'https://notdiscogs.com/release/12345-Artist-Title?utm_source=x',
    expected: null },
  { name: 'discogs.com.evil.com -> null',
    input: 'https://discogs.com.evil.com/release/12345-Artist-Title?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) { if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); } }
for (const c of CASES) {
  check('shorten - ' + c.name, shortenDiscogsUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isDiscogsHost: www.discogs.com', isDiscogsHost('www.discogs.com'), true);
check('isDiscogsHost: notdiscogs.com', isDiscogsHost('notdiscogs.com'), false);
check('isDiscogsHost: discogs.com.evil.com', isDiscogsHost('discogs.com.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://www.discogs.com/release/12345-Artist-Title?utm_source=x'), true);
check('shorten on garbage', shortenDiscogsUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
