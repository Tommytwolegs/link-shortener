const path = require('path');
const {
  shortenGithubUrl,
  needsShortening,
  isGithubHost,
  isPostUrl,
} = require(path.join('..', 'src', 'github.js'));

const CASES = [
  // Canonical
  { name: 'issue already clean',
    input: 'https://github.com/owner/repo/issues/123',
    expected: 'https://github.com/owner/repo/issues/123',
    expectedNeeds: false },
  { name: 'PR already clean',
    input: 'https://github.com/owner/repo/pull/4567',
    expected: 'https://github.com/owner/repo/pull/4567',
    expectedNeeds: false },

  // Tracking strip
  { name: 'notification_referrer_id stripped (issue)',
    input: 'https://github.com/owner/repo/issues/123?notification_referrer_id=NT_kwDOAbc123',
    expected: 'https://github.com/owner/repo/issues/123' },
  { name: 'notification params stripped (PR)',
    input: 'https://github.com/owner/repo/pull/4567?notification_referrer_id=NT_abc&notifications_query=is%3Aunread',
    expected: 'https://github.com/owner/repo/pull/4567' },
  { name: 'email_source stripped',
    input: 'https://github.com/owner/repo/issues/123?email_source=notifications&email_token=ABC123',
    expected: 'https://github.com/owner/repo/issues/123' },
  { name: 'discussion cleaned',
    input: 'https://github.com/owner/repo/discussions/89?notification_referrer_id=NT_x',
    expected: 'https://github.com/owner/repo/discussions/89' },
  { name: 'commit cleaned',
    input: 'https://github.com/owner/repo/commit/a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2?diff=split',
    expected: 'https://github.com/owner/repo/commit/a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2' },
  { name: 'short-sha commit cleaned',
    input: 'https://github.com/owner/repo/commit/a1b2c3d?utm_source=link',
    expected: 'https://github.com/owner/repo/commit/a1b2c3d' },
  { name: 'release tag cleaned',
    input: 'https://github.com/owner/repo/releases/tag/v1.2.3?notification_referrer_id=NT_x',
    expected: 'https://github.com/owner/repo/releases/tag/v1.2.3' },

  // Hash preservation — GitHub's deep links live in the hash
  { name: '#issuecomment anchor preserved',
    input: 'https://github.com/owner/repo/issues/123?notification_referrer_id=NT_x#issuecomment-987654321',
    expected: 'https://github.com/owner/repo/issues/123#issuecomment-987654321' },
  { name: '#discussion_r review-comment anchor preserved',
    input: 'https://github.com/owner/repo/pull/4567?notification_referrer_id=NT_x#discussion_r123456',
    expected: 'https://github.com/owner/repo/pull/4567#discussion_r123456' },

  // Functional-param routes intentionally NOT matched
  { name: 'repo home (?tab=) → null',
    input: 'https://github.com/owner/repo?tab=readme-ov-file',
    expected: null },
  { name: 'PR files view (?diff=split is functional) → null',
    input: 'https://github.com/owner/repo/pull/4567/files?diff=split',
    expected: null },
  { name: 'issue list (?q= is functional) → null',
    input: 'https://github.com/owner/repo/issues?q=is%3Aopen+label%3Abug',
    expected: null },
  { name: 'file view → null',
    input: 'https://github.com/owner/repo/blob/main/src/index.js?plain=1',
    expected: null },
  { name: 'releases list → null',
    input: 'https://github.com/owner/repo/releases',
    expected: null },
  { name: 'profile → null',
    input: 'https://github.com/someuser',
    expected: null },
  { name: 'commit with non-hex ref → null',
    input: 'https://github.com/owner/repo/commit/main',
    expected: null },

  // Non-GitHub
  { name: 'gist subdomain → null (different URL shapes)',
    input: 'https://gist.github.com/user/abc123?x=1',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://notgithub.com/owner/repo/issues/1?notification_referrer_id=x',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenGithubUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isGithubHost: github.com', isGithubHost('github.com'), true);
check('isGithubHost: www.github.com', isGithubHost('www.github.com'), true);
check('isGithubHost: gist.github.com', isGithubHost('gist.github.com'), false);
check('isGithubHost: api.github.com', isGithubHost('api.github.com'), false);
check('isPostUrl: issue', isPostUrl('https://github.com/o/r/issues/1'), true);
check('isPostUrl: repo home', isPostUrl('https://github.com/o/r'), false);
check('shorten on garbage', shortenGithubUrl('not a url'), null);
check('needs on garbage', needsShortening('not a url'), false);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log('  - ' + f.label);
    console.log('      expected: ' + JSON.stringify(f.expected));
    console.log('      actual:   ' + JSON.stringify(f.actual));
  }
  process.exit(1);
}
