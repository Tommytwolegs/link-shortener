const path = require('path');
const {
  shortenLazadaUrl,
  needsShortening,
  isLazadaHost,
  isPostUrl,
} = require(path.join('..', 'src', 'lazada.js'));

const CASES = [

  { name: 'product with sku already clean',
    input: 'https://www.lazada.sg/products/nice-mouse-i123456789-s987654321.html',
    expected: 'https://www.lazada.sg/products/nice-mouse-i123456789-s987654321.html',
    expectedNeeds: false },
  { name: 'spm + scm + pvid stripped',
    input: 'https://www.lazada.sg/products/nice-mouse-i123456789-s987654321.html?spm=a2o42.searchlist&scm=1007.x&pvid=abc-def&clickTrackInfo=blob',
    expected: 'https://www.lazada.sg/products/nice-mouse-i123456789-s987654321.html' },
  { name: 'pdp short form cleaned',
    input: 'https://www.lazada.co.th/products/pdp-i123456789.html?laz_trackid=xyz&exlaz=abc',
    expected: 'https://www.lazada.co.th/products/pdp-i123456789.html' },
  { name: 'no-sku form cleaned',
    input: 'https://www.lazada.com.my/products/item-i555.html?from=wangpu&utm_source=share',
    expected: 'https://www.lazada.com.my/products/item-i555.html' },
  { name: 'vn TLD already clean',
    input: 'https://www.lazada.vn/products/x-i1-s2.html',
    expected: 'https://www.lazada.vn/products/x-i1-s2.html',
    expectedNeeds: false },
  { name: 'hash preserved',
    input: 'https://www.lazada.sg/products/x-i1-s2.html?spm=abc#review',
    expected: 'https://www.lazada.sg/products/x-i1-s2.html#review' },
  { name: 'search → null',
    input: 'https://www.lazada.sg/catalog/?q=mouse',
    expected: null },
  { name: 'shop page → null',
    input: 'https://www.lazada.sg/shop/some-store',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://notlazada.sg/products/x-i1.html',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenLazadaUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isLazadaHost: lazada.sg', isLazadaHost('lazada.sg'), true);
check('isLazadaHost: www.lazada.co.id', isLazadaHost('www.lazada.co.id'), true);
check('isLazadaHost: lazada.evil.com', isLazadaHost('lazada.evil.com'), false);
check('isPostUrl: product', isPostUrl('https://www.lazada.sg/products/x-i1.html'), true);
check('isPostUrl: catalog', isPostUrl('https://www.lazada.sg/catalog/?q=x'), false);
check('shorten on garbage', shortenLazadaUrl('not a url'), null);
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
