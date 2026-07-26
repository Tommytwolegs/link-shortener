// Unit tests for src/dockerhub.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenDockerhubUrl, needsShortening, isDockerhubHost, isPostUrl } =
  require(path.join('..', 'src', 'dockerhub.js'));

const CASES = [
  { name: 'path kept, utm stripped',
    input: 'https://hub.docker.com/r/library/nginx?utm_source=share&fbclid=z',
    expected: 'https://hub.docker.com/r/library/nginx' },
  { name: 'already clean',
    input: 'https://hub.docker.com/r/library/nginx',
    expected: 'https://hub.docker.com/r/library/nginx',
    expectedNeeds: false },
  { name: 'hash (line anchor) preserved',
    input: 'https://hub.docker.com/r/library/nginx?utm_source=x#L10-L20',
    expected: 'https://hub.docker.com/r/library/nginx#L10-L20' },
  { name: 'lookalike host -> null',
    input: 'https://nothub.docker.com/r/library/nginx?utm_source=x',
    expected: null },
  { name: 'hub.docker.com.evil.com -> null',
    input: 'https://hub.docker.com.evil.com/r/library/nginx?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) { if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); } }
for (const c of CASES) {
  check('shorten - ' + c.name, shortenDockerhubUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isDockerhubHost: hub.docker.com', isDockerhubHost('hub.docker.com'), true);
check('isDockerhubHost: nothub.docker.com', isDockerhubHost('nothub.docker.com'), false);
check('isDockerhubHost: hub.docker.com.evil.com', isDockerhubHost('hub.docker.com.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://hub.docker.com/r/library/nginx?utm_source=x'), true);
check('shorten on garbage', shortenDockerhubUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
