const path = require('path');
const {
  shortenTiktokUrl,
  needsShortening,
  isTiktokHost,
  isPostUrl,
} = require(path.join('..', 'src', 'tiktok.js'));

const CASES = [
  { name: 'video: tracking params stripped',
    input: 'https://www.tiktok.com/@user/video/1234567890?is_from_webapp=1&sender_device=pc&web_id=abc',
    expected: 'https://www.tiktok.com/@user/video/1234567890' },
  { name: 'video: long URL with many params',
    input: 'https://www.tiktok.com/@user/video/1234567890?_d=secCgYIASAHKAESPgo8&_r=1&checksum=abc&iid=def&q=&sender_device=pc&u_code=foo',
    expected: 'https://www.tiktok.com/@user/video/1234567890' },
  { name: 'photo post',
    input: 'https://www.tiktok.com/@user/photo/1234567890?is_from_webapp=1',
    expected: 'https://www.tiktok.com/@user/photo/1234567890' },
  { name: '/t/ short link',
    input: 'https://www.tiktok.com/t/abc123/?is_from_webapp=1',
    expected: 'https://www.tiktok.com/t/abc123/' },
  { name: 'vm.tiktok.com short',
    input: 'https://vm.tiktok.com/abc123/?is_from_webapp=1',
    expected: 'https://vm.tiktok.com/abc123/' },
  { name: 'vt.tiktok.com short',
    input: 'https://vt.tiktok.com/abc123/?is_from_webapp=1',
    expected: 'https://vt.tiktok.com/abc123/' },
  { name: 'm.tiktok.com mobile',
    input: 'https://m.tiktok.com/@user/video/1234567890?ref=web',
    expected: 'https://m.tiktok.com/@user/video/1234567890' },
  { name: 'hash dropped',
    input: 'https://www.tiktok.com/@user/video/1234567890#hash',
    expected: 'https://www.tiktok.com/@user/video/1234567890' },
  { name: 'already clean',
    input: 'https://www.tiktok.com/@user/video/1234567890',
    expected: 'https://www.tiktok.com/@user/video/1234567890',
    expectedNeeds: false },
  { name: 'profile page → null',
    input: 'https://www.tiktok.com/@user',
    expected: null },
  { name: 'home → null',
    input: 'https://www.tiktok.com/',
    expected: null },
  { name: 'foryou → null',
    input: 'https://www.tiktok.com/foryou',
    expected: null },
  { name: 'non-TikTok → null',
    input: 'https://www.google.com/?q=tiktok',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenTiktokUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isTiktokHost: tiktok.com', isTiktokHost('tiktok.com'), true);
check('isTiktokHost: vm.tiktok.com', isTiktokHost('vm.tiktok.com'), true);
check('isTiktokHost: vt.tiktok.com', isTiktokHost('vt.tiktok.com'), true);
check('isTiktokHost: tiktok-clone.com', isTiktokHost('tiktok-clone.com'), false);
check('isPostUrl: /@user/video/', isPostUrl('https://www.tiktok.com/@u/video/123'), true);
check('isPostUrl: profile', isPostUrl('https://www.tiktok.com/@user'), false);
check('shorten on garbage', shortenTiktokUrl('not a url'), null);
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
