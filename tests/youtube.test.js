const path = require('path');
const {
  shortenYoutubeUrl,
  needsShortening,
  isYoutubeHost,
  isPostUrl,
} = require(path.join('..', 'src', 'youtube.js'));

const CASES = [
  // /watch
  { name: 'watch: si stripped',
    input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=trackingblob',
    expected: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { name: 'watch: pp + feature stripped',
    input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&pp=ABC&feature=share',
    expected: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { name: 'watch: timestamp preserved',
    input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&si=X',
    expected: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s' },
  { name: 'watch: list dropped',
    input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLabc&index=1',
    expected: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { name: 'watch: utm_* dropped',
    input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&utm_source=newsletter',
    expected: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { name: 'watch: no v= → null',
    input: 'https://www.youtube.com/watch?si=X',
    expected: null },
  { name: 'watch: hash dropped',
    input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ#t=42',
    expected: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { name: 'watch: already clean',
    input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    expected: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    expectedNeeds: false },
  { name: 'watch: clean with t= already there',
    input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
    expected: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
    expectedNeeds: false },

  // m.youtube.com / music.youtube.com
  { name: 'mobile: m.youtube.com /watch',
    input: 'https://m.youtube.com/watch?v=ABC&si=X',
    expected: 'https://m.youtube.com/watch?v=ABC' },
  { name: 'music.youtube.com',
    input: 'https://music.youtube.com/watch?v=ABC&si=X',
    expected: 'https://music.youtube.com/watch?v=ABC' },

  // youtu.be
  { name: 'youtu.be: cleaned',
    input: 'https://youtu.be/dQw4w9WgXcQ?si=trackingblob',
    expected: 'https://youtu.be/dQw4w9WgXcQ' },
  { name: 'youtu.be: timestamp preserved',
    input: 'https://youtu.be/dQw4w9WgXcQ?t=42&si=trackingblob',
    expected: 'https://youtu.be/dQw4w9WgXcQ?t=42' },
  { name: 'youtu.be: already clean',
    input: 'https://youtu.be/dQw4w9WgXcQ',
    expected: 'https://youtu.be/dQw4w9WgXcQ',
    expectedNeeds: false },

  // /shorts
  { name: 'shorts: cleaned',
    input: 'https://www.youtube.com/shorts/abc123?si=trackingblob',
    expected: 'https://www.youtube.com/shorts/abc123' },
  { name: 'shorts: timestamp preserved',
    input: 'https://www.youtube.com/shorts/abc123?t=10&si=X',
    expected: 'https://www.youtube.com/shorts/abc123?t=10' },

  // /live
  { name: 'live: cleaned',
    input: 'https://www.youtube.com/live/livestreamID?si=X&feature=share',
    expected: 'https://www.youtube.com/live/livestreamID' },

  // /embed
  { name: 'embed: keeps t and start',
    input: 'https://www.youtube.com/embed/abc?start=10&autoplay=1&si=X',
    expected: 'https://www.youtube.com/embed/abc?start=10' },

  // /playlist
  { name: 'playlist: cleaned',
    input: 'https://www.youtube.com/playlist?list=PLabc123&si=X&utm_source=copy',
    expected: 'https://www.youtube.com/playlist?list=PLabc123' },
  { name: 'playlist: no list= → null',
    input: 'https://www.youtube.com/playlist?si=X',
    expected: null },

  // Non-post pages
  { name: 'channel home → null',
    input: 'https://www.youtube.com/@somebody',
    expected: null },
  { name: 'home page → null',
    input: 'https://www.youtube.com/',
    expected: null },
  { name: 'search → null',
    input: 'https://www.youtube.com/results?search_query=hello',
    expected: null },

  // Non-YouTube
  { name: 'google.com → null',
    input: 'https://www.google.com/search?q=youtube',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenYoutubeUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isYoutubeHost: youtube.com', isYoutubeHost('youtube.com'), true);
check('isYoutubeHost: m.youtube.com', isYoutubeHost('m.youtube.com'), true);
check('isYoutubeHost: youtu.be', isYoutubeHost('youtu.be'), true);
check('isYoutubeHost: youtube-clone.com', isYoutubeHost('youtube-clone.com'), false);
check('isPostUrl: /watch?v=', isPostUrl('https://www.youtube.com/watch?v=ABC'), true);
check('isPostUrl: home', isPostUrl('https://www.youtube.com/'), false);
check('shorten on garbage', shortenYoutubeUrl('not a url'), null);
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
