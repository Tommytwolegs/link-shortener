const path = require('path');
const {
  shortenSpotifyUrl,
  needsShortening,
  isSpotifyHost,
  isPostUrl,
} = require(path.join('..', 'src', 'spotify.js'));

const CASES = [
  // /embed/ player forms
  { name: 'embed track: utm_source=generator stripped, theme kept',
    input: 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC?utm_source=generator&theme=0',
    expected: 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC?theme=0' },
  { name: 'embed episode: t kept',
    input: 'https://open.spotify.com/embed/episode/abc123?utm_source=generator&t=600',
    expected: 'https://open.spotify.com/embed/episode/abc123?t=600' },
  { name: 'embed playlist: theme kept, si stripped',
    input: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?si=blob&theme=0',
    expected: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?theme=0' },
  { name: 'embed track already clean',
    input: 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC',
    expected: 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC',
    expectedNeeds: false },
  { name: 'track: si stripped',
    input: 'https://open.spotify.com/track/abc123?si=trackingblob',
    expected: 'https://open.spotify.com/track/abc123' },
  { name: 'track: utm_* stripped',
    input: 'https://open.spotify.com/track/abc123?utm_source=copy-link&utm_medium=share',
    expected: 'https://open.spotify.com/track/abc123' },
  // ?t= is the "share at this moment" timestamp — keep it.
  { name: 'track: timestamp preserved',
    input: 'https://open.spotify.com/track/abc123?si=X&t=180',
    expected: 'https://open.spotify.com/track/abc123?t=180' },
  { name: 'track: timestamp alone, already canonical',
    input: 'https://open.spotify.com/track/abc123?t=180',
    expected: 'https://open.spotify.com/track/abc123?t=180',
    expectedNeeds: false },
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
  // Podcast moment-share — episode timestamp preserved.
  { name: 'episode: timestamp preserved',
    input: 'https://open.spotify.com/episode/3PXr5HnGc7lEMVl0RjbR0V?si=X&t=1234',
    expected: 'https://open.spotify.com/episode/3PXr5HnGc7lEMVl0RjbR0V?t=1234' },
  { name: 'episode: timestamp with utm junk',
    input: 'https://open.spotify.com/episode/3PXr5HnGc7lEMVl0RjbR0V?utm_source=copy-link&utm_medium=share&t=600&si=foo',
    expected: 'https://open.spotify.com/episode/3PXr5HnGc7lEMVl0RjbR0V?t=600' },
  { name: 'show',
    input: 'https://open.spotify.com/show/abc123?si=X',
    expected: 'https://open.spotify.com/show/abc123' },
  { name: 'user',
    input: 'https://open.spotify.com/user/janedoe?si=X',
    expected: 'https://open.spotify.com/user/janedoe' },
  // Albums don't support per-track timestamps in URL form — t= would just be
  // ignored by Spotify, but it's not in the allowlist for /album/, so it's
  // stripped along with everything else.
  { name: 'album: t= is NOT preserved (not in allowlist)',
    input: 'https://open.spotify.com/album/abc123?si=X&t=180',
    expected: 'https://open.spotify.com/album/abc123' },
  { name: 'locale-prefixed track',
    input: 'https://open.spotify.com/intl-de/track/abc123?si=X',
    expected: 'https://open.spotify.com/intl-de/track/abc123' },
  { name: 'locale-prefixed track keeps timestamp',
    input: 'https://open.spotify.com/intl-de/track/abc123?si=X&t=42',
    expected: 'https://open.spotify.com/intl-de/track/abc123?t=42' },
  { name: 'locale-prefixed episode keeps timestamp',
    input: 'https://open.spotify.com/intl-pt/episode/abc123?si=Y&t=900',
    expected: 'https://open.spotify.com/intl-pt/episode/abc123?t=900' },
  { name: 'locale-prefixed album',
    input: 'https://open.spotify.com/intl-pt/album/abc123?si=X&utm_source=copy-link',
    expected: 'https://open.spotify.com/intl-pt/album/abc123' },
  // Hash preservation — defensive consistency; Spotify doesn't use hashes
  // today but dropping them is the same foot-gun that broke Amazon's
  // in-page section links.
  { name: 'track: hash preserved (no query)',
    input: 'https://open.spotify.com/track/abc123#anchor',
    expected: 'https://open.spotify.com/track/abc123#anchor',
    expectedNeeds: false },
  { name: 'track: hash preserved alongside timestamp',
    input: 'https://open.spotify.com/track/abc123?si=X&t=60#anchor',
    expected: 'https://open.spotify.com/track/abc123?t=60#anchor' },
  { name: 'album: hash preserved when stripping query',
    input: 'https://open.spotify.com/album/abc123?si=X#tracklist',
    expected: 'https://open.spotify.com/album/abc123#tracklist' },
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

  // v1.7.0+ context preservation: ?context=spotify:playlist:<id> tells the
  // player what to queue after this track. Without it, the track plays
  // standalone.
  { name: 'track: context preserved alongside t',
    input: 'https://open.spotify.com/track/abc?t=42&context=spotify%3Aplaylist%3A37i9dQZF1DXcBWIGoYBM5M',
    expected: 'https://open.spotify.com/track/abc?t=42&context=spotify%3Aplaylist%3A37i9dQZF1DXcBWIGoYBM5M' },
  { name: 'track: context preserved, si stripped',
    input: 'https://open.spotify.com/track/abc?context=spotify%3Aalbum%3A12345&si=xyz',
    expected: 'https://open.spotify.com/track/abc?context=spotify%3Aalbum%3A12345' },
  { name: 'episode: context preserved',
    input: 'https://open.spotify.com/episode/abc?t=600&context=spotify%3Ashow%3A12345',
    expected: 'https://open.spotify.com/episode/abc?t=600&context=spotify%3Ashow%3A12345' },
  { name: 'intl track: context preserved',
    input: 'https://open.spotify.com/intl-de/track/abc?context=spotify%3Aplaylist%3Aabc&si=xyz',
    expected: 'https://open.spotify.com/intl-de/track/abc?context=spotify%3Aplaylist%3Aabc' },

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
