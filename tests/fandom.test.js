const path = require('path');
const {
  shortenFandomUrl,
  needsShortening,
  isFandomHost,
  isPostUrl,
} = require(path.join('..', 'src', 'fandom.js'));

const CASES = [
  { name: 'article already clean',
    input: 'https://harrypotter.fandom.com/wiki/Hermione_Granger',
    expected: 'https://harrypotter.fandom.com/wiki/Hermione_Granger',
    expectedNeeds: false },
  { name: 'so= search attribution stripped',
    input: 'https://harrypotter.fandom.com/wiki/Hermione_Granger?so=search',
    expected: 'https://harrypotter.fandom.com/wiki/Hermione_Granger' },
  { name: 'language-prefixed wiki cleaned',
    input: 'https://onepiece.fandom.com/de/wiki/Ruffy?so=search',
    expected: 'https://onepiece.fandom.com/de/wiki/Ruffy' },
  { name: 'functional params preserved (denylist)',
    input: 'https://harrypotter.fandom.com/wiki/Hermione_Granger?oldid=123456&so=search',
    expected: 'https://harrypotter.fandom.com/wiki/Hermione_Granger?oldid=123456' },
  { name: 'section anchor preserved',
    input: 'https://harrypotter.fandom.com/wiki/Hogwarts?so=search#History',
    expected: 'https://harrypotter.fandom.com/wiki/Hogwarts#History' },
  { name: 'community home → null',
    input: 'https://harrypotter.fandom.com/',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://fandom.com.evil.com/wiki/X',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenFandomUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('host: valid', isFandomHost('harrypotter.fandom.com'), true);
check('host: lookalike', isFandomHost('fandom.com.evil.com'), false);
check('shorten on garbage', shortenFandomUrl('not a url'), null);
check('needs on garbage', needsShortening('not a url'), false);
// Mutation guard (denylist module):
const probe = new URL('https://x.fandom.com/wiki/Y?so=search');
check('shorten on URL object', shortenFandomUrl(probe), 'https://x.fandom.com/wiki/Y');
check('URL-object input not mutated', probe.href, 'https://x.fandom.com/wiki/Y?so=search');
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
