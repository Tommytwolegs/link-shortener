const path = require('path');
const {
  shortenRedditUrl,
  needsShortening,
  isRedditHost,
  isPostUrl,
} = require(path.join('..', 'src', 'reddit.js'));

const CASES = [
  // ----- User-profile front pages (keep sort/timeframe).
  { name: 'user profile: share junk stripped',
    input: 'https://www.reddit.com/user/spez/?utm_source=share&utm_medium=web2x',
    expected: 'https://www.reddit.com/user/spez/' },
  { name: 'user profile: sort + t kept',
    input: 'https://www.reddit.com/user/spez/?sort=top&t=year&utm_source=share',
    expected: 'https://www.reddit.com/user/spez/?t=year&sort=top' },
  { name: 'user profile /u/ short form cleaned',
    input: 'https://www.reddit.com/u/spez?share_id=abc123',
    expected: 'https://www.reddit.com/u/spez' },
  { name: 'user profile tab (submitted) cleaned',
    input: 'https://www.reddit.com/user/spez/submitted/?sort=top&utm_source=share',
    expected: 'https://www.reddit.com/user/spez/submitted/?sort=top' },
  // (output order note: keepParams emit in ['t','sort'] order, matching the
  // subreddit front-page behavior)
  { name: 'user profile already clean',
    input: 'https://www.reddit.com/user/spez/',
    expected: 'https://www.reddit.com/user/spez/',
    expectedNeeds: false },
  // ----- Post-style URLs (full strip).
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

  // ----- User-profile post permalinks (previously unrecognized).
  { name: '/user/<u>/comments/<id>/<slug>/ stripped',
    input: 'https://www.reddit.com/user/janedoe/comments/abc123/title/?utm_source=share',
    expected: 'https://www.reddit.com/user/janedoe/comments/abc123/title/' },
  { name: '/u/<u>/comments/<id>/<slug>/ short form stripped',
    input: 'https://www.reddit.com/u/janedoe/comments/abc123/title/?utm_source=share',
    expected: 'https://www.reddit.com/u/janedoe/comments/abc123/title/' },

  // ----- Subreddit front pages (previously left untouched).
  { name: 'subreddit home: tracking stripped',
    input: 'https://www.reddit.com/r/javascript/?utm_source=news_alert&utm_campaign=foo',
    expected: 'https://www.reddit.com/r/javascript/' },
  { name: 'subreddit home with /top/ sort and ?t=week kept',
    input: 'https://www.reddit.com/r/javascript/top/?t=week&utm_source=share',
    expected: 'https://www.reddit.com/r/javascript/top/?t=week' },
  { name: 'subreddit home with /controversial/ sort and ?t=all kept',
    input: 'https://www.reddit.com/r/javascript/controversial/?t=all',
    expected: 'https://www.reddit.com/r/javascript/controversial/?t=all',
    expectedNeeds: false },
  { name: 'subreddit home with ?sort=new kept',
    input: 'https://www.reddit.com/r/javascript/?sort=new&utm_source=foo',
    expected: 'https://www.reddit.com/r/javascript/?sort=new' },
  { name: 'subreddit home /new/ already clean',
    input: 'https://www.reddit.com/r/javascript/new/',
    expected: 'https://www.reddit.com/r/javascript/new/',
    expectedNeeds: false },
  { name: 'subreddit home no trailing slash works',
    input: 'https://www.reddit.com/r/javascript?utm_source=foo',
    expected: 'https://www.reddit.com/r/javascript' },

  // ----- Hash preservation (defensive consistency).
  { name: 'hash preserved on post URL',
    input: 'https://www.reddit.com/r/javascript/comments/abc123/title/#anchor',
    expected: 'https://www.reddit.com/r/javascript/comments/abc123/title/#anchor',
    expectedNeeds: false },
  { name: 'hash preserved on subreddit home',
    input: 'https://www.reddit.com/r/javascript/?utm_source=foo#stickied',
    expected: 'https://www.reddit.com/r/javascript/#stickied' },

  { name: 'already clean',
    input: 'https://www.reddit.com/r/javascript/comments/abc123/title/',
    expected: 'https://www.reddit.com/r/javascript/comments/abc123/title/',
    expectedNeeds: false },
  { name: 'home → null',
    input: 'https://www.reddit.com/',
    expected: null },
  { name: 'user profile now recognized (front page, no params)',
    input: 'https://www.reddit.com/user/janedoe/',
    expected: 'https://www.reddit.com/user/janedoe/',
    expectedNeeds: false },
  { name: 'non-Reddit → null',
    input: 'https://www.google.com/?q=reddit',
    expected: null },

  // v1.7.0+ context= on comment permalinks. Controls how many parent
  // comments are shown above the linked one. Sub/post URLs still strip it.
  { name: 'comment permalink: ?context=10 preserved',
    input: 'https://www.reddit.com/r/javascript/comments/abc123/some_post_title/cid456/?context=10',
    expected: 'https://www.reddit.com/r/javascript/comments/abc123/some_post_title/cid456/?context=10' },
  { name: 'comment permalink: ?context=3 preserved, utm stripped',
    input: 'https://www.reddit.com/r/javascript/comments/abc123/some_post_title/cid456/?context=3&utm_source=share',
    expected: 'https://www.reddit.com/r/javascript/comments/abc123/some_post_title/cid456/?context=3' },
  { name: 'post permalink (no comment id): context still stripped',
    input: 'https://www.reddit.com/r/javascript/comments/abc123/some_post_title/?context=3',
    expected: 'https://www.reddit.com/r/javascript/comments/abc123/some_post_title/' },
  { name: 'user-profile comment permalink: ?context= preserved',
    input: 'https://www.reddit.com/user/foo/comments/abc/some_title/cid456/?context=5',
    expected: 'https://www.reddit.com/user/foo/comments/abc/some_title/cid456/?context=5' },

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
