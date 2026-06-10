const path = require('path');
const {
  shortenBlueskyUrl,
  needsShortening,
  isBlueskyHost,
  isPostUrl,
} = require(path.join('..', 'src', 'bluesky.js'));

const CASES = [
  // Canonical
  { name: 'post already clean',
    input: 'https://bsky.app/profile/user.bsky.social/post/3kabc123xyz',
    expected: 'https://bsky.app/profile/user.bsky.social/post/3kabc123xyz',
    expectedNeeds: false },
  { name: 'domain handle post already clean',
    input: 'https://bsky.app/profile/example.com/post/3kabc123xyz',
    expected: 'https://bsky.app/profile/example.com/post/3kabc123xyz',
    expectedNeeds: false },
  { name: 'DID handle post already clean',
    input: 'https://bsky.app/profile/did:plc:abc123def456/post/3kabc123xyz',
    expected: 'https://bsky.app/profile/did:plc:abc123def456/post/3kabc123xyz',
    expectedNeeds: false },

  // Tracking strip
  { name: 'ref_src stripped',
    input: 'https://bsky.app/profile/user.bsky.social/post/3kabc123xyz?ref_src=embed',
    expected: 'https://bsky.app/profile/user.bsky.social/post/3kabc123xyz' },
  { name: 'ref_src + ref_url stripped',
    input: 'https://bsky.app/profile/user.bsky.social/post/3kabc123xyz?ref_src=embed&ref_url=https%3A%2F%2Fexample.com',
    expected: 'https://bsky.app/profile/user.bsky.social/post/3kabc123xyz' },
  { name: 'utm params stripped',
    input: 'https://bsky.app/profile/user.bsky.social/post/3kabc123xyz?utm_source=share&utm_medium=web',
    expected: 'https://bsky.app/profile/user.bsky.social/post/3kabc123xyz' },

  // Other recognized forms
  { name: 'custom feed cleaned',
    input: 'https://bsky.app/profile/user.bsky.social/feed/aaabbbccc?ref_src=share',
    expected: 'https://bsky.app/profile/user.bsky.social/feed/aaabbbccc' },
  { name: 'starter pack cleaned',
    input: 'https://bsky.app/starter-pack/user.bsky.social/3kstarter?utm_source=share',
    expected: 'https://bsky.app/starter-pack/user.bsky.social/3kstarter' },

  // Hash preservation
  { name: 'hash preserved',
    input: 'https://bsky.app/profile/user.bsky.social/post/3kabc123xyz?ref_src=embed#section',
    expected: 'https://bsky.app/profile/user.bsky.social/post/3kabc123xyz#section' },

  // Not posts
  { name: 'profile page → null',
    input: 'https://bsky.app/profile/user.bsky.social',
    expected: null },
  { name: 'feed home → null',
    input: 'https://bsky.app/feeds',
    expected: null },
  { name: 'search → null',
    input: 'https://bsky.app/search?q=hello',
    expected: null },
  { name: 'settings → null',
    input: 'https://bsky.app/settings',
    expected: null },

  // Non-Bluesky
  { name: 'lookalike host → null',
    input: 'https://notbsky.app/profile/user/post/123',
    expected: null },
  { name: 'subdomain → null (only bsky.app itself)',
    input: 'https://staging.bsky.app/profile/user/post/123',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenBlueskyUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isBlueskyHost: bsky.app', isBlueskyHost('bsky.app'), true);
check('isBlueskyHost: BSKY.APP', isBlueskyHost('BSKY.APP'), true);
check('isBlueskyHost: bsky.social', isBlueskyHost('bsky.social'), false);
check('isBlueskyHost: notbsky.app', isBlueskyHost('notbsky.app'), false);
check('isPostUrl: post', isPostUrl('https://bsky.app/profile/u.bsky.social/post/3k'), true);
check('isPostUrl: profile', isPostUrl('https://bsky.app/profile/u.bsky.social'), false);
check('shorten on garbage', shortenBlueskyUrl('not a url'), null);
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
