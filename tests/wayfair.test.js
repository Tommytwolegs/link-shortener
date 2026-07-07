const path = require('path');
const {
  shortenWayfairUrl,
  needsShortening,
  isWayfairHost,
  isPostUrl,
} = require(path.join('..', 'src', 'wayfair.js'));

const VALID_HOST = 'www.wayfair.com';

const CASES = [
  { name: 'category-prefixed pdp (the common form) cleaned',
    input: 'https://www.wayfair.com/furniture/pdp/mercury-row-convertible-sofa-w005404809.html?piid=812%2C813&refid=abc&placement=2',
    expected: 'https://www.wayfair.com/furniture/pdp/mercury-row-convertible-sofa-w005404809.html?piid=812%2C813' },
  { name: 'lighting category prefix cleaned',
    input: 'https://www.wayfair.com/lighting/pdp/three-posts-lamp-w1.html?categoryid=4',
    expected: 'https://www.wayfair.com/lighting/pdp/three-posts-lamp-w1.html' },
  { name: 'two category segments → null (only one allowed)',
    input: 'https://www.wayfair.com/a/b/pdp/x-w1.html',
    expected: null },
  { name: 'pdp already clean',
    input: 'https://www.wayfair.com/pdp/three-posts-sofa-w005644269.html',
    expected: 'https://www.wayfair.com/pdp/three-posts-sofa-w005644269.html',
    expectedNeeds: false },
  { name: 'piid variant PRESERVED, junk stripped',
    input: 'https://www.wayfair.com/pdp/three-posts-sofa-w005644269.html?piid=1257425%2C1257427&categoryid=413&placement=1&refid=abc',
    expected: 'https://www.wayfair.com/pdp/three-posts-sofa-w005644269.html?piid=1257425%2C1257427' },
  { name: 'junk-only stripped',
    input: 'https://www.wayfair.co.uk/pdp/item-ab123.html?refid=FR49&PiID=',
    expected: 'https://www.wayfair.co.uk/pdp/item-ab123.html' },
  { name: 'hash preserved',
    input: 'https://www.wayfair.com/pdp/x-w1.html?refid=a#reviews',
    expected: 'https://www.wayfair.com/pdp/x-w1.html#reviews' },
  { name: 'category page → null',
    input: 'https://www.wayfair.com/furniture/sb0/sofas-c413892.html',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://notwayfair.com/pdp/x-w1.html',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenWayfairUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('host: valid', isWayfairHost(VALID_HOST), true);
check('host: lookalike suffix', isWayfairHost(VALID_HOST + '.evil.com'), false);
check('shorten on garbage', shortenWayfairUrl('not a url'), null);
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
