// Unit tests for src/gitlab.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenGitlabUrl, needsShortening, isGitlabHost, isPostUrl } =
  require(path.join('..', 'src', 'gitlab.js'));

const CASES = [
  { name: 'path kept, utm stripped',
    input: 'https://gitlab.com/group/project/-/issues/42?utm_source=share&fbclid=z',
    expected: 'https://gitlab.com/group/project/-/issues/42' },
  { name: 'already clean',
    input: 'https://gitlab.com/group/project/-/issues/42',
    expected: 'https://gitlab.com/group/project/-/issues/42',
    expectedNeeds: false },
  { name: 'hash (line anchor) preserved',
    input: 'https://gitlab.com/group/project/-/issues/42?utm_source=x#L10-L20',
    expected: 'https://gitlab.com/group/project/-/issues/42#L10-L20' },
  { name: 'lookalike host -> null',
    input: 'https://notgitlab.com/group/project/-/issues/42?utm_source=x',
    expected: null },
  { name: 'gitlab.com.evil.com -> null',
    input: 'https://gitlab.com.evil.com/group/project/-/issues/42?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) { if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); } }
for (const c of CASES) {
  check('shorten - ' + c.name, shortenGitlabUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isGitlabHost: gitlab.com', isGitlabHost('gitlab.com'), true);
check('isGitlabHost: notgitlab.com', isGitlabHost('notgitlab.com'), false);
check('isGitlabHost: gitlab.com.evil.com', isGitlabHost('gitlab.com.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://gitlab.com/group/project/-/issues/42?utm_source=x'), true);
check('shorten on garbage', shortenGitlabUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
