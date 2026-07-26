// Unit tests for src/metacritic.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenMetacriticUrl, needsShortening, isMetacriticHost, isPostUrl } =
  require(path.join('..', 'src', 'metacritic.js'));

const CASES = [
  { name: 'path kept, utm + fbclid stripped',
    input: 'https://www.metacritic.com/movie/some-film?utm_source=share&fbclid=zzz',
    expected: 'https://www.metacritic.com/movie/some-film' },
  { name: 'already clean',
    input: 'https://www.metacritic.com/movie/some-film',
    expected: 'https://www.metacritic.com/movie/some-film',
    expectedNeeds: false },
  { name: 'hash preserved',
    input: 'https://www.metacritic.com/movie/some-film?utm_source=x#section',
    expected: 'https://www.metacritic.com/movie/some-film#section' },
  { name: 'lookalike host -> null',
    input: 'https://notmetacritic.com/movie/some-film?utm_source=x',
    expected: null },
  { name: 'metacritic.com.evil.com -> null',
    input: 'https://metacritic.com.evil.com/movie/some-film?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) { if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); } }
for (const c of CASES) {
  check('shorten - ' + c.name, shortenMetacriticUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isMetacriticHost: www.metacritic.com', isMetacriticHost('www.metacritic.com'), true);
check('isMetacriticHost: notmetacritic.com', isMetacriticHost('notmetacritic.com'), false);
check('isMetacriticHost: metacritic.com.evil.com', isMetacriticHost('metacritic.com.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://www.metacritic.com/movie/some-film?utm_source=x'), true);
check('shorten on garbage', shortenMetacriticUrl('not a url'), null);

check('ftag stripped', shortenMetacriticUrl('https://www.metacritic.com/game/x?ftag=MCD-1&utm_source=y'), 'https://www.metacritic.com/game/x');
console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
