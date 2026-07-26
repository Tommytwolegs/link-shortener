// Unit tests for src/realtor.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenRealtorUrl, needsShortening, isRealtorHost, isPostUrl } =
  require(path.join('..', 'src', 'realtor.js'));

const CASES = [
  { name: 'detail: M<id> path kept, utm + cid stripped',
    input: 'https://www.realtor.com/realestateandhomes-detail/123-Main-St_SF_CA_94103_M12345-67890?utm_medium=x&cid=abc',
    expected: 'https://www.realtor.com/realestateandhomes-detail/123-Main-St_SF_CA_94103_M12345-67890' },
  { name: 'detail: already clean',
    input: 'https://www.realtor.com/realestateandhomes-detail/x_M1-2',
    expected: 'https://www.realtor.com/realestateandhomes-detail/x_M1-2',
    expectedNeeds: false },
  { name: 'identityID stripped',
    input: 'https://www.realtor.com/realestateandhomes-detail/x_M1-2?identityID=zzz',
    expected: 'https://www.realtor.com/realestateandhomes-detail/x_M1-2' },
  { name: 'hash preserved',
    input: 'https://www.realtor.com/realestateandhomes-detail/x_M1-2?utm_source=x#map',
    expected: 'https://www.realtor.com/realestateandhomes-detail/x_M1-2#map' },
  { name: 'lookalike → null',
    input: 'https://notrealtor.com/realestateandhomes-detail/x_M1-2?utm_source=x',
    expected: null },
  { name: 'realtor.com.evil.com → null',
    input: 'https://realtor.com.evil.com/realestateandhomes-detail/x_M1-2?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  check('shorten - ' + c.name, shortenRealtorUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isRealtorHost: www.realtor.com', isRealtorHost('www.realtor.com'), true);
check('isRealtorHost: notrealtor.com', isRealtorHost('notrealtor.com'), false);
check('isRealtorHost: realtor.com.evil.com', isRealtorHost('realtor.com.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://www.realtor.com/x?utm_source=x'), true);
check('shorten on garbage', shortenRealtorUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
