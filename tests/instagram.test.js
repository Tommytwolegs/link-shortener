// Unit tests for src/instagram.js — runnable with plain Node, no dependencies.
//
// Usage: node tests/instagram.test.js

const path = require('path');
const {
  shortenInstagramUrl,
  needsShortening,
  isInstagramHost,
  isPostUrl,
} = require(path.join('..', 'src', 'instagram.js'));

const CASES = [
  // Profile / non-post paths — host-scoped fallback denylist strips IG's
  // own share junk while leaving functional params alone.
  { name: 'profile: igshid stripped via fallback, hl kept',
    input: 'https://www.instagram.com/nike?igshid=ABC123&hl=en',
    expected: 'https://www.instagram.com/nike?hl=en' },
  { name: 'profile: igsh + utm_* stripped via fallback',
    input: 'https://www.instagram.com/nike?igsh=ZZ&utm_source=ig_web',
    expected: 'https://www.instagram.com/nike' },
  { name: 'explore tag: ig_rid stripped, clean path untouched',
    input: 'https://www.instagram.com/explore/tags/coffee/?ig_rid=99',
    expected: 'https://www.instagram.com/explore/tags/coffee/' },
  { name: 'profile: already clean → no change',
    input: 'https://www.instagram.com/nike',
    expected: 'https://www.instagram.com/nike',
    expectedNeeds: false },
  // /p/<shortcode>
  { name: 'p: igsh stripped',
    input: 'https://www.instagram.com/p/ABC123/?igsh=ZbWKwL',
    expected: 'https://www.instagram.com/p/ABC123/' },
  { name: 'p: utm tracking stripped',
    input: 'https://www.instagram.com/p/ABC123/?utm_source=ig_web_copy_link&utm_medium=share',
    expected: 'https://www.instagram.com/p/ABC123/' },
  { name: 'p: img_index preserved (carousel slide), tracking stripped',
    input: 'https://www.instagram.com/p/ABC123/?img_index=2&igsh=Y',
    expected: 'https://www.instagram.com/p/ABC123/?img_index=2' },
  { name: 'p: img_index alone preserved',
    input: 'https://www.instagram.com/p/ABC123/?img_index=3',
    expected: 'https://www.instagram.com/p/ABC123/?img_index=3' },
  { name: 'reel: img_index preserved',
    input: 'https://www.instagram.com/reel/ABC123/?img_index=2&utm_source=foo',
    expected: 'https://www.instagram.com/reel/ABC123/?img_index=2' },
  { name: 'p: empty img_index stripped',
    input: 'https://www.instagram.com/p/ABC123/?img_index=&igsh=Y',
    expected: 'https://www.instagram.com/p/ABC123/' },
  { name: 'p: hash preserved alongside tracking strip',
    input: 'https://www.instagram.com/p/ABC123/?igsh=Y#comments',
    expected: 'https://www.instagram.com/p/ABC123/#comments' },
  { name: 'p: hash preserved when already clean',
    input: 'https://www.instagram.com/p/ABC123/#comments',
    expected: 'https://www.instagram.com/p/ABC123/#comments',
    expectedNeeds: false },
  { name: 'p: trailing slash absent → preserved as-is',
    input: 'https://www.instagram.com/p/ABC123?igsh=Y',
    expected: 'https://www.instagram.com/p/ABC123' },
  { name: 'p: already clean',
    input: 'https://www.instagram.com/p/ABC123/',
    expected: 'https://www.instagram.com/p/ABC123/',
    expectedNeeds: false },

  // /reel/<shortcode>
  { name: 'reel: tracking stripped',
    input: 'https://www.instagram.com/reel/ABC123/?utm_source=ig_web_copy_link',
    expected: 'https://www.instagram.com/reel/ABC123/' },
  { name: 'reel: igshid stripped',
    input: 'https://www.instagram.com/reel/ABC123/?igshid=MzRlODBiNWFlZA%3D%3D',
    expected: 'https://www.instagram.com/reel/ABC123/' },

  // /reels/<shortcode>
  { name: 'reels: tracking stripped',
    input: 'https://www.instagram.com/reels/ABC123/?igsh=Y',
    expected: 'https://www.instagram.com/reels/ABC123/' },

  // /tv/<shortcode>
  { name: 'tv: tracking stripped',
    input: 'https://www.instagram.com/tv/ABC123/?igsh=Y',
    expected: 'https://www.instagram.com/tv/ABC123/' },

  // /stories/<user>/<id>
  { name: 'stories: tracking stripped',
    input: 'https://www.instagram.com/stories/janedoe/1234567890/?igsh=Y',
    expected: 'https://www.instagram.com/stories/janedoe/1234567890/' },
  { name: 'stories: hyphenated username',
    input: 'https://www.instagram.com/stories/jane-doe_42/1234567890/?igsh=Y',
    expected: 'https://www.instagram.com/stories/jane-doe_42/1234567890/' },

  // Non-post pages on instagram.com
  // Non-post instagram.com paths: fallback denylist runs (strips IG share
  // junk) but leaves clean paths byte-identical.
  { name: 'home page: unchanged',
    input: 'https://www.instagram.com/',
    expected: 'https://www.instagram.com/' },
  { name: 'profile page: unchanged when clean',
    input: 'https://www.instagram.com/janedoe/',
    expected: 'https://www.instagram.com/janedoe/' },
  { name: 'profile page no slash: unchanged when clean',
    input: 'https://www.instagram.com/janedoe',
    expected: 'https://www.instagram.com/janedoe' },
  { name: 'explore: igsh stripped via fallback',
    input: 'https://www.instagram.com/explore/?igsh=Y',
    expected: 'https://www.instagram.com/explore/' },
  { name: 'direct messages: unchanged',
    input: 'https://www.instagram.com/direct/inbox/',
    expected: 'https://www.instagram.com/direct/inbox/' },
  { name: 'reel index page (no shortcode): unchanged',
    input: 'https://www.instagram.com/reel/',
    expected: 'https://www.instagram.com/reel/' },

  // Non-Instagram hosts
  { name: 'facebook.com → null',
    input: 'https://www.facebook.com/p/ABC123',
    expected: null },
  { name: 'imitation host → null',
    input: 'https://instagram-clone.com/p/ABC123/',
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
  const got = shortenInstagramUrl(c.input);
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

check('isInstagramHost: www.instagram.com', isInstagramHost('www.instagram.com'), true);
check('isInstagramHost: instagram.com', isInstagramHost('instagram.com'), true);
check('isInstagramHost: m.instagram.com', isInstagramHost('m.instagram.com'), true);
check('isInstagramHost: instagram-clone.com', isInstagramHost('instagram-clone.com'), false);
check('isInstagramHost: empty', isInstagramHost(''), false);

check('isPostUrl: post URL true',
  isPostUrl('https://www.instagram.com/p/ABC/'), true);
check('isPostUrl: profile URL false',
  isPostUrl('https://www.instagram.com/janedoe/'), false);

check('shorten on garbage string', shortenInstagramUrl('not a url'), null);
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
