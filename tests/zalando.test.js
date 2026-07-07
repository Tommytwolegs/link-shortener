const path = require('path');
const {
  shortenZalandoUrl,
  needsShortening,
  isZalandoHost,
  isPostUrl,
} = require(path.join('..', 'src', 'zalando.js'));

const VALID_HOST = 'www.zalando.de';

const CASES = [
  { name: 'article already clean',
    input: 'https://www.zalando.de/nike-sportswear-club-hoodie-ni122s0cw-q11.html',
    expected: 'https://www.zalando.de/nike-sportswear-club-hoodie-ni122s0cw-q11.html',
    expectedNeeds: false },
  { name: 'size PRESERVED, wmc stripped',
    input: 'https://www.zalando.de/nike-sportswear-club-hoodie-ni122s0cw-q11.html?size=L&wmc=SEM123&opc=2211',
    expected: 'https://www.zalando.de/nike-sportswear-club-hoodie-ni122s0cw-q11.html?size=L' },
  { name: 'cd_* junk stripped',
    input: 'https://www.zalando.fr/adidas-originals-baskets-ad112b0pv-a11.html?cd_source=reco&cd_type=pdp',
    expected: 'https://www.zalando.fr/adidas-originals-baskets-ad112b0pv-a11.html' },
  { name: 'hash preserved',
    input: 'https://www.zalando.co.uk/x-ab123c0de-f11.html?wmc=a#reviews',
    expected: 'https://www.zalando.co.uk/x-ab123c0de-f11.html#reviews' },
  { name: 'category page → null',
    input: 'https://www.zalando.de/herrenbekleidung-pullover/',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://notzalando.de/x-ab123c0de-f11.html',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenZalandoUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('host: valid', isZalandoHost(VALID_HOST), true);
check('host: lookalike suffix', isZalandoHost(VALID_HOST + '.evil.com'), false);
check('shorten on garbage', shortenZalandoUrl('not a url'), null);
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
