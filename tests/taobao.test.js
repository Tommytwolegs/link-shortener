const path = require('path');
const {
  shortenTaobaoUrl,
  needsShortening,
  isTaobaoHost,
  isPostUrl,
} = require(path.join('..', 'src', 'taobao.js'));

const VALID_HOST = 'item.taobao.com';

const CASES = [
  { name: 'item id KEPT, spm junk stripped',
    input: 'https://item.taobao.com/item.htm?id=678901234567&spm=a21n57.1.0.0&ali_refid=a3_43&ut_sk=1.XYZ',
    expected: 'https://item.taobao.com/item.htm?id=678901234567' },
  { name: 'skuId variant KEPT',
    input: 'https://item.taobao.com/item.htm?id=678901234567&skuId=51234&spm=a1z10',
    expected: 'https://item.taobao.com/item.htm?id=678901234567&skuId=51234' },
  { name: 'tmall detail cleaned',
    input: 'https://detail.tmall.com/item.htm?id=598765432109&spm=a220m.1000858&sourceType=item',
    expected: 'https://detail.tmall.com/item.htm?id=598765432109' },
  { name: 'already clean',
    input: 'https://item.taobao.com/item.htm?id=1',
    expected: 'https://item.taobao.com/item.htm?id=1',
    expectedNeeds: false },
  { name: 'item.htm without id → null',
    input: 'https://item.taobao.com/item.htm?spm=a21n57',
    expected: null },
  { name: 'shop page → null',
    input: 'https://shop123.taobao.com/index.htm',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://taobao.com.evil.com/item.htm?id=1',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenTaobaoUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('host: valid', isTaobaoHost(VALID_HOST), true);
check('host: lookalike suffix', isTaobaoHost(VALID_HOST + '.evil.com'), false);
check('shorten on garbage', shortenTaobaoUrl('not a url'), null);
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
