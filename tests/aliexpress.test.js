const path = require('path');
const {
  shortenAliexpressUrl,
  needsShortening,
  isAliexpressHost,
  isPostUrl,
} = require(path.join('..', 'src', 'aliexpress.js'));

const CASES = [

  { name: 'item already clean',
    input: 'https://www.aliexpress.com/item/1005001234567890.html',
    expected: 'https://www.aliexpress.com/item/1005001234567890.html',
    expectedNeeds: false },
  { name: 'spm + gatewayAdapt + pdp_npi stripped',
    input: 'https://www.aliexpress.com/item/1005001234567890.html?spm=a2g0o.productlist.main.1&gatewayAdapt=glo2usa&pdp_npi=4%40dis%21USD%21blob&_t=abc',
    expected: 'https://www.aliexpress.com/item/1005001234567890.html' },
  { name: 'affiliate junk stripped',
    input: 'https://www.aliexpress.com/item/1005001234567890.html?aff_platform=link-c&aff_trace_key=abc&srcSns=sns_Copy&businessType=ProductDetail&utm_medium=share',
    expected: 'https://www.aliexpress.com/item/1005001234567890.html' },
  { name: 'legacy /i/ form cleaned',
    input: 'https://www.aliexpress.com/i/1005001234567890.html?spm=x',
    expected: 'https://www.aliexpress.com/i/1005001234567890.html' },
  { name: 'aliexpress.us cleaned',
    input: 'https://www.aliexpress.us/item/3256801234567890.html?gatewayAdapt=glo2usa4itemAdapt',
    expected: 'https://www.aliexpress.us/item/3256801234567890.html' },
  { name: 'locale subdomain cleaned',
    input: 'https://es.aliexpress.com/item/1005001.html?spm=abc',
    expected: 'https://es.aliexpress.com/item/1005001.html' },
  { name: 'hash preserved',
    input: 'https://www.aliexpress.com/item/1.html?spm=x#nav-review',
    expected: 'https://www.aliexpress.com/item/1.html#nav-review' },
  { name: 'category page → null',
    input: 'https://www.aliexpress.com/category/100003109/women-clothing.html',
    expected: null },
  { name: 'store page → null',
    input: 'https://www.aliexpress.com/store/1101234567',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://aliexpress.shop/item/1.html',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenAliexpressUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isAliexpressHost: aliexpress.com', isAliexpressHost('aliexpress.com'), true);
check('isAliexpressHost: www.aliexpress.us', isAliexpressHost('www.aliexpress.us'), true);
check('isAliexpressHost: aliexpress.shop', isAliexpressHost('aliexpress.shop'), false);
check('isPostUrl: item', isPostUrl('https://aliexpress.com/item/1.html'), true);
check('isPostUrl: category', isPostUrl('https://aliexpress.com/category/1/x.html'), false);
check('shorten on garbage', shortenAliexpressUrl('not a url'), null);
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
