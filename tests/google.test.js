const path = require('path');
const {
  shortenGoogleUrl,
  needsShortening,
  isGoogleHost,
  isPostUrl,
} = require(path.join('..', 'src', 'google.js'));

const CASES = [
  { name: 'kitchen-sink search junk stripped',
    input: 'https://www.google.com/search?q=cast+iron+skillet&sca_esv=abc123&ei=XyZ&ved=2ahUKEwi&oq=cast+iron&gs_lcrp=EgZjaHJvbWU&sourceid=chrome&ie=UTF-8&uact=5',
    expected: 'https://www.google.com/search?q=cast+iron+skillet' },
  { name: 'q + functional params PRESERVED',
    input: 'https://www.google.com/search?q=news&tbm=isch&hl=fr&start=20&num=50&tbs=qdr:w&ved=2ahUK',
    expected: 'https://www.google.com/search?q=news&tbm=isch&hl=fr&start=20&num=50&tbs=qdr%3Aw' },
  { name: 'udm mode preserved',
    input: 'https://www.google.com/search?q=skillet&udm=2&sca_esv=x&fbs=ABC',
    expected: 'https://www.google.com/search?q=skillet&udm=2' },
  { name: 'client + sclient + source stripped',
    input: 'https://www.google.com/search?q=x&client=firefox-b-d&sclient=gws-wiz&source=hp',
    expected: 'https://www.google.com/search?q=x' },
  { name: 'already clean',
    input: 'https://www.google.com/search?q=hello',
    expected: 'https://www.google.com/search?q=hello',
    expectedNeeds: false },
  { name: 'apex host works',
    input: 'https://google.com/search?q=x&ved=1',
    expected: 'https://google.com/search?q=x' },
  { name: 'search without q → null',
    input: 'https://www.google.com/search?tbm=isch&ved=1',
    expected: null },
  { name: 'maps path → null (never touched)',
    input: 'https://www.google.com/maps/place/Tokyo/@35.6,139.7,12z',
    expected: null },
  { name: 'url redirector path → null (module scope; unwrapper handles it)',
    input: 'https://www.google.com/url?q=https%3A%2F%2Fexample.com&sa=D',
    expected: null },
  { name: 'regional TLD → null (com only)',
    input: 'https://www.google.co.uk/search?q=x&ved=1',
    expected: null },
  { name: 'other google subdomain → null',
    input: 'https://news.google.com/search?q=x',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenGoogleUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('host: www.google.com', isGoogleHost('www.google.com'), true);
check('host: google.com', isGoogleHost('google.com'), true);
check('host: mail.google.com', isGoogleHost('mail.google.com'), false);
check('host: accounts.google.com', isGoogleHost('accounts.google.com'), false);
check('host: lookalike', isGoogleHost('google.com.evil.com'), false);
check('shorten on garbage', shortenGoogleUrl('not a url'), null);
check('needs on garbage', needsShortening('not a url'), false);
// Mutation guard (denylist module):
const probe = new URL('https://www.google.com/search?q=x&ved=1');
check('shorten on URL object', shortenGoogleUrl(probe), 'https://www.google.com/search?q=x');
check('URL-object input not mutated', probe.href, 'https://www.google.com/search?q=x&ved=1');
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
