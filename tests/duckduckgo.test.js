const path = require('path');
const {
  shortenDuckduckgoUrl,
  needsShortening,
  isDuckduckgoHost,
  isPostUrl,
} = require(path.join('..', 'src', 'duckduckgo.js'));

const CASES = [
  // Canonical
  { name: 'root search already clean',
    input: 'https://duckduckgo.com/?q=hello+world',
    expected: 'https://duckduckgo.com/?q=hello+world',
    expectedNeeds: false },

  // Tracking strip
  { name: 't= source attribution stripped',
    input: 'https://duckduckgo.com/?q=hello&t=h_&ia=web',
    expected: 'https://duckduckgo.com/?q=hello&ia=web' },
  { name: 'firefox address-bar tag stripped',
    input: 'https://duckduckgo.com/?q=privacy&t=ffab',
    expected: 'https://duckduckgo.com/?q=privacy' },
  { name: 'atb cohort token stripped',
    input: 'https://duckduckgo.com/?q=test&atb=v314-1&t=h_',
    expected: 'https://duckduckgo.com/?q=test' },
  { name: 'image tab params survive',
    input: 'https://duckduckgo.com/?q=sunset&t=h_&iax=images&ia=images',
    expected: 'https://duckduckgo.com/?q=sunset&iax=images&ia=images' },
  { name: 'region + safe-search settings survive',
    input: 'https://duckduckgo.com/?q=news&kl=de-de&kp=-2&t=h_',
    expected: 'https://duckduckgo.com/?q=news&kl=de-de&kp=-2' },
  { name: 'html interface cleaned',
    input: 'https://html.duckduckgo.com/html?q=hello&t=h_',
    expected: 'https://html.duckduckgo.com/html?q=hello' },
  { name: 'utm_* stripped',
    input: 'https://duckduckgo.com/?q=x&utm_source=share&utm_medium=social',
    expected: 'https://duckduckgo.com/?q=x' },

  // Hash preservation
  { name: 'hash preserved',
    input: 'https://duckduckgo.com/?q=test&t=h_#anchor',
    expected: 'https://duckduckgo.com/?q=test#anchor' },

  // Out of scope
  { name: 'no q -> null (settings page)',
    input: 'https://duckduckgo.com/settings',
    expected: null },
  { name: 'homepage -> null',
    input: 'https://duckduckgo.com/',
    expected: null },
  { name: 'about page -> null',
    input: 'https://duckduckgo.com/about',
    expected: null },
  { name: 'lookalike -> null',
    input: 'https://notduckduckgo.com/?q=x&t=h_',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenDuckduckgoUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isDuckduckgoHost: duckduckgo.com', isDuckduckgoHost('duckduckgo.com'), true);
check('isDuckduckgoHost: html.duckduckgo.com', isDuckduckgoHost('html.duckduckgo.com'), true);
check('isDuckduckgoHost: lite.duckduckgo.com', isDuckduckgoHost('lite.duckduckgo.com'), true);
check('isDuckduckgoHost: lookalike', isDuckduckgoHost('notduckduckgo.com'), false);
check('isPostUrl: search', isPostUrl('https://duckduckgo.com/?q=x'), true);
check('isPostUrl: homepage', isPostUrl('https://duckduckgo.com/'), false);
check('shorten on garbage', shortenDuckduckgoUrl('not a url'), null);
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
