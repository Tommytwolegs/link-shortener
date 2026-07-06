const path = require('path');
const {
  shortenWikipediaUrl,
  needsShortening,
  isWikipediaHost,
  isPostUrl,
} = require(path.join('..', 'src', 'wikipedia.js'));

const CASES = [

  { name: 'article already clean',
    input: 'https://en.wikipedia.org/wiki/URL_shortening',
    expected: 'https://en.wikipedia.org/wiki/URL_shortening',
    expectedNeeds: false },
  { name: 'wprov app-share junk stripped',
    input: 'https://en.wikipedia.org/wiki/URL_shortening?wprov=sfti1',
    expected: 'https://en.wikipedia.org/wiki/URL_shortening' },
  { name: 'wprov android variant stripped',
    input: 'https://de.wikipedia.org/wiki/Kurz-URL?wprov=sfla1',
    expected: 'https://de.wikipedia.org/wiki/Kurz-URL' },
  { name: 'mobile subdomain cleaned',
    input: 'https://en.m.wikipedia.org/wiki/URL_shortening?wprov=sfti1',
    expected: 'https://en.m.wikipedia.org/wiki/URL_shortening' },
  { name: 'section hash preserved (the whole point)',
    input: 'https://en.wikipedia.org/wiki/URL_shortening?wprov=sfti1#Techniques',
    expected: 'https://en.wikipedia.org/wiki/URL_shortening#Techniques' },
  { name: 'unknown params preserved (denylist strategy)',
    input: 'https://en.wikipedia.org/wiki/Special:Search?search=url&wprov=sfti1',
    expected: 'https://en.wikipedia.org/wiki/Special:Search?search=url' },
  { name: 'unicode article title cleaned',
    input: 'https://ja.wikipedia.org/wiki/%E6%9D%B1%E4%BA%AC?wprov=sfti1',
    expected: 'https://ja.wikipedia.org/wiki/%E6%9D%B1%E4%BA%AC' },
  { name: '/w/index.php (functional params live here) → null',
    input: 'https://en.wikipedia.org/w/index.php?title=URL_shortening&oldid=123456',
    expected: null },
  { name: 'main page path → null',
    input: 'https://en.wikipedia.org/',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://en.wikipedia.org.evil.com/wiki/X?wprov=sfti1',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenWikipediaUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isWikipediaHost: en.wikipedia.org', isWikipediaHost('en.wikipedia.org'), true);
check('isWikipediaHost: en.m.wikipedia.org', isWikipediaHost('en.m.wikipedia.org'), true);
check('isWikipediaHost: wikipedia.org.evil.com', isWikipediaHost('wikipedia.org.evil.com'), false);
check('isPostUrl: article', isPostUrl('https://en.wikipedia.org/wiki/X'), true);
check('isPostUrl: index.php', isPostUrl('https://en.wikipedia.org/w/index.php?title=X'), false);
check('shorten on garbage', shortenWikipediaUrl('not a url'), null);
check('needs on garbage', needsShortening('not a url'), false);
// Mutation guard (denylist module deletes params):
const probe = new URL('https://en.wikipedia.org/wiki/X?wprov=sfti1');
check('shorten on URL object', shortenWikipediaUrl(probe), 'https://en.wikipedia.org/wiki/X');
check('URL-object input not mutated', probe.href, 'https://en.wikipedia.org/wiki/X?wprov=sfti1');
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
