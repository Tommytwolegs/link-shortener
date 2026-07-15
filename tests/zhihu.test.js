const path = require('path');
const mod = require(path.join('..', 'src', 'zhihu.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'already clean',
    input: 'https://www.zhihu.com/question/123456789/answer/987654321',
    expected: 'https://www.zhihu.com/question/123456789/answer/987654321', expectedNeeds: false },
  { name: 'utm + ad-click junk stripped',
    input: 'https://www.zhihu.com/question/123456789/answer/987654321?utm_source=share&gclid=abc&fbclid=IwAR1&cjevent=xyz',
    expected: 'https://www.zhihu.com/question/123456789/answer/987654321' },
  { name: 'lookalike -> null',
    input: 'https://notzhihu.com/question/123456789/answer/987654321?utm_source=a', expected: null },
  { name: 'utm_psn share token stripped',
    input: 'https://www.zhihu.com/question/123456789/answer/987654321?utm_psn=1790123456789012480',
    expected: 'https://www.zhihu.com/question/123456789/answer/987654321' },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenZhihuUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: primary', mod.isZhihuHost('www.zhihu.com'), true);
check('host: lookalike', mod.isZhihuHost('notzhihu.com'), false);
check('shorten on garbage', mod.shortenZhihuUrl('not a url'), null);
check('needs on garbage', mod.needsShortening('not a url'), false);

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
