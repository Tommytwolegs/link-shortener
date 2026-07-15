const path = require('path');
const mod = require(path.join('..', 'src', 'niconico.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'already clean',
    input: 'https://www.nicovideo.jp/watch/sm12345678',
    expected: 'https://www.nicovideo.jp/watch/sm12345678', expectedNeeds: false },
  { name: 'junk stripped',
    input: 'https://www.nicovideo.jp/watch/sm12345678?utm_source=share&gclid=abc&cjevent=xyz',
    expected: 'https://www.nicovideo.jp/watch/sm12345678' },
  { name: 'lookalike -> null',
    input: 'https://notnicovideo.jp/watch/sm12345678?utm_source=a', expected: null },
  { name: 'from= timestamp KEPT, ref stripped',
    input: 'https://www.nicovideo.jp/watch/sm12345678?from=120&ref=search_key_video',
    expected: 'https://www.nicovideo.jp/watch/sm12345678?from=120' },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenNiconicoUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: primary', mod.isNiconicoHost('www.nicovideo.jp'), true);
check('host: lookalike', mod.isNiconicoHost('notnicovideo.jp'), false);
check('shorten on garbage', mod.shortenNiconicoUrl('not a url'), null);
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
