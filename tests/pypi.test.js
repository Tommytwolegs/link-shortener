// Unit tests for src/pypi.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenPypiUrl, needsShortening, isPypiHost, isPostUrl } =
  require(path.join('..', 'src', 'pypi.js'));

const CASES = [
  { name: 'path kept, utm stripped',
    input: 'https://pypi.org/project/requests/?utm_source=share&fbclid=z',
    expected: 'https://pypi.org/project/requests/' },
  { name: 'already clean',
    input: 'https://pypi.org/project/requests/',
    expected: 'https://pypi.org/project/requests/',
    expectedNeeds: false },
  { name: 'hash (line anchor) preserved',
    input: 'https://pypi.org/project/requests/?utm_source=x#L10-L20',
    expected: 'https://pypi.org/project/requests/#L10-L20' },
  { name: 'lookalike host -> null',
    input: 'https://notpypi.org/project/requests/?utm_source=x',
    expected: null },
  { name: 'pypi.org.evil.com -> null',
    input: 'https://pypi.org.evil.com/project/requests/?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) { if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); } }
for (const c of CASES) {
  check('shorten - ' + c.name, shortenPypiUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isPypiHost: pypi.org', isPypiHost('pypi.org'), true);
check('isPypiHost: notpypi.org', isPypiHost('notpypi.org'), false);
check('isPypiHost: pypi.org.evil.com', isPypiHost('pypi.org.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://pypi.org/project/requests/?utm_source=x'), true);
check('shorten on garbage', shortenPypiUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
