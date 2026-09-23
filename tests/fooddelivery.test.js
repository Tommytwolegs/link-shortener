const path = require('path');
const {
  shortenFooddeliveryUrl,
  needsShortening,
  isFooddeliveryHost,
  isPostUrl,
  storageKeyFor,
  DELIVERY_SITES,
} = require(path.join('..', 'src', 'fooddelivery.js'));

const CASES = [
  // Canonical
  { name: 'doordash store page already clean',
    input: 'https://www.doordash.com/store/taco-shop-san-diego-123456/',
    expected: 'https://www.doordash.com/store/taco-shop-san-diego-123456/',
    expectedNeeds: false },

  // DoorDash
  { name: 'doordash campaign junk stripped (utm/event_type)',
    input: 'https://www.doordash.com/store/taco-shop-san-diego-123456/?event_type=autocomplete&utm_source=share&utm_campaign=referral',
    expected: 'https://www.doordash.com/store/taco-shop-san-diego-123456/' },
  { name: 'doordash pickup mode survives',
    input: 'https://www.doordash.com/store/taco-shop-san-diego-123456/?pickup=true&utm_source=share',
    expected: 'https://www.doordash.com/store/taco-shop-san-diego-123456/?pickup=true' },

  // Uber Eats — functional params must survive
  { name: 'ubereats diningMode survives, fbclid goes',
    input: 'https://www.ubereats.com/store/burger-place/abcd-1234-ef56?diningMode=PICKUP&fbclid=IwAR7z',
    expected: 'https://www.ubereats.com/store/burger-place/abcd-1234-ef56?diningMode=PICKUP' },
  { name: 'ubereats modal state + promo survive',
    input: 'https://www.ubereats.com/store/burger-place/abcd-1234-ef56?mod=quickView&modctx=%7B%22storeUuid%22%3A%22abcd%22%7D&promotionUuid=promo-1&utm_medium=social',
    expected: 'https://www.ubereats.com/store/burger-place/abcd-1234-ef56?mod=quickView&modctx=%7B%22storeUuid%22%3A%22abcd%22%7D&promotionUuid=promo-1' },

  // Grubhub
  { name: 'grubhub ad-click ids stripped',
    input: 'https://www.grubhub.com/restaurant/pizza-palace-123456/menu?gclid=Cj0abc&msclkid=b2f1',
    expected: 'https://www.grubhub.com/restaurant/pizza-palace-123456/menu' },

  // Instacart
  { name: 'instacart email campaign junk stripped, hash preserved',
    input: 'https://www.instacart.com/store/costco/storefront?utm_source=braze&utm_campaign=weekly&mc_eid=a1b2#deals',
    expected: 'https://www.instacart.com/store/costco/storefront#deals' },

  // event_type is doordash-only: must NOT be stripped elsewhere
  { name: 'event_type survives on grubhub (doordash-only extra)',
    input: 'https://www.grubhub.com/search?event_type=keepme',
    expected: 'https://www.grubhub.com/search?event_type=keepme',
    expectedNeeds: false },

  // Non-delivery
  { name: 'lookalike -> null',
    input: 'https://doordash.example.com/store/x?utm_source=share',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenFooddeliveryUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}

check('4 sites in the table', DELIVERY_SITES.length, 4);
check('isFooddeliveryHost: doordash', isFooddeliveryHost('www.doordash.com'), true);
check('isFooddeliveryHost: ubereats', isFooddeliveryHost('www.ubereats.com'), true);
check('isFooddeliveryHost: lookalike', isFooddeliveryHost('doordash.example.com'), false);
check('isPostUrl: has junk', isPostUrl('https://www.grubhub.com/x?gclid=1'), true);
check('isPostUrl: clean', isPostUrl('https://www.grubhub.com/x'), false);
check('storageKeyFor: instacart', storageKeyFor('www.instacart.com'), 'enabledInstacart');
check('storageKeyFor: ubereats', storageKeyFor('ubereats.com'), 'enabledUbereats');
check('storageKeyFor: non-site', storageKeyFor('example.com'), null);
check('site keys unique', new Set(DELIVERY_SITES.map((s) => s.key)).size, DELIVERY_SITES.length);
check('shorten on garbage', shortenFooddeliveryUrl('not a url'), null);
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
