// Unit tests for src/facebook.js — runnable with plain Node, no dependencies.
//
// Usage: node tests/facebook.test.js

const path = require('path');
const {
  shortenFacebookUrl,
  needsShortening,
  isFacebookHost,
  isPostUrl,
} = require(path.join('..', 'src', 'facebook.js'));

const CASES = [
  // /<user>/posts/<id>
  { name: 'posts: pfbid with mibextid stripped',
    input: 'https://www.facebook.com/jane.doe/posts/pfbid0XYZabc?mibextid=ZbWKwL',
    expected: 'https://www.facebook.com/jane.doe/posts/pfbid0XYZabc' },
  { name: 'posts: __cft__ + __tn__ stripped',
    input: 'https://www.facebook.com/jane.doe/posts/pfbid0XYZ?__cft__%5B0%5D=AAA&__tn__=R&ref=embed_post',
    expected: 'https://www.facebook.com/jane.doe/posts/pfbid0XYZ' },
  { name: 'posts: trailing slash preserved',
    input: 'https://www.facebook.com/SomePage/posts/pfbid0ABC/?ref=share',
    expected: 'https://www.facebook.com/SomePage/posts/pfbid0ABC/' },
  { name: 'posts: numeric legacy ID',
    input: 'https://www.facebook.com/jane.doe/posts/123456789012345?ref=share',
    expected: 'https://www.facebook.com/jane.doe/posts/123456789012345' },
  { name: 'posts: mobile m.facebook.com',
    input: 'https://m.facebook.com/jane.doe/posts/pfbid0ABC?_rdr&mibextid=Y',
    expected: 'https://m.facebook.com/jane.doe/posts/pfbid0ABC' },
  { name: 'posts: hash dropped',
    input: 'https://www.facebook.com/jane.doe/posts/pfbid0ABC?mibextid=Y#comments',
    expected: 'https://www.facebook.com/jane.doe/posts/pfbid0ABC' },
  { name: 'posts: already clean',
    input: 'https://www.facebook.com/jane.doe/posts/pfbid0ABC',
    expected: 'https://www.facebook.com/jane.doe/posts/pfbid0ABC',
    expectedNeeds: false },

  // /share/<kind>/<id>
  { name: 'share/p: cleans tracking',
    input: 'https://www.facebook.com/share/p/abc123/?mibextid=ZbWKwL',
    expected: 'https://www.facebook.com/share/p/abc123/' },
  { name: 'share/v',
    input: 'https://www.facebook.com/share/v/XYZ/?mibextid=ZbWKwL&_rdr',
    expected: 'https://www.facebook.com/share/v/XYZ/' },
  { name: 'share/r',
    input: 'https://www.facebook.com/share/r/abc/?mibextid=Y',
    expected: 'https://www.facebook.com/share/r/abc/' },

  // /reel/<id>
  { name: 'reel: tracking stripped',
    input: 'https://www.facebook.com/reel/123456789?fs=e&s=TIeQ9V',
    expected: 'https://www.facebook.com/reel/123456789' },

  // /groups/.../posts/...
  { name: 'group post: cleans tracking',
    input: 'https://www.facebook.com/groups/12345/posts/67890?reactionType=LIKE&__cft__%5B0%5D=AAA',
    expected: 'https://www.facebook.com/groups/12345/posts/67890' },

  // /watch
  { name: 'watch: keeps v=, drops everything else',
    input: 'https://www.facebook.com/watch?v=1234567890&ref=sharing&t=12s',
    expected: 'https://www.facebook.com/watch?v=1234567890' },
  { name: 'watch: no v param → not a recognized post',
    input: 'https://www.facebook.com/watch/?ref=sharing',
    expected: null },

  // /photo.php
  { name: 'photo.php: keeps fbid + set',
    input: 'https://www.facebook.com/photo.php?fbid=123&set=a.456&type=3&theater&_rdr',
    expected: 'https://www.facebook.com/photo.php?fbid=123&set=a.456' },
  { name: 'photo.php: keeps fbid only when set absent',
    input: 'https://www.facebook.com/photo.php?fbid=123&type=3',
    expected: 'https://www.facebook.com/photo.php?fbid=123' },

  // /permalink.php
  { name: 'permalink.php: keeps story_fbid + id',
    input: 'https://www.facebook.com/permalink.php?story_fbid=12345&id=67890&__tn__=K-R',
    expected: 'https://www.facebook.com/permalink.php?story_fbid=12345&id=67890' },

  // fb.watch
  { name: 'fb.watch: short share URL cleans tracking',
    input: 'https://fb.watch/abc123/?mibextid=Y',
    expected: 'https://fb.watch/abc123/' },
  { name: 'fb.watch: already clean',
    input: 'https://fb.watch/abc123/',
    expected: 'https://fb.watch/abc123/',
    expectedNeeds: false },

  // Non-post pages on facebook.com
  { name: 'feed/home page → null',
    input: 'https://www.facebook.com/',
    expected: null },
  { name: 'profile page → null',
    input: 'https://www.facebook.com/jane.doe',
    expected: null },
  { name: 'profile with trailing slash → null',
    input: 'https://www.facebook.com/jane.doe/',
    expected: null },
  { name: 'marketplace → null',
    input: 'https://www.facebook.com/marketplace/item/12345/?ref=share',
    expected: null },
  { name: 'login → null',
    input: 'https://www.facebook.com/login.php?next=https%3A%2F%2Fwww.facebook.com',
    expected: null },

  // Non-Facebook hosts
  { name: 'google.com → null',
    input: 'https://www.google.com/search?q=facebook',
    expected: null },
];

let passed = 0;
let failed = 0;
const failures = [];

function check(label, actual, expected) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    failures.push({ label, actual, expected });
  }
}

for (const c of CASES) {
  const got = shortenFacebookUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) {
    expectedNeeds = c.expectedNeeds;
  } else if (c.expected === null) {
    expectedNeeds = false;
  } else {
    expectedNeeds = c.input !== c.expected;
  }
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}

check('isFacebookHost: www.facebook.com', isFacebookHost('www.facebook.com'), true);
check('isFacebookHost: m.facebook.com', isFacebookHost('m.facebook.com'), true);
check('isFacebookHost: fb.watch', isFacebookHost('fb.watch'), true);
check('isFacebookHost: facebook-clone.com', isFacebookHost('facebook-clone.com'), false);
check('isFacebookHost: not-fb.watch', isFacebookHost('not-fb.watch'), false);
check('isFacebookHost: empty', isFacebookHost(''), false);

check('isPostUrl: post URL true',
  isPostUrl('https://www.facebook.com/jane/posts/pfbid0X'), true);
check('isPostUrl: home URL false',
  isPostUrl('https://www.facebook.com/'), false);

check('shorten on garbage string', shortenFacebookUrl('not a url'), null);
check('needs on garbage string', needsShortening('not a url'), false);

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
