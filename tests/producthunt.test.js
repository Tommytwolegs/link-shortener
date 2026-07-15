const path = require('path');
const mod = require(path.join('..', 'src', 'producthunt.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
const CASES = [
  { name: 'post already clean',
    input: 'https://www.producthunt.com/posts/example-app',
    expected: 'https://www.producthunt.com/posts/example-app', expectedNeeds: false },
  { name: 'badge ref stripped',
    input: 'https://www.producthunt.com/posts/example-app?ref=badge-featured&utm_source=badge',
    expected: 'https://www.producthunt.com/posts/example-app' },
  { name: 'lookalike -> null',
    input: 'https://producthunt.example.com/posts/x?ref=a', expected: null },
];
for (const c of CASES) {
  check('shorten - ' + c.name, mod.shortenProducthuntUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
}
check('host: producthunt.com', mod.isProducthuntHost('www.producthunt.com'), true);
check('host: lookalike', mod.isProducthuntHost('notproducthunt.com'), false);
check('shorten on garbage', mod.shortenProducthuntUrl('not a url'), null);
check('needs on garbage', mod.needsShortening('not a url'), false);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { console.log('\nFailures:'); for (const f of failures) { console.log('  - ' + f.label); console.log('      expected: ' + JSON.stringify(f.expected)); console.log('      actual:   ' + JSON.stringify(f.actual)); } process.exit(1); }
