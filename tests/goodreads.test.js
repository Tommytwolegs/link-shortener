const path = require('path');
const {
  shortenGoodreadsUrl,
  needsShortening,
  isGoodreadsHost,
  isPostUrl,
} = require(path.join('..', 'src', 'goodreads.js'));

const CASES = [

  { name: 'book already clean',
    input: 'https://www.goodreads.com/book/show/5907.The_Hobbit',
    expected: 'https://www.goodreads.com/book/show/5907.The_Hobbit',
    expectedNeeds: false },
  { name: 'search attribution stripped',
    input: 'https://www.goodreads.com/book/show/5907.The_Hobbit?from_search=true&from_srp=true&qid=abc123&rank=1',
    expected: 'https://www.goodreads.com/book/show/5907.The_Hobbit' },
  { name: 'ref + ac stripped',
    input: 'https://www.goodreads.com/book/show/11297-norse-mythology?ac=1&from_search=true&ref=nav_sb_ss_1_5',
    expected: 'https://www.goodreads.com/book/show/11297-norse-mythology' },
  { name: 'author page cleaned',
    input: 'https://www.goodreads.com/author/show/1077326.J_K_Rowling?from_search=true',
    expected: 'https://www.goodreads.com/author/show/1077326.J_K_Rowling' },
  { name: 'series cleaned',
    input: 'https://www.goodreads.com/series/45175-harry-potter?utm_source=share',
    expected: 'https://www.goodreads.com/series/45175-harry-potter' },
  { name: 'hash preserved',
    input: 'https://www.goodreads.com/book/show/5907.The_Hobbit?qid=x#other_reviews',
    expected: 'https://www.goodreads.com/book/show/5907.The_Hobbit#other_reviews' },
  { name: 'search → null',
    input: 'https://www.goodreads.com/search?q=hobbit',
    expected: null },
  { name: 'list → null',
    input: 'https://www.goodreads.com/list/show/1.Best_Books_Ever',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://notgoodreads.com/book/show/1.X',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenGoodreadsUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isGoodreadsHost: goodreads.com', isGoodreadsHost('goodreads.com'), true);
check('isGoodreadsHost: www.goodreads.com', isGoodreadsHost('www.goodreads.com'), true);
check('isGoodreadsHost: notgoodreads.com', isGoodreadsHost('notgoodreads.com'), false);
check('isPostUrl: book', isPostUrl('https://goodreads.com/book/show/1.X'), true);
check('isPostUrl: search', isPostUrl('https://goodreads.com/search?q=x'), false);
check('shorten on garbage', shortenGoodreadsUrl('not a url'), null);
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
