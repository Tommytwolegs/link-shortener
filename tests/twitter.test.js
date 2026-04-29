const path = require('path');
const {
  shortenTwitterUrl,
  needsShortening,
  isTwitterHost,
  isPostUrl,
} = require(path.join('..', 'src', 'twitter.js'));

const CASES = [
  { name: 'twitter.com /status/ tracking stripped',
    input: 'https://twitter.com/jack/status/20?s=20&t=trackingblob',
    expected: 'https://twitter.com/jack/status/20' },
  { name: 'x.com /status/ tracking stripped',
    input: 'https://x.com/jack/status/20?s=20&t=trackingblob',
    expected: 'https://x.com/jack/status/20' },
  { name: 'mobile.twitter.com',
    input: 'https://mobile.twitter.com/jack/status/20?s=20',
    expected: 'https://mobile.twitter.com/jack/status/20' },
  { name: '/i/web/status/ deep link',
    input: 'https://twitter.com/i/web/status/123456789?s=20',
    expected: 'https://twitter.com/i/web/status/123456789' },
  { name: '/i/status/ alternate form',
    input: 'https://x.com/i/status/123456789?s=20',
    expected: 'https://x.com/i/status/123456789' },
  { name: 'photo sub-page preserved',
    input: 'https://x.com/jack/status/20/photo/1?s=20',
    expected: 'https://x.com/jack/status/20/photo/1' },
  { name: 'video sub-page preserved',
    input: 'https://x.com/jack/status/20/video/1?s=20',
    expected: 'https://x.com/jack/status/20/video/1' },
  { name: 'communities post',
    input: 'https://x.com/jack/communities/123?s=20',
    expected: 'https://x.com/jack/communities/123' },
  { name: 'spaces',
    input: 'https://twitter.com/i/spaces/abcDef?s=20',
    expected: 'https://twitter.com/i/spaces/abcDef' },
  { name: 'hash dropped',
    input: 'https://x.com/jack/status/20#m',
    expected: 'https://x.com/jack/status/20' },
  { name: 'already clean',
    input: 'https://x.com/jack/status/20',
    expected: 'https://x.com/jack/status/20',
    expectedNeeds: false },
  { name: 'profile page → null',
    input: 'https://x.com/jack',
    expected: null },
  { name: 'home → null',
    input: 'https://x.com/home',
    expected: null },
  { name: 'search → null (we leave search alone)',
    input: 'https://x.com/search?q=hello&f=live',
    expected: null },
  { name: 'non-Twitter → null',
    input: 'https://www.google.com/search?q=twitter',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenTwitterUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isTwitterHost: twitter.com', isTwitterHost('twitter.com'), true);
check('isTwitterHost: www.x.com', isTwitterHost('www.x.com'), true);
check('isTwitterHost: x.com', isTwitterHost('x.com'), true);
check('isTwitterHost: mobile.twitter.com', isTwitterHost('mobile.twitter.com'), true);
check('isTwitterHost: x-clone.com', isTwitterHost('x-clone.com'), false);
check('isTwitterHost: linkedin.com', isTwitterHost('linkedin.com'), false);
check('isPostUrl: /status/', isPostUrl('https://x.com/jack/status/20'), true);
check('isPostUrl: profile', isPostUrl('https://x.com/jack'), false);
check('shorten on garbage', shortenTwitterUrl('not a url'), null);
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
