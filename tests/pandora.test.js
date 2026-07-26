// Unit tests for src/pandora.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenPandoraUrl, needsShortening, isPandoraHost, isPostUrl } =
  require(path.join('..', 'src', 'pandora.js'));

const CASES = [
  { name: 'path kept, utm + part stripped',
    input: 'https://www.pandora.com/artist/name/AL123?utm_source=share&part=zzz',
    expected: 'https://www.pandora.com/artist/name/AL123' },
  { name: 'already clean',
    input: 'https://www.pandora.com/artist/name/AL123',
    expected: 'https://www.pandora.com/artist/name/AL123',
    expectedNeeds: false },
  { name: 'hash preserved',
    input: 'https://www.pandora.com/artist/name/AL123?utm_source=x#section',
    expected: 'https://www.pandora.com/artist/name/AL123#section' },
  { name: 'lookalike host -> null',
    input: 'https://notpandora.com/artist/name/AL123?utm_source=x',
    expected: null },
  { name: 'pandora.com.evil.com -> null',
    input: 'https://pandora.com.evil.com/artist/name/AL123?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) { if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); } }
for (const c of CASES) {
  check('shorten - ' + c.name, shortenPandoraUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isPandoraHost: www.pandora.com', isPandoraHost('www.pandora.com'), true);
check('isPandoraHost: notpandora.com', isPandoraHost('notpandora.com'), false);
check('isPandoraHost: pandora.com.evil.com', isPandoraHost('pandora.com.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://www.pandora.com/artist/name/AL123?utm_source=x'), true);
check('shorten on garbage', shortenPandoraUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
