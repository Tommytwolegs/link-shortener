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
  // /p/<shortcode>
  { name: 'p: igsh stripped',
    input: 'https://www.instagram.com/p/ABC123/?igsh=ZbWKwL',
    expected: 'https://www.instagram.com/p/ABC123/' },
  { name: 'p: utm tracking stripped',
    input: 'https://www.instagram.com/p/ABC123/?utm_source=ig_web_copy_link&utm_medium=share',
    expected: 'https://www.instagram.com/p/ABC123/' },
  { name: 'p: img_index stripped (carousel slide)',
    input: 'https://www.instagram.com/p/ABC123/?img_index=2&igsh=Y',
    expected: 'https://www.instagram.com/p/ABC123/' },
  { name: 'p: hash dropped',
    input: 'https://www.instagram.com/p/ABC123/?igsh=Y#comments',
    expected: 'https://www.instagram.com/p/ABC123/' },
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
  { name: 'home page → null',
    input: 'https://www.instagram.com/',
    expected: null },
  { name: 'profile page → null',
    input: 'https://www.instagram.com/janedoe/',
    expected: null },
  { name: 'profile page no slash → null',
    input: 'https://www.instagram.com/janedoe',
    expected: null },
  { name: 'explore → null',
    input: 'https://www.instagram.com/explore/?igsh=Y',
    expected: null },
  { name: 'direct messages → null',
    input: 'https://www.instagram.com/direct/inbox/',
    expected: null },
  { name: 'reel index page (no shortcode) → null',
    input: 'https://www.instagram.com/reel/',
    expected: null },

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
