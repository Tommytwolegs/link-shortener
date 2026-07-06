const path = require('path');
const {
  shortenMercariUrl,
  needsShortening,
  isMercariHost,
  isPostUrl,
} = require(path.join('..', 'src', 'mercari.js'));

const CASES = [

  { name: 'JP item already clean',
    input: 'https://jp.mercari.com/item/m12345678901',
    expected: 'https://jp.mercari.com/item/m12345678901',
    expectedNeeds: false },
  { name: 'JP item junk stripped',
    input: 'https://jp.mercari.com/item/m12345678901?utm_source=share&utm_medium=twitter&afid=123',
    expected: 'https://jp.mercari.com/item/m12345678901' },
  { name: 'US item cleaned',
    input: 'https://www.mercari.com/us/item/m98765432109/?ref=search_results&source_location=search',
    expected: 'https://www.mercari.com/us/item/m98765432109/' },
  { name: 'US short form cleaned',
    input: 'https://www.mercari.com/item/m111?utm_source=x',
    expected: 'https://www.mercari.com/item/m111' },
  { name: 'hash preserved',
    input: 'https://jp.mercari.com/item/m1?utm_source=x#comments',
    expected: 'https://jp.mercari.com/item/m1#comments' },
  { name: 'search → null',
    input: 'https://jp.mercari.com/search?keyword=camera',
    expected: null },
  { name: 'seller profile → null',
    input: 'https://jp.mercari.com/user/profile/123',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://notmercari.com/item/m1',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenMercariUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isMercariHost: mercari.com', isMercariHost('mercari.com'), true);
check('isMercariHost: jp.mercari.com', isMercariHost('jp.mercari.com'), true);
check('isMercariHost: notmercari.com', isMercariHost('notmercari.com'), false);
check('isPostUrl: item', isPostUrl('https://jp.mercari.com/item/m1'), true);
check('isPostUrl: search', isPostUrl('https://jp.mercari.com/search?keyword=x'), false);
check('shorten on garbage', shortenMercariUrl('not a url'), null);
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
