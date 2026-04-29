const path = require('path');
const {
  shortenRedditUrl,
  needsShortening,
  isRedditHost,
  isPostUrl,
} = require(path.join('..', 'src', 'reddit.js'));

const CASES = [
  { name: 'comments: utm tracking stripped',
    input: 'https://www.reddit.com/r/javascript/comments/abc123/some_post_title/?utm_source=share&utm_medium=web2x&context=3',
    expected: 'https://www.reddit.com/r/javascript/comments/abc123/some_post_title/' },
  { name: 'comments: individual comment link',
    input: 'https://www.reddit.com/r/javascript/comments/abc123/some_post_title/cmnt12/?utm_source=share',
    expected: 'https://www.reddit.com/r/javascript/comments/abc123/some_post_title/cmnt12/' },
  { name: 'comments: post-id only (no slug)',
    input: 'https://www.reddit.com/r/javascript/comments/abc123/?utm_source=share',
    expected: 'https://www.reddit.com/r/javascript/comments/abc123/' },
  { name: 'old.reddit.com preserved',
    input: 'https://old.reddit.com/r/javascript/comments/abc123/title/?utm_source=share',
    expected: 'https://old.reddit.com/r/javascript/comments/abc123/title/' },
  { name: 'np.reddit.com preserved',
    input: 'https://np.reddit.com/r/javascript/comments/abc123/title/?utm_source=share',
    expected: 'https://np.reddit.com/r/javascript/comments/abc123/title/' },
  { name: '/r/<sub>/s/<short> form',
    input: 'https://www.reddit.com/r/javascript/s/AbCdEf/?utm_source=share',
    expected: 'https://www.reddit.com/r/javascript/s/AbCdEf/' },
  { name: 'redd.it short',
    input: 'https://redd.it/abc123/?utm_source=share',
    expected: 'https://redd.it/abc123/' },
  { name: 'hash dropped',
    input: 'https://www.reddit.com/r/javascript/comments/abc123/title/#anchor',
    expected: 'https://www.reddit.com/r/javascript/comments/abc123/title/' },
  { name: 'already clean',
    input: 'https://www.reddit.com/r/javascript/comments/abc123/title/',
    expected: 'https://www.reddit.com/r/javascript/comments/abc123/title/',
    expectedNeeds: false },
  { name: 'subreddit home → null',
    input: 'https://www.reddit.com/r/javascript',
    expected: null },
  { name: 'home → null',
    input: 'https://www.reddit.com/',
    expected: null },
  { name: 'user profile → null',
    input: 'https://www.reddit.com/user/janedoe/',
    expected: null },
  { name: 'non-Reddit → null',
    input: 'https://www.google.com/?q=reddit',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenRedditUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isRedditHost: reddit.com', isRedditHost('reddit.com'), true);
check('isRedditHost: old.reddit.com', isRedditHost('old.reddit.com'), true);
check('isRedditHost: redd.it', isRedditHost('redd.it'), true);
check('isRedditHost: np.reddit.com', isRedditHost('np.reddit.com'), true);
check('isRedditHost: redditclone.com', isRedditHost('redditclone.com'), false);
check('isPostUrl: comments path', isPostUrl('https://www.reddit.com/r/x/comments/abc/title/'), true);
check('isPostUrl: subreddit home', isPostUrl('https://www.reddit.com/r/x'), false);
check('shorten on garbage', shortenRedditUrl('not a url'), null);
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
