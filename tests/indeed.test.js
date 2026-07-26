// Unit tests for src/indeed.js — runnable with plain Node, no dependencies.
//
// Usage: node tests/indeed.test.js

const path = require('path');
const {
  shortenIndeedUrl,
  needsShortening,
  isIndeedHost,
  isPostUrl,
} = require(path.join('..', 'src', 'indeed.js'));

const CASES = [
  { name: 'viewjob: jk kept, from/tk/vjs/utm stripped',
    input: 'https://www.indeed.com/viewjob?jk=abc123def&from=serp&tk=1xyz&vjs=3&utm_source=x',
    expected: 'https://www.indeed.com/viewjob?jk=abc123def' },
  { name: 'viewjob: already clean',
    input: 'https://www.indeed.com/viewjob?jk=abc123def',
    expected: 'https://www.indeed.com/viewjob?jk=abc123def',
    expectedNeeds: false },
  { name: 'jobs search: q + l kept, from stripped',
    input: 'https://www.indeed.com/jobs?q=engineer&l=New+York&from=searchOnHP',
    expected: 'https://www.indeed.com/jobs?q=engineer&l=New+York' },
  { name: 'jobs search: fromage (date-posted filter) KEPT — functional, not tracking',
    input: 'https://www.indeed.com/jobs?q=nurse&l=Boston&fromage=7&from=serp&tk=xyz',
    expected: 'https://www.indeed.com/jobs?q=nurse&l=Boston&fromage=7' },
  { name: 'viewjob: indpubnum + advn stripped',
    input: 'https://www.indeed.com/viewjob?jk=abc&indpubnum=8343699265155203&advn=99',
    expected: 'https://www.indeed.com/viewjob?jk=abc' },
  { name: 'hash preserved',
    input: 'https://www.indeed.com/viewjob?jk=abc&tk=1#apply',
    expected: 'https://www.indeed.com/viewjob?jk=abc#apply' },
  { name: 'lookalike host → null',
    input: 'https://notindeed.com/viewjob?jk=abc&tk=1',
    expected: null },
  { name: 'indeed.com.evil.com → null',
    input: 'https://indeed.com.evil.com/viewjob?jk=abc&tk=1',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  check('shorten - ' + c.name, shortenIndeedUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}

check('isIndeedHost: www.indeed.com', isIndeedHost('www.indeed.com'), true);
check('isIndeedHost: indeed.com', isIndeedHost('indeed.com'), true);
check('isIndeedHost: notindeed.com', isIndeedHost('notindeed.com'), false);
check('isIndeedHost: indeed.com.evil.com', isIndeedHost('indeed.com.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://www.indeed.com/viewjob?jk=a&tk=1'), true);
check('isPostUrl: clean false', isPostUrl('https://www.indeed.com/viewjob?jk=a'), false);
check('shorten on garbage', shortenIndeedUrl('not a url'), null);
// null-input hardening: pure functions must not throw on null/undefined/non-string
check('shorten on null (no throw)', shortenIndeedUrl(null), null);
check('shorten on undefined (no throw)', shortenIndeedUrl(undefined), null);
check('needs on null (no throw)', needsShortening(null), false);
check('isPostUrl on null (no throw)', isPostUrl(null), false);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) {
  for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual);
  process.exit(1);
}
