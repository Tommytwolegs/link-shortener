const path = require('path');
const mod = require(path.join('..', 'src', 'shopify.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'product page already clean',
    input: 'https://cool-store.myshopify.com/products/blue-hoodie',
    expected: 'https://cool-store.myshopify.com/products/blue-hoodie', expectedNeeds: false },
  { name: 'search attribution stripped (_pos/_sid/_ss/_psq query leak)',
    input: 'https://cool-store.myshopify.com/products/blue-hoodie?_pos=3&_sid=a1b2c3d4e&_ss=r&_psq=blue+hood',
    expected: 'https://cool-store.myshopify.com/products/blue-hoodie' },
  { name: 'variant + selling_plan survive, rec-widget junk goes',
    input: 'https://cool-store.myshopify.com/products/blue-hoodie?variant=41234567890&selling_plan=123&pr_prod_strat=copurchase&pr_rec_id=abc123&pr_rec_pid=7890&pr_ref_pid=4567&pr_seq=uniform',
    expected: 'https://cool-store.myshopify.com/products/blue-hoodie?variant=41234567890&selling_plan=123' },
  { name: 'srsltid Google Shopping click id stripped',
    input: 'https://cool-store.myshopify.com/products/blue-hoodie?srsltid=AfmBOoq1x2y3',
    expected: 'https://cool-store.myshopify.com/products/blue-hoodie' },
  { name: 'checkout key untouched (never named)',
    input: 'https://cool-store.myshopify.com/checkouts/cn/abc123?key=deadbeef',
    expected: 'https://cool-store.myshopify.com/checkouts/cn/abc123?key=deadbeef', expectedNeeds: false },
  { name: 'lookalike -> null',
    input: 'https://myshopify.com.evil.example/products/x?_pos=1', expected: null },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenShopifyUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: store subdomain', mod.isShopifyHost('cool-store.myshopify.com'), true);
check('host: lookalike', mod.isShopifyHost('notmyshopify.com'), false);
check('shorten on garbage', mod.shortenShopifyUrl('not a url'), null);
check('needs on garbage', mod.needsShortening('not a url'), false);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { console.log('\nFailures:'); for (const f of failures) { console.log('  - ' + f.label); console.log('      expected: ' + JSON.stringify(f.expected)); console.log('      actual:   ' + JSON.stringify(f.actual)); } process.exit(1); }
