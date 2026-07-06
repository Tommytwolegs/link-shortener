const path = require('path');
const {
  shortenSoundcloudUrl,
  needsShortening,
  isSoundcloudHost,
  isPostUrl,
} = require(path.join('..', 'src', 'soundcloud.js'));

const CASES = [

  { name: 'track already clean',
    input: 'https://soundcloud.com/artist-name/track-name',
    expected: 'https://soundcloud.com/artist-name/track-name',
    expectedNeeds: false },
  { name: 'si share token stripped',
    input: 'https://soundcloud.com/artist-name/track-name?si=abc123DEF456&utm_source=clipboard&utm_medium=text',
    expected: 'https://soundcloud.com/artist-name/track-name' },
  { name: 'ref + p + c stripped',
    input: 'https://soundcloud.com/artist-name/track-name?ref=clipboard&p=i&c=1',
    expected: 'https://soundcloud.com/artist-name/track-name' },
  { name: 'in= playlist context PRESERVED',
    input: 'https://soundcloud.com/artist-name/track-name?in=someuser/sets/summer-mix&si=abc',
    expected: 'https://soundcloud.com/artist-name/track-name?in=someuser%2Fsets%2Fsummer-mix' },
  { name: 'playlist (sets) cleaned',
    input: 'https://soundcloud.com/artist-name/sets/album-name?si=xyz&utm_campaign=social_sharing',
    expected: 'https://soundcloud.com/artist-name/sets/album-name' },
  { name: 'on.soundcloud short link cleaned',
    input: 'https://on.soundcloud.com/AbCdEf123?utm_source=whatsapp',
    expected: 'https://on.soundcloud.com/AbCdEf123' },
  { name: 'hash preserved',
    input: 'https://soundcloud.com/artist/track?si=x#t=1:23',
    expected: 'https://soundcloud.com/artist/track#t=1:23' },
  { name: 'discover (blocklisted) → null',
    input: 'https://soundcloud.com/discover/sets/charts-top:all-music',
    expected: null },
  { name: 'search (blocklisted) → null',
    input: 'https://soundcloud.com/search/sounds?q=lofi',
    expected: null },
  { name: 'profile (one segment) → null',
    input: 'https://soundcloud.com/artist-name',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://notsoundcloud.com/artist/track?si=x',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenSoundcloudUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isSoundcloudHost: soundcloud.com', isSoundcloudHost('soundcloud.com'), true);
check('isSoundcloudHost: on.soundcloud.com', isSoundcloudHost('on.soundcloud.com'), true);
check('isSoundcloudHost: notsoundcloud.com', isSoundcloudHost('notsoundcloud.com'), false);
check('isPostUrl: track', isPostUrl('https://soundcloud.com/a/b'), true);
check('isPostUrl: profile', isPostUrl('https://soundcloud.com/a'), false);
check('shorten on garbage', shortenSoundcloudUrl('not a url'), null);
check('needs on garbage', needsShortening('not a url'), false);
// Mutation guard (denylist module deletes params):
const probe = new URL('https://soundcloud.com/a/b?si=x');
check('shorten on URL object', shortenSoundcloudUrl(probe), 'https://soundcloud.com/a/b');
check('URL-object input not mutated', probe.href, 'https://soundcloud.com/a/b?si=x');
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
