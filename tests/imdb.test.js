const path = require('path');
const {
  shortenImdbUrl,
  needsShortening,
  isImdbHost,
  isPostUrl,
} = require(path.join('..', 'src', 'imdb.js'));

const CASES = [

  { name: 'title already clean',
    input: 'https://www.imdb.com/title/tt0111161/',
    expected: 'https://www.imdb.com/title/tt0111161/',
    expectedNeeds: false },
  { name: 'ref_ stripped',
    input: 'https://www.imdb.com/title/tt0111161/?ref_=tt_sims_tt_i_1',
    expected: 'https://www.imdb.com/title/tt0111161/' },
  { name: 'pf_rd_* junk stripped',
    input: 'https://www.imdb.com/title/tt0068646/?pf_rd_m=A2FGELUUNOQJNL&pf_rd_p=1a264172&pf_rd_r=ABC&pf_rd_s=center-1&pf_rd_t=15506&pf_rd_i=top&ref_=chttp_tt_2',
    expected: 'https://www.imdb.com/title/tt0068646/' },
  { name: 'name page cleaned',
    input: 'https://www.imdb.com/name/nm0000206/?ref_=tt_cst_t_1',
    expected: 'https://www.imdb.com/name/nm0000206/' },
  { name: 'list cleaned',
    input: 'https://www.imdb.com/list/ls055592025/?ref_=otl_1',
    expected: 'https://www.imdb.com/list/ls055592025/' },
  { name: 'mobile subdomain cleaned',
    input: 'https://m.imdb.com/title/tt0111161/?ref_=m_hm',
    expected: 'https://m.imdb.com/title/tt0111161/' },
  { name: 'hash preserved',
    input: 'https://www.imdb.com/title/tt1/?ref_=x#trivia',
    expected: 'https://www.imdb.com/title/tt1/#trivia' },
  { name: 'episodes subpage → null',
    input: 'https://www.imdb.com/title/tt0111161/episodes?season=1',
    expected: null },
  { name: 'search → null',
    input: 'https://www.imdb.com/find/?q=shawshank',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenImdbUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isImdbHost: imdb.com', isImdbHost('imdb.com'), true);
check('isImdbHost: m.imdb.com', isImdbHost('m.imdb.com'), true);
check('isImdbHost: notimdb.com', isImdbHost('notimdb.com'), false);
check('isPostUrl: title', isPostUrl('https://imdb.com/title/tt1/'), true);
check('isPostUrl: find', isPostUrl('https://imdb.com/find/?q=x'), false);
check('shorten on garbage', shortenImdbUrl('not a url'), null);
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
