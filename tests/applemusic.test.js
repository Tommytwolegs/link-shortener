const path = require('path');
const {
  shortenAppleMusicUrl,
  needsShortening,
  isAppleMusicHost,
  isPostUrl,
} = require(path.join('..', 'src', 'applemusic.js'));

const CASES = [

  { name: 'album already clean',
    input: 'https://music.apple.com/us/album/abbey-road/1441164426',
    expected: 'https://music.apple.com/us/album/abbey-road/1441164426',
    expectedNeeds: false },
  { name: 'i= track deep link PRESERVED, affiliate stripped',
    input: 'https://music.apple.com/us/album/abbey-road/1441164426?i=1441164436&at=1000lHKX&ct=widget&itsct=music_box_link&itscg=30200',
    expected: 'https://music.apple.com/us/album/abbey-road/1441164426?i=1441164436' },
  { name: 'song form cleaned',
    input: 'https://music.apple.com/us/song/come-together/1441164436?uo=4&app=music&ls=1',
    expected: 'https://music.apple.com/us/song/come-together/1441164436' },
  { name: 'playlist cleaned',
    input: 'https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb?ls=1&app=music',
    expected: 'https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb' },
  { name: 'artist cleaned',
    input: 'https://music.apple.com/gb/artist/the-beatles/136975?uo=4',
    expected: 'https://music.apple.com/gb/artist/the-beatles/136975' },
  { name: 'podcast episode i= PRESERVED',
    input: 'https://podcasts.apple.com/us/podcast/some-show/id1200361736?i=1000634747968&at=affiliate',
    expected: 'https://podcasts.apple.com/us/podcast/some-show/id1200361736?i=1000634747968' },
  { name: 'l= display language PRESERVED alongside i=',
    input: 'https://music.apple.com/jp/album/abbey-road/1441164426?i=1441164436&l=en&at=1000lHKX',
    expected: 'https://music.apple.com/jp/album/abbey-road/1441164426?i=1441164436&l=en' },
  { name: 'hash preserved',
    input: 'https://music.apple.com/us/album/x/1?at=aff#lyrics',
    expected: 'https://music.apple.com/us/album/x/1#lyrics' },
  { name: 'storefront browse → null',
    input: 'https://music.apple.com/us/browse',
    expected: null },
  { name: 'no country prefix → null',
    input: 'https://music.apple.com/album/x/1',
    expected: null },
  { name: 'apple.com www → null',
    input: 'https://www.apple.com/us/album/x/1',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenAppleMusicUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isAppleMusicHost: music.apple.com', isAppleMusicHost('music.apple.com'), true);
check('isAppleMusicHost: podcasts.apple.com', isAppleMusicHost('podcasts.apple.com'), true);
check('isAppleMusicHost: www.apple.com', isAppleMusicHost('www.apple.com'), false);
check('isPostUrl: album', isPostUrl('https://music.apple.com/us/album/x/1'), true);
check('isPostUrl: browse', isPostUrl('https://music.apple.com/us/browse'), false);
check('shorten on garbage', shortenAppleMusicUrl('not a url'), null);
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
