// Unit tests for src/glassdoor.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenGlassdoorUrl, needsShortening, isGlassdoorHost, isPostUrl } =
  require(path.join('..', 'src', 'glassdoor.js'));

const CASES = [
  { name: 'overview: EI_IE path kept, src + utm stripped',
    input: 'https://www.glassdoor.com/Overview/Working-at-Acme-EI_IE12345.htm?src=GD_JOB_AD&utm_campaign=x',
    expected: 'https://www.glassdoor.com/Overview/Working-at-Acme-EI_IE12345.htm' },
  { name: 'overview: already clean',
    input: 'https://www.glassdoor.com/Overview/Working-at-Acme-EI_IE12345.htm',
    expected: 'https://www.glassdoor.com/Overview/Working-at-Acme-EI_IE12345.htm',
    expectedNeeds: false },
  { name: 'job-listing: cb stripped',
    input: 'https://www.glassdoor.com/job-listing/engineer-acme-JV_IC1_KO0.htm?cb=169&srcTok=zzz',
    expected: 'https://www.glassdoor.com/job-listing/engineer-acme-JV_IC1_KO0.htm' },
  { name: 'hash preserved',
    input: 'https://www.glassdoor.com/Overview/x-EI_IE1.htm?utm_source=x#reviews',
    expected: 'https://www.glassdoor.com/Overview/x-EI_IE1.htm#reviews' },
  { name: 'lookalike → null',
    input: 'https://notglassdoor.com/Overview/x-EI_IE1.htm?src=x',
    expected: null },
  { name: 'glassdoor.com.evil.com → null',
    input: 'https://glassdoor.com.evil.com/Overview/x-EI_IE1.htm?src=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  check('shorten - ' + c.name, shortenGlassdoorUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isGlassdoorHost: www.glassdoor.com', isGlassdoorHost('www.glassdoor.com'), true);
check('isGlassdoorHost: notglassdoor.com', isGlassdoorHost('notglassdoor.com'), false);
check('isGlassdoorHost: glassdoor.com.evil.com', isGlassdoorHost('glassdoor.com.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://www.glassdoor.com/x.htm?src=x'), true);
check('shorten on garbage', shortenGlassdoorUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
