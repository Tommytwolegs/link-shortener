// Unit tests for src/dailymotion.js — runnable with plain Node, no dependencies.
//
// Usage: node tests/dailymotion.test.js

const path = require('path');
const {
  shortenDailymotionUrl,
  needsShortening,
  isDailymotionHost,
  isPostUrl,
} = require(path.join('..', 'src', 'dailymotion.js'));

const CASES = [
  { name: 'video: start (timestamp) kept, junk stripped',
    input: 'https://www.dailymotion.com/video/x8abc12?start=30&utm_source=x&from=foo',
    expected: 'https://www.dailymotion.com/video/x8abc12?start=30' },
  { name: 'video: playlist context kept',
    input: 'https://www.dailymotion.com/video/x8abc12?playlist=x9zzz&utm_medium=share',
    expected: 'https://www.dailymotion.com/video/x8abc12?playlist=x9zzz' },
  { name: 'video: already clean',
    input: 'https://www.dailymotion.com/video/x8abc12',
    expected: 'https://www.dailymotion.com/video/x8abc12',
    expectedNeeds: false },
  { name: 'video: hash preserved',
    input: 'https://www.dailymotion.com/video/x8abc12?utm_source=x#comments',
    expected: 'https://www.dailymotion.com/video/x8abc12#comments' },
  { name: 'dai.ly short: strips all query',
    input: 'https://dai.ly/x8abc12?utm_source=x',
    expected: 'https://dai.ly/x8abc12' },
  { name: 'dai.ly short: already clean',
    input: 'https://dai.ly/x8abc12',
    expected: 'https://dai.ly/x8abc12',
    expectedNeeds: false },
  { name: 'profile: utm stripped via fallback',
    input: 'https://www.dailymotion.com/somecreator?utm_source=x',
    expected: 'https://www.dailymotion.com/somecreator' },
  { name: 'lookalike host → null',
    input: 'https://notdailymotion.com/video/x8abc12',
    expected: null },
  { name: 'dailymotion.com.evil.com → null',
    input: 'https://dailymotion.com.evil.com/video/x1',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  check('shorten - ' + c.name, shortenDailymotionUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}

check('isDailymotionHost: dailymotion.com', isDailymotionHost('www.dailymotion.com'), true);
check('isDailymotionHost: dai.ly', isDailymotionHost('dai.ly'), true);
check('isDailymotionHost: notdailymotion.com', isDailymotionHost('notdailymotion.com'), false);
check('isPostUrl: video true', isPostUrl('https://www.dailymotion.com/video/x1'), true);
check('isPostUrl: profile false', isPostUrl('https://www.dailymotion.com/creator'), false);
check('shorten on garbage', shortenDailymotionUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) {
  for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual);
  process.exit(1);
}
