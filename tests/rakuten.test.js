const path = require('path');
const {
  shortenRakutenUrl,
  needsShortening,
  isRakutenHost,
  isPostUrl,
} = require(path.join('..', 'src', 'rakuten.js'));

const CASES = [

  { name: 'item already clean',
    input: 'https://item.rakuten.co.jp/someshop/item-code-123/',
    expected: 'https://item.rakuten.co.jp/someshop/item-code-123/',
    expectedNeeds: false },
  { name: 'affiliate rafcid stripped',
    input: 'https://item.rakuten.co.jp/someshop/item-code-123/?rafcid=wsc_i_is_1234567890&s-id=top_normal',
    expected: 'https://item.rakuten.co.jp/someshop/item-code-123/' },
  { name: 'scid + icm junk stripped',
    input: 'https://item.rakuten.co.jp/shop2/abc123/?scid=af_pc_etc&icm_cid=123&icm_agid=456&iasid=07rpp_10095',
    expected: 'https://item.rakuten.co.jp/shop2/abc123/' },
  { name: 'variantId (SKU selector) PRESERVED',
    input: 'https://item.rakuten.co.jp/someshop/item-code-123/?variantId=987654&scid=af_pc',
    expected: 'https://item.rakuten.co.jp/someshop/item-code-123/?variantId=987654' },
  { name: 'hash preserved',
    input: 'https://item.rakuten.co.jp/someshop/item/?scid=x#review',
    expected: 'https://item.rakuten.co.jp/someshop/item/#review' },
  { name: 'shop top page (one segment) → null',
    input: 'https://item.rakuten.co.jp/someshop/',
    expected: null },
  { name: 'deep path (3 segments) → null',
    input: 'https://item.rakuten.co.jp/shop/item/extra/',
    expected: null },
  { name: 'www.rakuten.co.jp → null (only item. subdomain)',
    input: 'https://www.rakuten.co.jp/someshop/item/',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://item.rakuten.co.jp.evil.com/shop/item/',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenRakutenUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isRakutenHost: item.rakuten.co.jp', isRakutenHost('item.rakuten.co.jp'), true);
check('isRakutenHost: www.rakuten.co.jp', isRakutenHost('www.rakuten.co.jp'), false);
check('isRakutenHost: books.rakuten.co.jp', isRakutenHost('books.rakuten.co.jp'), false);
check('isPostUrl: item', isPostUrl('https://item.rakuten.co.jp/shop/item/'), true);
check('isPostUrl: shop top', isPostUrl('https://item.rakuten.co.jp/shop/'), false);
check('shorten on garbage', shortenRakutenUrl('not a url'), null);
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
