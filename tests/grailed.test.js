// Unit tests for src/grailed.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenGrailedUrl, needsShortening, isGrailedHost, isPostUrl } =
  require(path.join('..', 'src', 'grailed.js'));

const CASES = [
  { name: 'listing: path kept, g_aidx/g_aci + utm stripped',
    input: 'https://www.grailed.com/listings/12345-cool-tee?g_aidx=Listing_production&g_aci=1&utm_source=x',
    expected: 'https://www.grailed.com/listings/12345-cool-tee' },
  { name: 'listing: already clean',
    input: 'https://www.grailed.com/listings/12345-cool-tee',
    expected: 'https://www.grailed.com/listings/12345-cool-tee',
    expectedNeeds: false },
  { name: 'hash preserved',
    input: 'https://www.grailed.com/listings/1-x?utm_source=x#photos',
    expected: 'https://www.grailed.com/listings/1-x#photos' },
  { name: 'lookalike → null',
    input: 'https://notgrailed.com/listings/1-x?utm_source=x',
    expected: null },
  { name: 'grailed.com.evil.com → null',
    input: 'https://grailed.com.evil.com/listings/1-x?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) { if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); } }
for (const c of CASES) {
  check('shorten - ' + c.name, shortenGrailedUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isGrailedHost: www.grailed.com', isGrailedHost('www.grailed.com'), true);
check('isGrailedHost: notgrailed.com', isGrailedHost('notgrailed.com'), false);
check('isGrailedHost: grailed.com.evil.com', isGrailedHost('grailed.com.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://www.grailed.com/listings/x?g_aidx=y'), true);
check('shorten on garbage', shortenGrailedUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
