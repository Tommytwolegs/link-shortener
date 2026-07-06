const path = require('path');
const {
  shortenShopeeUrl,
  needsShortening,
  isShopeeHost,
  isPostUrl,
} = require(path.join('..', 'src', 'shopee.js'));

const CASES = [

  { name: 'slug form already clean',
    input: 'https://shopee.sg/Wireless-Mouse-Ergonomic-i.12345678.987654321',
    expected: 'https://shopee.sg/Wireless-Mouse-Ergonomic-i.12345678.987654321',
    expectedNeeds: false },
  { name: 'sp_atk + xptdk stripped',
    input: 'https://shopee.sg/Wireless-Mouse-Ergonomic-i.12345678.987654321?sp_atk=abc123&xptdk=def456',
    expected: 'https://shopee.sg/Wireless-Mouse-Ergonomic-i.12345678.987654321' },
  { name: 'publish_id + from_meta stripped',
    input: 'https://shopee.co.id/Produk-Bagus-i.111.222?publish_id=xyz&from_meta=1&utm_source=share',
    expected: 'https://shopee.co.id/Produk-Bagus-i.111.222' },
  { name: 'bare /product/ form cleaned',
    input: 'https://shopee.ph/product/12345678/987654321?smtt=0.1',
    expected: 'https://shopee.ph/product/12345678/987654321' },
  { name: 'shp.ee short link cleaned',
    input: 'https://shp.ee/abc123?smtt=9',
    expected: 'https://shp.ee/abc123' },
  { name: 'Brazil TLD cleaned',
    input: 'https://shopee.com.br/Produto-Legal-i.333.444?sp_atk=x',
    expected: 'https://shopee.com.br/Produto-Legal-i.333.444' },
  { name: 'Taiwan TLD already clean',
    input: 'https://shopee.tw/Item-i.1.2',
    expected: 'https://shopee.tw/Item-i.1.2',
    expectedNeeds: false },
  { name: 'hash preserved',
    input: 'https://shopee.sg/Item-i.1.2?sp_atk=x#reviews',
    expected: 'https://shopee.sg/Item-i.1.2#reviews' },
  { name: 'search page → null',
    input: 'https://shopee.sg/search?keyword=mouse',
    expected: null },
  { name: 'shop page → null',
    input: 'https://shopee.sg/someshop',
    expected: null },
  { name: 'home → null',
    input: 'https://shopee.sg/',
    expected: null },
  { name: 'lookalike host → null',
    input: 'https://notshopee.sg/Item-i.1.2',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenShopeeUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isShopeeHost: shopee.sg', isShopeeHost('shopee.sg'), true);
check('isShopeeHost: shopee.tw', isShopeeHost('shopee.tw'), true);
check('isShopeeHost: shp.ee', isShopeeHost('shp.ee'), true);
check('isShopeeHost: shopee.evil.com', isShopeeHost('shopee.evil.com'), false);
check('isPostUrl: item', isPostUrl('https://shopee.sg/X-i.1.2'), true);
check('isPostUrl: search', isPostUrl('https://shopee.sg/search?keyword=x'), false);
check('shorten on garbage', shortenShopeeUrl('not a url'), null);
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
