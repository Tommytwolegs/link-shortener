// Unit tests for src/redfin.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenRedfinUrl, needsShortening, isRedfinHost, isPostUrl } =
  require(path.join('..', 'src', 'redfin.js'));

const CASES = [
  { name: 'home: path kept, utm + riftinfo stripped',
    input: 'https://www.redfin.com/CA/San-Francisco/123-Main-St-94103/home/1234567?utm_source=x&riftinfo=abc',
    expected: 'https://www.redfin.com/CA/San-Francisco/123-Main-St-94103/home/1234567' },
  { name: 'home: already clean',
    input: 'https://www.redfin.com/CA/San-Francisco/123-Main-St-94103/home/1234567',
    expected: 'https://www.redfin.com/CA/San-Francisco/123-Main-St-94103/home/1234567',
    expectedNeeds: false },
  { name: 'src stripped',
    input: 'https://www.redfin.com/CA/SF/x/home/1?src=email',
    expected: 'https://www.redfin.com/CA/SF/x/home/1' },
  { name: 'hash preserved',
    input: 'https://www.redfin.com/CA/SF/x/home/1?utm_source=x#photos',
    expected: 'https://www.redfin.com/CA/SF/x/home/1#photos' },
  { name: 'lookalike → null',
    input: 'https://notredfin.com/CA/SF/x/home/1?utm_source=x',
    expected: null },
  { name: 'redfin.com.evil.com → null',
    input: 'https://redfin.com.evil.com/CA/SF/x/home/1?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  check('shorten - ' + c.name, shortenRedfinUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isRedfinHost: www.redfin.com', isRedfinHost('www.redfin.com'), true);
check('isRedfinHost: notredfin.com', isRedfinHost('notredfin.com'), false);
check('isRedfinHost: redfin.com.evil.com', isRedfinHost('redfin.com.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://www.redfin.com/x/home/1?utm_source=x'), true);
check('shorten on garbage', shortenRedfinUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
