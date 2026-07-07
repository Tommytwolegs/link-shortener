const path = require('path');
const {
  shortenBilibiliUrl,
  needsShortening,
  isBilibiliHost,
  isPostUrl,
} = require(path.join('..', 'src', 'bilibili.js'));

const CASES = [
  { name: 'video already clean',
    input: 'https://www.bilibili.com/video/BV1xx411c7mD',
    expected: 'https://www.bilibili.com/video/BV1xx411c7mD',
    expectedNeeds: false },
  { name: 'share junk avalanche stripped',
    input: 'https://www.bilibili.com/video/BV1xx411c7mD?spm_id_from=333.999.0.0&vd_source=abc123&share_source=weixin&share_medium=android&share_plat=android&share_session_id=xyz&unique_k=abc&bbid=infoc&ts=1700000000',
    expected: 'https://www.bilibili.com/video/BV1xx411c7mD' },
  { name: 't timestamp PRESERVED',
    input: 'https://www.bilibili.com/video/BV1xx411c7mD?t=125&spm_id_from=333',
    expected: 'https://www.bilibili.com/video/BV1xx411c7mD?t=125' },
  { name: 'p part number PRESERVED',
    input: 'https://www.bilibili.com/video/BV1xx411c7mD?p=3&vd_source=x',
    expected: 'https://www.bilibili.com/video/BV1xx411c7mD?p=3' },
  { name: 'legacy av id cleaned',
    input: 'https://www.bilibili.com/video/av170001?spm_id_from=x',
    expected: 'https://www.bilibili.com/video/av170001' },
  { name: 'b23.tv short link cleaned',
    input: 'https://b23.tv/AbCd3f?share_medium=android',
    expected: 'https://b23.tv/AbCd3f' },
  { name: 'hash preserved',
    input: 'https://www.bilibili.com/video/BV1a?spm_id_from=x#reply',
    expected: 'https://www.bilibili.com/video/BV1a#reply' },
  { name: 'space page → null',
    input: 'https://space.bilibili.com/123456',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://bilibili.com.evil.com/video/BV1a',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenBilibiliUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('host: valid', isBilibiliHost('www.bilibili.com'), true);
check('host: b23.tv', isBilibiliHost('b23.tv'), true);
check('host: lookalike', isBilibiliHost('bilibili.com.evil.com'), false);
check('shorten on garbage', shortenBilibiliUrl('not a url'), null);
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
