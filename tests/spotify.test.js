const path = require('path');
const {
  shortenSpotifyUrl,
  needsShortening,
  isSpotifyHost,
  isPostUrl,
} = require(path.join('..', 'src', 'spotify.js'));

const CASES = [
  { name: 'track: si stripped',
    input: 'https://open.spotify.com/track/abc123?si=trackingblob',
    expected: 'https://open.spotify.com/track/abc123' },
  { name: 'track: utm_* stripped',
    input: 'https://open.spotify.com/track/abc123?utm_source=copy-link&utm_medium=share',
    expected: 'https://open.spotify.com/track/abc123' },
  { name: 'album',
    input: 'https://open.spotify.com/album/abc123?si=X',
    expected: 'https://open.spotify.com/album/abc123' },
  { name: 'playlist',
    input: 'https://open.spotify.com/playlist/abc123?si=X',
    expected: 'https://open.spotify.com/playlist/abc123' },
  { name: 'artist',
    input: 'https://open.spotify.com/artist/abc123?si=X',
    expected: 'https://open.spotify.com/artist/abc123' },
  { name: 'episode',
    input: 'https://open.spotify.com/episode/abc123?si=X',
    expected: 'https://open.spotify.com/episode/abc123' },
  { name: 'show',
    input: 'https://open.spotify.com/show/abc123?si=X',
    expected: 'https://open.spotify.com/show/abc123' },
  { name: 'user',
    input: 'https://open.spotify.com/user/janedoe?si=X',
    expected: 'https://open.spotify.com/user/janedoe' },
  { name: 'locale-prefixed track',
    input: 'https://open.spotify.com/intl-de/track/abc123?si=X',
    expected: 'https://open.spotify.com/intl-de/track/abc123' },
  { name: 'locale-prefixed album',
    input: 'https://open.spotify.com/intl-pt/album/abc123?si=X&utm_source=copy-link',
    expected: 'https://open.spotify.com/intl-pt/album/abc123' },
  { name: 'hash dropped',
    input: 'https://open.spotify.com/track/abc123?si=X#anchor',
    expected: 'https://open.spotify.com/track/abc123' },
  { name: 'already clean',
    input: 'https://open.spotify.com/track/abc123',
    expected: 'https://open.spotify.com/track/abc123',
    expectedNeeds: false },
  { name: 'home → null',
    input: 'https://open.spotify.com/',
    expected: null },
  { name: 'search → null',
    input: 'https://open.spotify.com/search/song',
    expected: null },
  { name: 'non-Spotify → null',
    input: 'https://www.spotify.com/track/abc123',
    expected: null },
  { name: 'wrong subdomain → null',
    input: 'https://api.spotify.com/track/abc123',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenSpotifyUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isSpotifyHost: open.spotify.com', isSpotifyHost('open.spotify.com'), true);
check('isSpotifyHost: www.spotify.com', isSpotifyHost('www.spotify.com'), false);
check('isSpotifyHost: api.spotify.com', isSpotifyHost('api.spotify.com'), false);
check('isPostUrl: track', isPostUrl('https://open.spotify.com/track/abc'), true);
check('isPostUrl: home', isPostUrl('https://open.spotify.com/'), false);
check('shorten on garbage', shortenSpotifyUrl('not a url'), null);
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
