const path = require('path');
const {
  shortenFlipkartUrl,
  needsShortening,
  isFlipkartHost,
  isPostUrl,
} = require(path.join('..', 'src', 'flipkart.js'));

const CASES = [

  { name: 'product with pid already clean',
    input: 'https://www.flipkart.com/some-phone-blue-128-gb/p/itm6ac6485515ae4?pid=MOBGHWFHECFVGHDA',
    expected: 'https://www.flipkart.com/some-phone-blue-128-gb/p/itm6ac6485515ae4?pid=MOBGHWFHECFVGHDA',
    expectedNeeds: false },
  { name: 'pid PRESERVED, tracking stripped',
    input: 'https://www.flipkart.com/some-phone-blue-128-gb/p/itm6ac6485515ae4?pid=MOBGHWFHECFVGHDA&lid=LSTMOBGHWFHECFVGHDAAB1C&marketplace=FLIPKART&store=tyy%2F4io&srno=b_1_1&otracker=browse&fm=organic&iid=abc-123&ppt=browse&ppn=browse&ssid=xyz',
    expected: 'https://www.flipkart.com/some-phone-blue-128-gb/p/itm6ac6485515ae4?pid=MOBGHWFHECFVGHDA' },
  { name: 'no pid: all junk stripped',
    input: 'https://www.flipkart.com/product-slug/p/itmabc123?cmpid=content_appliance&affid=xyz',
    expected: 'https://www.flipkart.com/product-slug/p/itmabc123' },
  { name: 'hash preserved',
    input: 'https://www.flipkart.com/x/p/itmabc?lid=x#specs',
    expected: 'https://www.flipkart.com/x/p/itmabc#specs' },
  { name: 'search page → null',
    input: 'https://www.flipkart.com/search?q=phone',
    expected: null },
  { name: 'category browse → null',
    input: 'https://www.flipkart.com/mobiles/pr?sid=tyy%2C4io',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://notflipkart.com/x/p/itmabc',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenFlipkartUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isFlipkartHost: flipkart.com', isFlipkartHost('flipkart.com'), true);
check('isFlipkartHost: www.flipkart.com', isFlipkartHost('www.flipkart.com'), true);
check('isFlipkartHost: notflipkart.com', isFlipkartHost('notflipkart.com'), false);
check('isPostUrl: product', isPostUrl('https://flipkart.com/x/p/itmabc'), true);
check('isPostUrl: search', isPostUrl('https://flipkart.com/search?q=x'), false);
check('shorten on garbage', shortenFlipkartUrl('not a url'), null);
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
