const path = require('path');
const {
  shortenTokopediaUrl,
  needsShortening,
  isTokopediaHost,
  isPostUrl,
} = require(path.join('..', 'src', 'tokopedia.js'));

const CASES = [

  { name: 'product already clean',
    input: 'https://www.tokopedia.com/somestore/produk-bagus-original',
    expected: 'https://www.tokopedia.com/somestore/produk-bagus-original',
    expectedNeeds: false },
  { name: 'extParam + src stripped',
    input: 'https://www.tokopedia.com/somestore/produk-bagus-original?extParam=ivf%3Dfalse%26src%3Dsearch&src=topads&whid=123',
    expected: 'https://www.tokopedia.com/somestore/produk-bagus-original' },
  { name: 'utm_* stripped, unknown params kept (denylist strategy)',
    input: 'https://www.tokopedia.com/somestore/produk?utm_source=share&utm_campaign=x&variant=merah',
    expected: 'https://www.tokopedia.com/somestore/produk?variant=merah' },
  { name: 'refined + trkid stripped',
    input: 'https://www.tokopedia.com/toko2/barang-keren?refined=true&trkid=abc',
    expected: 'https://www.tokopedia.com/toko2/barang-keren' },
  { name: 'hash preserved',
    input: 'https://www.tokopedia.com/toko/barang?src=x#ulasan',
    expected: 'https://www.tokopedia.com/toko/barang#ulasan' },
  { name: 'help page (blocklisted) → null',
    input: 'https://www.tokopedia.com/help/article/apa-itu',
    expected: null },
  { name: 'search (blocklisted) → null',
    input: 'https://www.tokopedia.com/search?st=product&q=mouse',
    expected: null },
  { name: 'discovery (blocklisted) → null',
    input: 'https://www.tokopedia.com/discovery/deals',
    expected: null },
  { name: 'shop page (one segment) → null',
    input: 'https://www.tokopedia.com/somestore',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://nottokopedia.com/store/item',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenTokopediaUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isTokopediaHost: tokopedia.com', isTokopediaHost('tokopedia.com'), true);
check('isTokopediaHost: www.tokopedia.com', isTokopediaHost('www.tokopedia.com'), true);
check('isTokopediaHost: nottokopedia.com', isTokopediaHost('nottokopedia.com'), false);
check('isPostUrl: product', isPostUrl('https://tokopedia.com/store/item'), true);
check('isPostUrl: help', isPostUrl('https://tokopedia.com/help/article'), false);
check('shorten on garbage', shortenTokopediaUrl('not a url'), null);
check('needs on garbage', needsShortening('not a url'), false);
// Mutation guard (denylist module deletes params):
const probe = new URL('https://www.tokopedia.com/store/item?src=x');
check('shorten on URL object', shortenTokopediaUrl(probe), 'https://www.tokopedia.com/store/item');
check('URL-object input not mutated', probe.href, 'https://www.tokopedia.com/store/item?src=x');
check('needs on URL object', needsShortening(new URL('https://www.tokopedia.com/store/item?src=x')), true);
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
