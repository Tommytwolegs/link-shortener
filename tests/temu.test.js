const path = require('path');
const {
  shortenTemuUrl,
  needsShortening,
  isTemuHost,
  isPostUrl,
} = require(path.join('..', 'src', 'temu.js'));

const CASES = [

  { name: 'slug form already clean',
    input: 'https://www.temu.com/cool-gadget-g-601099512345678.html',
    expected: 'https://www.temu.com/cool-gadget-g-601099512345678.html',
    expectedNeeds: false },
  { name: 'refer_page junk stripped',
    input: 'https://www.temu.com/cool-gadget-g-601099512345678.html?_bg_fs=1&refer_page_name=home&refer_page_id=10005_123&refer_page_sn=10005&_x_sessn_id=abc123',
    expected: 'https://www.temu.com/cool-gadget-g-601099512345678.html' },
  { name: 'sku_id (variant selector) PRESERVED',
    input: 'https://www.temu.com/cool-gadget-g-601099512345678.html?sku_id=17592186044417&refer_page_name=search',
    expected: 'https://www.temu.com/cool-gadget-g-601099512345678.html?sku_id=17592186044417' },
  { name: 'goods.html form: goods_id + sku_id kept, junk stripped',
    input: 'https://www.temu.com/goods.html?goods_id=601099512345678&sku_id=175921&refer_page_sn=10005&top_gallery_url=https%3A%2F%2Fimg.temu.com%2Fx.jpg',
    expected: 'https://www.temu.com/goods.html?goods_id=601099512345678&sku_id=175921' },
  { name: 'goods.html without goods_id → null',
    input: 'https://www.temu.com/goods.html?refer_page_sn=10005',
    expected: null },
  { name: 'slugless g- form cleaned',
    input: 'https://www.temu.com/g-601099512345678.html?share_img=x',
    expected: 'https://www.temu.com/g-601099512345678.html' },
  { name: 'hash preserved',
    input: 'https://www.temu.com/x-g-1.html?_bg_fs=1#goods-review',
    expected: 'https://www.temu.com/x-g-1.html#goods-review' },
  { name: 'category page → null',
    input: 'https://www.temu.com/best-sellers-o3-1.html',
    expected: null },
  { name: 'home → null',
    input: 'https://www.temu.com/',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://nottemu.com/x-g-1.html',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenTemuUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isTemuHost: temu.com', isTemuHost('temu.com'), true);
check('isTemuHost: www.temu.com', isTemuHost('www.temu.com'), true);
check('isTemuHost: nottemu.com', isTemuHost('nottemu.com'), false);
check('isPostUrl: goods', isPostUrl('https://temu.com/x-g-1.html'), true);
check('isPostUrl: home', isPostUrl('https://temu.com/'), false);
check('shorten on garbage', shortenTemuUrl('not a url'), null);
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
