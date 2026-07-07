const path = require('path');
const {
  shortenJdUrl,
  needsShortening,
  isJdHost,
  isPostUrl,
} = require(path.join('..', 'src', 'jd.js'));

const VALID_HOST = 'item.jd.com';

const CASES = [
  { name: 'item already clean',
    input: 'https://item.jd.com/100012043978.html',
    expected: 'https://item.jd.com/100012043978.html',
    expectedNeeds: false },
  { name: 'utm + jd_pop stripped',
    input: 'https://item.jd.com/100012043978.html?jd_pop=abc-123&abt=3&utm_source=share',
    expected: 'https://item.jd.com/100012043978.html' },
  { name: 'hash preserved',
    input: 'https://item.jd.com/1.html?cu=true#comment',
    expected: 'https://item.jd.com/1.html#comment' },
  { name: 'www.jd.com → null (only item. subdomain)',
    input: 'https://www.jd.com/100012043978.html',
    expected: null },
  { name: 'search → null',
    input: 'https://item.jd.com/search?keyword=x',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://item.jd.com.evil.com/1.html',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenJdUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('host: valid', isJdHost(VALID_HOST), true);
check('host: lookalike suffix', isJdHost(VALID_HOST + '.evil.com'), false);
check('shorten on garbage', shortenJdUrl('not a url'), null);
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
