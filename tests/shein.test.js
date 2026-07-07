const path = require('path');
const {
  shortenSheinUrl,
  needsShortening,
  isSheinHost,
  isPostUrl,
} = require(path.join('..', 'src', 'shein.js'));

const CASES = [
  { name: 'product already clean',
    input: 'https://us.shein.com/Solid-Drop-Shoulder-Tee-p-12345678.html',
    expected: 'https://us.shein.com/Solid-Drop-Shoulder-Tee-p-12345678.html',
    expectedNeeds: false },
  { name: 'src junk stripped',
    input: 'https://us.shein.com/Solid-Drop-Shoulder-Tee-p-12345678.html?src_identifier=fc%3DWomen&src_module=topcat&src_tab_page_id=page_home&mallCode=1',
    expected: 'https://us.shein.com/Solid-Drop-Shoulder-Tee-p-12345678.html' },
  { name: 'cat variant path cleaned',
    input: 'https://us.shein.com/Dress-p-98765-cat-1727.html?ici=hz&scici=nav',
    expected: 'https://us.shein.com/Dress-p-98765-cat-1727.html' },
  { name: 'regional TLD cleaned',
    input: 'https://www.shein.co.uk/Top-p-555.html?ref=www&rep=dir',
    expected: 'https://www.shein.co.uk/Top-p-555.html' },
  { name: 'hash preserved',
    input: 'https://us.shein.com/X-p-1.html?ici=a#reviews',
    expected: 'https://us.shein.com/X-p-1.html#reviews' },
  { name: 'category page → null',
    input: 'https://us.shein.com/Women-Dresses-c-1727.html',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://shein.com.evil.com/X-p-1.html',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenSheinUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('host: valid', isSheinHost('us.shein.com'), true);
check('host: lookalike', isSheinHost('shein.com.evil.com'), false);
check('shorten on garbage', shortenSheinUrl('not a url'), null);
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
