// Unit tests for src/huggingface.js — runnable with plain Node, no dependencies.

const path = require('path');
const { shortenHuggingfaceUrl, needsShortening, isHuggingfaceHost, isPostUrl } =
  require(path.join('..', 'src', 'huggingface.js'));

const CASES = [
  { name: 'path kept, utm stripped',
    input: 'https://huggingface.co/openai/whisper?utm_source=share&fbclid=z',
    expected: 'https://huggingface.co/openai/whisper' },
  { name: 'already clean',
    input: 'https://huggingface.co/openai/whisper',
    expected: 'https://huggingface.co/openai/whisper',
    expectedNeeds: false },
  { name: 'hash (line anchor) preserved',
    input: 'https://huggingface.co/openai/whisper?utm_source=x#L10-L20',
    expected: 'https://huggingface.co/openai/whisper#L10-L20' },
  { name: 'lookalike host -> null',
    input: 'https://nothuggingface.co/openai/whisper?utm_source=x',
    expected: null },
  { name: 'huggingface.co.evil.com -> null',
    input: 'https://huggingface.co.evil.com/openai/whisper?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0; const failures = [];
function check(label, actual, expected) { if (actual === expected) passed++; else { failed++; failures.push({ label, actual, expected }); } }
for (const c of CASES) {
  check('shorten - ' + c.name, shortenHuggingfaceUrl(c.input), c.expected);
  let en; if ('expectedNeeds' in c) en = c.expectedNeeds; else if (c.expected === null) en = false; else en = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), en);
}
check('isHuggingfaceHost: huggingface.co', isHuggingfaceHost('huggingface.co'), true);
check('isHuggingfaceHost: nothuggingface.co', isHuggingfaceHost('nothuggingface.co'), false);
check('isHuggingfaceHost: huggingface.co.evil.com', isHuggingfaceHost('huggingface.co.evil.com'), false);
check('isPostUrl: has tracking true', isPostUrl('https://huggingface.co/openai/whisper?utm_source=x'), true);
check('shorten on garbage', shortenHuggingfaceUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) { for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual); process.exit(1); }
