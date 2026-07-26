// Unit tests for src/dropbox.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenDropboxUrl, needsShortening, isDropboxHost, isPostUrl } =
  require(path.join('..', 'src', 'dropbox.js'));

const CASES = [
  { name: 'scl/fi: rlkey + dl KEPT, st stripped',
    input: 'https://www.dropbox.com/scl/fi/abc123/report.pdf?rlkey=xyzkey&st=trk99&dl=0',
    expected: 'https://www.dropbox.com/scl/fi/abc123/report.pdf?rlkey=xyzkey&dl=0' },
  { name: 'scl/fi: already clean (rlkey + dl, no st)',
    input: 'https://www.dropbox.com/scl/fi/abc123/report.pdf?rlkey=xyzkey&dl=0',
    expected: 'https://www.dropbox.com/scl/fi/abc123/report.pdf?rlkey=xyzkey&dl=0',
    expectedNeeds: false },
  { name: 'scl/fi: st + utm stripped, rlkey kept',
    input: 'https://www.dropbox.com/scl/fi/abc123/x.png?rlkey=k&st=t&utm_source=share',
    expected: 'https://www.dropbox.com/scl/fi/abc123/x.png?rlkey=k' },
  { name: 'legacy /s/ form: dl kept, utm stripped',
    input: 'https://www.dropbox.com/s/abc123/file.zip?dl=1&utm_medium=x',
    expected: 'https://www.dropbox.com/s/abc123/file.zip?dl=1' },
  { name: 'hash preserved',
    input: 'https://www.dropbox.com/scl/fi/a/x?rlkey=k&st=t#page=2',
    expected: 'https://www.dropbox.com/scl/fi/a/x?rlkey=k#page=2' },
  { name: 'lookalike host → null',
    input: 'https://notdropbox.com/scl/fi/a/x?rlkey=k&st=t',
    expected: null },
  { name: 'dropbox.com.evil.com → null',
    input: 'https://dropbox.com.evil.com/scl/fi/a/x?st=t',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) { if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); } }
for (const c of CASES) {
  check('shorten - ' + c.name, shortenDropboxUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isDropboxHost: www.dropbox.com', isDropboxHost('www.dropbox.com'), true);
check('isDropboxHost: notdropbox.com', isDropboxHost('notdropbox.com'), false);
check('isDropboxHost: dropbox.com.evil.com', isDropboxHost('dropbox.com.evil.com'), false);
check('isPostUrl: st present true', isPostUrl('https://www.dropbox.com/scl/fi/a/x?rlkey=k&st=t'), true);
check('isPostUrl: only rlkey+dl false (clean)', isPostUrl('https://www.dropbox.com/scl/fi/a/x?rlkey=k&dl=0'), false);
check('shorten on garbage', shortenDropboxUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
