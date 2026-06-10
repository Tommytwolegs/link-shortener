const path = require('path');
const {
  shortenQuoraUrl,
  needsShortening,
  isQuoraHost,
  isPostUrl,
} = require(path.join('..', 'src', 'quora.js'));

const CASES = [
  // Canonical
  { name: 'question already clean',
    input: 'https://www.quora.com/How-do-airplanes-stay-in-the-air',
    expected: 'https://www.quora.com/How-do-airplanes-stay-in-the-air',
    expectedNeeds: false },
  { name: 'answer already clean',
    input: 'https://www.quora.com/How-do-airplanes-stay-in-the-air/answer/Jane-Doe-42',
    expected: 'https://www.quora.com/How-do-airplanes-stay-in-the-air/answer/Jane-Doe-42',
    expectedNeeds: false },

  // Tracking strip
  { name: 'share=1 stripped',
    input: 'https://www.quora.com/How-do-airplanes-stay-in-the-air?share=1',
    expected: 'https://www.quora.com/How-do-airplanes-stay-in-the-air' },
  { name: 'ch + oid + share kitchen sink stripped',
    input: 'https://www.quora.com/How-do-airplanes-stay-in-the-air?ch=10&oid=1234567&share=abc123de&srid=h7Gq&target_type=question',
    expected: 'https://www.quora.com/How-do-airplanes-stay-in-the-air' },
  { name: 'answer share params stripped',
    input: 'https://www.quora.com/How-do-airplanes-stay-in-the-air/answer/Jane-Doe-42?ch=10&oid=98765&share=ab12cd34&srid=h7Gq',
    expected: 'https://www.quora.com/How-do-airplanes-stay-in-the-air/answer/Jane-Doe-42' },
  { name: 'unanswered form cleaned',
    input: 'https://www.quora.com/unanswered/What-is-the-best-way-to-learn-piano?share=1',
    expected: 'https://www.quora.com/unanswered/What-is-the-best-way-to-learn-piano' },
  { name: 'language subdomain cleaned',
    input: 'https://es.quora.com/Como-funcionan-los-aviones?share=1&ch=3',
    expected: 'https://es.quora.com/Como-funcionan-los-aviones' },

  // Hash preservation
  { name: 'hash preserved',
    input: 'https://www.quora.com/How-do-airplanes-stay-in-the-air?share=1#anchor',
    expected: 'https://www.quora.com/How-do-airplanes-stay-in-the-air#anchor' },

  // Navigational routes NOT matched
  { name: 'home → null',
    input: 'https://www.quora.com/',
    expected: null },
  { name: 'profile → null (blocklisted first segment)',
    input: 'https://www.quora.com/profile/Jane-Doe-42?ch=3',
    expected: null },
  { name: 'topic → null',
    input: 'https://www.quora.com/topic/Aviation-Industry',
    expected: null },
  { name: 'search → null',
    input: 'https://www.quora.com/search?q=airplanes',
    expected: null },
  { name: 'single word (no hyphen) → null',
    input: 'https://www.quora.com/spaces',
    expected: null },
  { name: 'press-kit (blocklisted despite hyphen) → null',
    input: 'https://www.quora.com/press-kit',
    expected: null },

  // Non-Quora
  { name: 'lookalike → null',
    input: 'https://notquora.com/How-do-airplanes-stay-in-the-air?share=1',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenQuoraUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isQuoraHost: quora.com', isQuoraHost('quora.com'), true);
check('isQuoraHost: www.quora.com', isQuoraHost('www.quora.com'), true);
check('isQuoraHost: es.quora.com', isQuoraHost('es.quora.com'), true);
check('isQuoraHost: notquora.com', isQuoraHost('notquora.com'), false);
check('isPostUrl: question', isPostUrl('https://www.quora.com/Why-is-the-sky-blue'), true);
check('isPostUrl: topic', isPostUrl('https://www.quora.com/topic/Physics'), false);
check('shorten on garbage', shortenQuoraUrl('not a url'), null);
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
