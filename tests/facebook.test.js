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
  { name: 'shared link junk: mibextid + __cft__ stripped via fallback',
    input: 'https://www.facebook.com/somepage?mibextid=Nif5oz&__cft__[0]=AZXbig&__tn__=-UC',
    expected: 'https://www.facebook.com/somepage' },
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
  { name: 'posts: hash preserved alongside tracking strip',
    input: 'https://www.facebook.com/jane.doe/posts/pfbid0ABC?mibextid=Y#comments',
    expected: 'https://www.facebook.com/jane.doe/posts/pfbid0ABC#comments' },
  { name: 'posts: hash preserved when already clean',
    input: 'https://www.facebook.com/jane.doe/posts/pfbid0ABC#comments',
    expected: 'https://www.facebook.com/jane.doe/posts/pfbid0ABC#comments',
    expectedNeeds: false },
  { name: 'posts: already clean',
    input: 'https://www.facebook.com/jane.doe/posts/pfbid0ABC',
    expected: 'https://www.facebook.com/jane.doe/posts/pfbid0ABC',
    expectedNeeds: false },

  // /<user>/videos/<id>
  { name: 'videos: tracking stripped',
    input: 'https://www.facebook.com/somepage/videos/1234567890?ref=share&__tn__=R',
    expected: 'https://www.facebook.com/somepage/videos/1234567890' },
  { name: 'videos: already clean',
    input: 'https://www.facebook.com/somepage/videos/1234567890',
    expected: 'https://www.facebook.com/somepage/videos/1234567890',
    expectedNeeds: false },
  { name: 'videos: hash preserved',
    input: 'https://www.facebook.com/somepage/videos/1234567890?ref=share#comments',
    expected: 'https://www.facebook.com/somepage/videos/1234567890#comments' },

  // /<user>/photos/<set>/<id>
  { name: 'photos: numeric set + photo id',
    input: 'https://www.facebook.com/jane.doe/photos/123456/789012/?type=3&theater=1',
    expected: 'https://www.facebook.com/jane.doe/photos/123456/789012/' },
  { name: 'photos: pcb. (posted-by) set prefix',
    input: 'https://www.facebook.com/jane.doe/photos/pcb.123/456?ref=share&__tn__=R',
    expected: 'https://www.facebook.com/jane.doe/photos/pcb.123/456' },
  { name: 'photos: index page (one segment) → null',
    input: 'https://www.facebook.com/jane.doe/photos/',
    expected: 'https://www.facebook.com/jane.doe/photos/',
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
  // /groups/<gid>/permalink/<id> — older form
  { name: 'group permalink: cleans tracking',
    input: 'https://www.facebook.com/groups/12345/permalink/67890/?notif_id=123&notif_t=group_activity',
    expected: 'https://www.facebook.com/groups/12345/permalink/67890/' },
  { name: 'group permalink: non-numeric id → null',
    input: 'https://www.facebook.com/groups/12345/permalink/about/',
    expected: 'https://www.facebook.com/groups/12345/permalink/about/',
    expectedNeeds: false },

  // /events/<id>
  { name: 'events: tracking stripped',
    input: 'https://www.facebook.com/events/1234567890/?event_action=invited&ref=newsfeed',
    expected: 'https://www.facebook.com/events/1234567890/' },
  { name: 'events: utm_source stripped via fallback',
    input: 'https://www.facebook.com/events/upcoming?utm_source=foo',
    expected: 'https://www.facebook.com/events/upcoming' },
  { name: 'events: navigational /events/discovery → null',
    input: 'https://www.facebook.com/events/discovery',
    expected: 'https://www.facebook.com/events/discovery',
    expectedNeeds: false },

  // /marketplace/item/<id>
  { name: 'marketplace: tracking stripped',
    input: 'https://www.facebook.com/marketplace/item/12345/?ref=share',
    expected: 'https://www.facebook.com/marketplace/item/12345/' },
  { name: 'marketplace: hash preserved',
    input: 'https://www.facebook.com/marketplace/item/12345/?ref=share#description',
    expected: 'https://www.facebook.com/marketplace/item/12345/#description' },
  { name: 'marketplace: category page → null',
    input: 'https://www.facebook.com/marketplace/category/vehicles',
    expected: 'https://www.facebook.com/marketplace/category/vehicles',
    expectedNeeds: false },

  // /watch
  { name: 'watch: keeps v=, drops everything else',
    input: 'https://www.facebook.com/watch?v=1234567890&ref=sharing&t=12s',
    expected: 'https://www.facebook.com/watch?v=1234567890' },
  { name: 'watch: no v param → not a recognized post',
    input: 'https://www.facebook.com/watch/?ref=sharing',
    expected: 'https://www.facebook.com/watch/?ref=sharing',
    expectedNeeds: false },

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
    expected: 'https://www.facebook.com/',
    expectedNeeds: false },
  { name: 'profile page → null',
    input: 'https://www.facebook.com/jane.doe',
    expected: 'https://www.facebook.com/jane.doe',
    expectedNeeds: false },
  { name: 'profile with trailing slash → null',
    input: 'https://www.facebook.com/jane.doe/',
    expected: 'https://www.facebook.com/jane.doe/',
    expectedNeeds: false },
  { name: 'login → null',
    input: 'https://www.facebook.com/login.php?next=https%3A%2F%2Fwww.facebook.com',
    expected: 'https://www.facebook.com/login.php?next=https%3A%2F%2Fwww.facebook.com',
    expectedNeeds: false },

  // Non-Facebook hosts
  { name: 'google.com → null',
    input: 'https://www.google.com/search?q=facebook',
    expected: null },

  // ----- v1.7.0+ comment_id / reply_comment_id deep-link preservation
  { name: '/posts/<id>: comment_id preserved',
    input: 'https://www.facebook.com/some.user/posts/pfbid0123abc?comment_id=987654321',
    expected: 'https://www.facebook.com/some.user/posts/pfbid0123abc?comment_id=987654321' },
  { name: '/posts/<id>: comment_id + reply_comment_id preserved, tracking stripped',
    input: 'https://www.facebook.com/some.user/posts/pfbid0123abc?comment_id=987&reply_comment_id=654&__tn__=R&__cft__[0]=AZ',
    expected: 'https://www.facebook.com/some.user/posts/pfbid0123abc?comment_id=987&reply_comment_id=654' },
  { name: '/videos/<id>: comment_id preserved',
    input: 'https://www.facebook.com/page/videos/123456/?comment_id=987',
    expected: 'https://www.facebook.com/page/videos/123456/?comment_id=987' },
  { name: '/reel/<id>: comment_id preserved',
    input: 'https://www.facebook.com/reel/12345?comment_id=987&__tn__=R',
    expected: 'https://www.facebook.com/reel/12345?comment_id=987' },
  { name: '/groups/<g>/posts/<id>: comment_id preserved',
    input: 'https://www.facebook.com/groups/foo/posts/12345?comment_id=987',
    expected: 'https://www.facebook.com/groups/foo/posts/12345?comment_id=987' },
  { name: '/photo.php?fbid: comment_id preserved alongside fbid/set',
    input: 'https://www.facebook.com/photo.php?fbid=12345&set=a.6789&comment_id=987&__tn__=R',
    expected: 'https://www.facebook.com/photo.php?fbid=12345&set=a.6789&comment_id=987' },
  { name: '/permalink.php: comment_id preserved alongside story_fbid/id',
    input: 'https://www.facebook.com/permalink.php?story_fbid=12345&id=6789&comment_id=987',
    expected: 'https://www.facebook.com/permalink.php?story_fbid=12345&id=6789&comment_id=987' },
  { name: '/watch/?v: comment_id preserved',
    input: 'https://www.facebook.com/watch/?v=12345&comment_id=987',
    expected: 'https://www.facebook.com/watch/?v=12345&comment_id=987' },

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
