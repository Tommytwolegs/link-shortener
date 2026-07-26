// Unit tests for src/bitbucket.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenBitbucketUrl, needsShortening, isBitbucketHost, isPostUrl } =
  require(path.join('..', 'src', 'bitbucket.js'));

const CASES = [
  { name: 'path kept, utm stripped',
    input: 'https://bitbucket.org/workspace/repo/pull-requests/7?utm_source=share&fbclid=z',
    expected: 'https://bitbucket.org/workspace/repo/pull-requests/7' },
  { name: 'already clean',
    input: 'https://bitbucket.org/workspace/repo/pull-requests/7',
    expected: 'https://bitbucket.org/workspace/repo/pull-requests/7',
    expectedNeeds: false },
  { name: 'hash (line anchor) preserved',
    input: 'https://bitbucket.org/workspace/repo/pull-requests/7?utm_source=x#L10-L20',
    expected: 'https://bitbucket.org/workspace/repo/pull-requests/7#L10-L20' },
  { name: 'lookalike host -> null',
    input: 'https://notbitbucket.org/workspace/repo/pull-requests/7?utm_source=x',
    expected: null },
  { name: 'bitbucket.org.evil.com -> null',
    input: 'https://bitbucket.org.evil.com/workspace/repo/pull-requests/7?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) { if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); } }
for (const c of CASES) {
  check('shorten - ' + c.name, shortenBitbucketUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isBitbucketHost: bitbucket.org', isBitbucketHost('bitbucket.org'), true);
check('isBitbucketHost: notbitbucket.org', isBitbucketHost('notbitbucket.org'), false);
check('isBitbucketHost: bitbucket.org.evil.com', isBitbucketHost('bitbucket.org.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://bitbucket.org/workspace/repo/pull-requests/7?utm_source=x'), true);
check('shorten on garbage', shortenBitbucketUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
