const path = require('path');
const {
  shortenLetterboxdUrl,
  needsShortening,
  isLetterboxdHost,
  isPostUrl,
} = require(path.join('..', 'src', 'letterboxd.js'));

const VALID_HOST = 'letterboxd.com';

const CASES = [
  { name: 'film already clean',
    input: 'https://letterboxd.com/film/parasite-2019/',
    expected: 'https://letterboxd.com/film/parasite-2019/',
    expectedNeeds: false },
  { name: 'share junk stripped',
    input: 'https://letterboxd.com/film/parasite-2019/?shared=true&utm_source=share',
    expected: 'https://letterboxd.com/film/parasite-2019/' },
  { name: 'member review cleaned',
    input: 'https://letterboxd.com/someuser/film/parasite-2019/?utm_medium=share',
    expected: 'https://letterboxd.com/someuser/film/parasite-2019/' },
  { name: 'member list cleaned',
    input: 'https://letterboxd.com/someuser/list/best-of-2020/?shared=1',
    expected: 'https://letterboxd.com/someuser/list/best-of-2020/' },
  { name: 'hash preserved',
    input: 'https://letterboxd.com/film/x/?shared=1#reviews',
    expected: 'https://letterboxd.com/film/x/#reviews' },
  { name: 'films directory → null',
    input: 'https://letterboxd.com/films/popular/',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://notletterboxd.com/film/x/',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenLetterboxdUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('host: valid', isLetterboxdHost(VALID_HOST), true);
check('host: lookalike suffix', isLetterboxdHost(VALID_HOST + '.evil.com'), false);
check('shorten on garbage', shortenLetterboxdUrl('not a url'), null);
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
