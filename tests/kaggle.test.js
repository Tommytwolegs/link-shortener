// Unit tests for src/kaggle.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenKaggleUrl, needsShortening, isKaggleHost, isPostUrl } =
  require(path.join('..', 'src', 'kaggle.js'));

const CASES = [
  { name: 'path kept, utm stripped',
    input: 'https://kaggle.com/datasets/x/titanic?utm_source=share&fbclid=z',
    expected: 'https://kaggle.com/datasets/x/titanic' },
  { name: 'already clean',
    input: 'https://kaggle.com/datasets/x/titanic',
    expected: 'https://kaggle.com/datasets/x/titanic',
    expectedNeeds: false },
  { name: 'hash (line anchor) preserved',
    input: 'https://kaggle.com/datasets/x/titanic?utm_source=x#L10-L20',
    expected: 'https://kaggle.com/datasets/x/titanic#L10-L20' },
  { name: 'lookalike host -> null',
    input: 'https://notkaggle.com/datasets/x/titanic?utm_source=x',
    expected: null },
  { name: 'kaggle.com.evil.com -> null',
    input: 'https://kaggle.com.evil.com/datasets/x/titanic?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) { if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); } }
for (const c of CASES) {
  check('shorten - ' + c.name, shortenKaggleUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isKaggleHost: kaggle.com', isKaggleHost('kaggle.com'), true);
check('isKaggleHost: notkaggle.com', isKaggleHost('notkaggle.com'), false);
check('isKaggleHost: kaggle.com.evil.com', isKaggleHost('kaggle.com.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://kaggle.com/datasets/x/titanic?utm_source=x'), true);
check('shorten on garbage', shortenKaggleUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
