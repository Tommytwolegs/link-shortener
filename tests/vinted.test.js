const path = require('path');
const {
  shortenVintedUrl,
  needsShortening,
  isVintedHost,
  isPostUrl,
} = require(path.join('..', 'src', 'vinted.js'));

const CASES = [

  { name: 'item already clean',
    input: 'https://www.vinted.fr/items/4567890123-robe-zara-taille-m',
    expected: 'https://www.vinted.fr/items/4567890123-robe-zara-taille-m',
    expectedNeeds: false },
  { name: 'referrer + session junk stripped',
    input: 'https://www.vinted.fr/items/4567890123-robe-zara-taille-m?referrer=catalog&homepage_session_id=abc-123',
    expected: 'https://www.vinted.fr/items/4567890123-robe-zara-taille-m' },
  { name: 'US .com cleaned',
    input: 'https://www.vinted.com/items/111-jacket?utm_source=share',
    expected: 'https://www.vinted.com/items/111-jacket' },
  { name: 'slugless id cleaned',
    input: 'https://www.vinted.de/items/999?referrer=x',
    expected: 'https://www.vinted.de/items/999' },
  { name: 'hash preserved',
    input: 'https://www.vinted.pl/items/1-x?referrer=a#details',
    expected: 'https://www.vinted.pl/items/1-x#details' },
  { name: 'catalog → null',
    input: 'https://www.vinted.fr/catalog?search_text=zara',
    expected: null },
  { name: 'member profile → null',
    input: 'https://www.vinted.fr/member/12345',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://notvinted.fr/items/1-x',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenVintedUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isVintedHost: vinted.fr', isVintedHost('vinted.fr'), true);
check('isVintedHost: www.vinted.co.uk', isVintedHost('www.vinted.co.uk'), true);
check('isVintedHost: vinted.ro', isVintedHost('vinted.ro'), true);
check('isVintedHost: notvinted.fr', isVintedHost('notvinted.fr'), false);
check('isPostUrl: item', isPostUrl('https://vinted.fr/items/1-x'), true);
check('isPostUrl: catalog', isPostUrl('https://vinted.fr/catalog?search_text=x'), false);
check('shorten on garbage', shortenVintedUrl('not a url'), null);
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
