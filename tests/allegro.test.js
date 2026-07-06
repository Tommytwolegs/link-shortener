const path = require('path');
const {
  shortenAllegroUrl,
  needsShortening,
  isAllegroHost,
  isPostUrl,
} = require(path.join('..', 'src', 'allegro.js'));

const CASES = [

  { name: 'offer already clean',
    input: 'https://allegro.pl/oferta/myszka-bezprzewodowa-logitech-12345678901',
    expected: 'https://allegro.pl/oferta/myszka-bezprzewodowa-logitech-12345678901',
    expectedNeeds: false },
  { name: 'bi_* attribution stripped',
    input: 'https://allegro.pl/oferta/myszka-bezprzewodowa-logitech-12345678901?bi_s=ads&bi_m=productlisting%3Adesktop&bi_c=abc&bi_t=xyz',
    expected: 'https://allegro.pl/oferta/myszka-bezprzewodowa-logitech-12345678901' },
  { name: 'ref + reco stripped',
    input: 'https://allegro.pl/oferta/produkt-999?ref=simplified-cart&reco_id=abc&sid=123',
    expected: 'https://allegro.pl/oferta/produkt-999' },
  { name: 'Czech TLD cleaned',
    input: 'https://allegro.cz/oferta/produkt-55?utm_source=share',
    expected: 'https://allegro.cz/oferta/produkt-55' },
  { name: 'hash preserved',
    input: 'https://allegro.pl/oferta/x-1?ref=a#opis',
    expected: 'https://allegro.pl/oferta/x-1#opis' },
  { name: 'listing/search → null',
    input: 'https://allegro.pl/kategoria/myszki-257093?order=p',
    expected: null },
  { name: 'seller page → null',
    input: 'https://allegro.pl/uzytkownik/someseller',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://notallegro.pl/oferta/x-1',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenAllegroUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isAllegroHost: allegro.pl', isAllegroHost('allegro.pl'), true);
check('isAllegroHost: allegro.cz', isAllegroHost('allegro.cz'), true);
check('isAllegroHost: allegro.com', isAllegroHost('allegro.com'), false);
check('isPostUrl: offer', isPostUrl('https://allegro.pl/oferta/x-1'), true);
check('isPostUrl: category', isPostUrl('https://allegro.pl/kategoria/x-1'), false);
check('shorten on garbage', shortenAllegroUrl('not a url'), null);
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
