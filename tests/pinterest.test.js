const path = require('path');
const {
  shortenPinterestUrl,
  needsShortening,
  isPinterestHost,
  isPostUrl,
} = require(path.join('..', 'src', 'pinterest.js'));

const CASES = [
  { name: 'profile: invite_code stripped via fallback',
    input: 'https://www.pinterest.com/janedoe/?invite_code=abc123&sender=987',
    expected: 'https://www.pinterest.com/janedoe/' },
  { name: 'pin: utm stripped',
    input: 'https://www.pinterest.com/pin/1234567890123456789/?utm_source=share&utm_medium=copy_link',
    expected: 'https://www.pinterest.com/pin/1234567890123456789/' },
  { name: 'pin: epik + rs stripped',
    input: 'https://www.pinterest.com/pin/1234567890123456789/?epik=dj0yJnU&rs=abc&invite_code=xyz',
    expected: 'https://www.pinterest.com/pin/1234567890123456789/' },
  { name: 'pin: already clean',
    input: 'https://www.pinterest.com/pin/1234567890123456789/',
    expected: 'https://www.pinterest.com/pin/1234567890123456789/',
    expectedNeeds: false },
  { name: 'pin: no trailing slash works',
    input: 'https://www.pinterest.com/pin/1234567890123456789?utm_source=share',
    expected: 'https://www.pinterest.com/pin/1234567890123456789' },
  { name: 'pin: hash preserved',
    input: 'https://www.pinterest.com/pin/1234567890123456789/?utm_source=share#comments',
    expected: 'https://www.pinterest.com/pin/1234567890123456789/#comments' },

  // Locale prefix
  { name: 'pin: /de/ locale prefix preserved',
    input: 'https://www.pinterest.com/de/pin/1234567890123456789/?utm_source=foo',
    expected: 'https://www.pinterest.com/de/pin/1234567890123456789/' },

  // Regional TLDs
  { name: 'UK: pinterest.co.uk',
    input: 'https://www.pinterest.co.uk/pin/1234567890123456789/?utm_source=share',
    expected: 'https://www.pinterest.co.uk/pin/1234567890123456789/' },
  { name: 'DE: pinterest.de',
    input: 'https://www.pinterest.de/pin/1234567890123456789/',
    expected: 'https://www.pinterest.de/pin/1234567890123456789/',
    expectedNeeds: false },

  // pin.it short links
  { name: 'pin.it short link',
    input: 'https://pin.it/AbCdEf123?utm_source=share',
    expected: 'https://pin.it/AbCdEf123' },
  { name: 'pin.it short with trailing slash',
    input: 'https://pin.it/AbCdEf123/?utm_source=share',
    expected: 'https://pin.it/AbCdEf123/' },

  // Non-pin pages
  { name: 'board page → null',
    input: 'https://www.pinterest.com/janedoe/cool-board/',
    expected: 'https://www.pinterest.com/janedoe/cool-board/',
    expectedNeeds: false },
  { name: 'profile → null',
    input: 'https://www.pinterest.com/janedoe/',
    expected: 'https://www.pinterest.com/janedoe/',
    expectedNeeds: false },
  { name: 'search → null',
    input: 'https://www.pinterest.com/search/pins/?q=mug',
    expected: 'https://www.pinterest.com/search/pins/?q=mug',
    expectedNeeds: false },
  { name: 'home → null',
    input: 'https://www.pinterest.com/',
    expected: 'https://www.pinterest.com/',
    expectedNeeds: false },
  { name: 'non-numeric pin id → null',
    input: 'https://www.pinterest.com/pin/notanumber/',
    expected: 'https://www.pinterest.com/pin/notanumber/',
    expectedNeeds: false },

  // Non-Pinterest
  { name: 'non-Pinterest → null',
    input: 'https://www.google.com/pin/1234567890123456789/',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenPinterestUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isPinterestHost: pinterest.com', isPinterestHost('pinterest.com'), true);
check('isPinterestHost: www.pinterest.com', isPinterestHost('www.pinterest.com'), true);
check('isPinterestHost: pinterest.co.uk', isPinterestHost('pinterest.co.uk'), true);
check('isPinterestHost: pin.it', isPinterestHost('pin.it'), true);
check('isPinterestHost: pinterest-clone.com', isPinterestHost('pinterest-clone.com'), false);
check('isPostUrl: /pin/', isPostUrl('https://www.pinterest.com/pin/123/'), true);
check('isPostUrl: profile', isPostUrl('https://www.pinterest.com/janedoe/'), false);
check('shorten on garbage', shortenPinterestUrl('not a url'), null);
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
