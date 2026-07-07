const path = require('path');
const {
  shortenBandcampUrl,
  needsShortening,
  isBandcampHost,
  isPostUrl,
} = require(path.join('..', 'src', 'bandcamp.js'));

const VALID_HOST = 'artist.bandcamp.com';

const CASES = [
  { name: 'album already clean',
    input: 'https://artist.bandcamp.com/album/great-record',
    expected: 'https://artist.bandcamp.com/album/great-record',
    expectedNeeds: false },
  { name: 'search attribution stripped',
    input: 'https://artist.bandcamp.com/track/cool-song?from=search&search_item_id=123&search_item_type=t&search_match_part=%3F&search_sig=abc',
    expected: 'https://artist.bandcamp.com/track/cool-song' },
  { name: 'from=embed stripped',
    input: 'https://artist.bandcamp.com/album/great-record?from=embed',
    expected: 'https://artist.bandcamp.com/album/great-record' },
  { name: 'hash preserved',
    input: 'https://artist.bandcamp.com/album/x?from=a#lyrics',
    expected: 'https://artist.bandcamp.com/album/x#lyrics' },
  { name: 'artist home → null',
    input: 'https://artist.bandcamp.com/',
    expected: null },
  { name: 'music tab → null',
    input: 'https://artist.bandcamp.com/music',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://artist.notbandcamp.com/album/x',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenBandcampUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('host: valid', isBandcampHost(VALID_HOST), true);
check('host: lookalike suffix', isBandcampHost(VALID_HOST + '.evil.com'), false);
check('shorten on garbage', shortenBandcampUrl('not a url'), null);
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
