const path = require('path');
const mod = require(path.join('..', 'src', 'yelp.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'biz page already clean',
    input: 'https://www.yelp.com/biz/blue-star-donuts-portland',
    expected: 'https://www.yelp.com/biz/blue-star-donuts-portland', expectedNeeds: false },
  { name: 'osq search-query leak stripped',
    input: 'https://www.yelp.com/biz/blue-star-donuts-portland?osq=best+donuts+near+me',
    expected: 'https://www.yelp.com/biz/blue-star-donuts-portland' },
  { name: 'hrid review deep-link kept, utm stripped',
    input: 'https://www.yelp.com/biz/blue-star-donuts-portland?hrid=AbC123xYz&utm_source=ishare',
    expected: 'https://www.yelp.com/biz/blue-star-donuts-portland?hrid=AbC123xYz' },
  { name: 'ccTLD covered',
    input: 'https://www.yelp.co.uk/biz/dishoom-london?osq=curry',
    expected: 'https://www.yelp.co.uk/biz/dishoom-london' },
  { name: 'lookalike -> null',
    input: 'https://notyelp.com/biz/x?osq=a', expected: null },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenYelpUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: yelp.com', mod.isYelpHost('www.yelp.com'), true);
check('host: yelp.com.au', mod.isYelpHost('www.yelp.com.au'), true);
check('host: lookalike', mod.isYelpHost('yelpreviews.com'), false);
check('shorten on garbage', mod.shortenYelpUrl('not a url'), null);
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
