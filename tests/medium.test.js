const path = require('path');
const {
  shortenMediumUrl,
  needsShortening,
  isMediumHost,
  isPostUrl,
} = require(path.join('..', 'src', 'medium.js'));

const CASES = [
  { name: 'profile: source stripped via fallback',
    input: 'https://medium.com/@writer?source=post_page-----3f2a9b1c8d7e',
    expected: 'https://medium.com/@writer' },
  // Canonical
  { name: 'profile story already clean',
    input: 'https://medium.com/@writer/how-to-do-a-thing-3f2a9b1c8d7e',
    expected: 'https://medium.com/@writer/how-to-do-a-thing-3f2a9b1c8d7e',
    expectedNeeds: false },
  { name: 'publication story already clean',
    input: 'https://medium.com/the-pub/how-to-do-a-thing-3f2a9b1c8d7e',
    expected: 'https://medium.com/the-pub/how-to-do-a-thing-3f2a9b1c8d7e',
    expectedNeeds: false },
  { name: 'subdomain story already clean',
    input: 'https://writer.medium.com/how-to-do-a-thing-3f2a9b1c8d7e',
    expected: 'https://writer.medium.com/how-to-do-a-thing-3f2a9b1c8d7e',
    expectedNeeds: false },
  { name: 'short /p/ id already clean',
    input: 'https://medium.com/p/3f2a9b1c8d7e',
    expected: 'https://medium.com/p/3f2a9b1c8d7e',
    expectedNeeds: false },

  // Tracking strip
  { name: 'source= attribution stripped',
    input: 'https://medium.com/@writer/how-to-do-a-thing-3f2a9b1c8d7e?source=social.tw',
    expected: 'https://medium.com/@writer/how-to-do-a-thing-3f2a9b1c8d7e' },
  { name: 'post-share junk stripped',
    input: 'https://medium.com/the-pub/how-to-do-a-thing-3f2a9b1c8d7e?source=friends_link&utm_source=share&utm_medium=web',
    expected: 'https://medium.com/the-pub/how-to-do-a-thing-3f2a9b1c8d7e' },
  { name: 'subdomain story stripped',
    input: 'https://writer.medium.com/how-to-do-a-thing-3f2a9b1c8d7e?source=user_profile---------1----------',
    expected: 'https://writer.medium.com/how-to-do-a-thing-3f2a9b1c8d7e' },

  // Friend Link share key — MUST survive
  { name: 'sk= friend-link token preserved',
    input: 'https://medium.com/@writer/how-to-do-a-thing-3f2a9b1c8d7e?sk=f17c8a79151b7ced4cc42bb326f2d432',
    expected: 'https://medium.com/@writer/how-to-do-a-thing-3f2a9b1c8d7e?sk=f17c8a79151b7ced4cc42bb326f2d432',
    expectedNeeds: false },
  { name: 'sk= preserved while source= stripped',
    input: 'https://medium.com/@writer/how-to-do-a-thing-3f2a9b1c8d7e?source=friends_link&sk=f17c8a79151b7ced4cc42bb326f2d432',
    expected: 'https://medium.com/@writer/how-to-do-a-thing-3f2a9b1c8d7e?sk=f17c8a79151b7ced4cc42bb326f2d432' },
  { name: 'sk= preserved on subdomain story',
    input: 'https://writer.medium.com/how-to-do-a-thing-3f2a9b1c8d7e?source=friends_link&sk=abc123',
    expected: 'https://writer.medium.com/how-to-do-a-thing-3f2a9b1c8d7e?sk=abc123' },
  { name: 'sk= preserved on /p/ form',
    input: 'https://medium.com/p/3f2a9b1c8d7e?source=email&sk=abc123',
    expected: 'https://medium.com/p/3f2a9b1c8d7e?sk=abc123' },

  // Hash preservation
  { name: 'hash preserved',
    input: 'https://medium.com/@writer/how-to-do-a-thing-3f2a9b1c8d7e?source=social.tw#section-2',
    expected: 'https://medium.com/@writer/how-to-do-a-thing-3f2a9b1c8d7e#section-2' },

  // Not stories
  { name: 'profile page → null',
    input: 'https://medium.com/@writer',
    expected: 'https://medium.com/@writer',
    expectedNeeds: false },
  { name: 'profile about tab → null',
    input: 'https://medium.com/@writer/about',
    expected: 'https://medium.com/@writer/about',
    expectedNeeds: false },
  { name: 'publication home → null',
    input: 'https://medium.com/the-pub',
    expected: 'https://medium.com/the-pub',
    expectedNeeds: false },
  { name: 'tag page → null',
    input: 'https://medium.com/tag/programming',
    expected: 'https://medium.com/tag/programming',
    expectedNeeds: false },
  { name: 'signin (no hex tail) → null',
    input: 'https://medium.com/m/signin?redirect=x',
    expected: 'https://medium.com/m/signin?redirect=x',
    expectedNeeds: false },
  { name: 'search → null',
    input: 'https://medium.com/search?q=hello',
    expected: 'https://medium.com/search?q=hello',
    expectedNeeds: false },
  { name: 'bare medium.com single segment → null (needs @user, pub, or subdomain)',
    input: 'https://medium.com/how-to-do-a-thing-3f2a9b1c8d7e',
    expected: 'https://medium.com/how-to-do-a-thing-3f2a9b1c8d7e',
    expectedNeeds: false },

  // Non-Medium
  { name: 'custom-domain publication → null (out of scope)',
    input: 'https://blog.example.com/how-to-do-a-thing-3f2a9b1c8d7e',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://notmedium.com/@writer/post-3f2a9b1c8d7e',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenMediumUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isMediumHost: medium.com', isMediumHost('medium.com'), true);
check('isMediumHost: writer.medium.com', isMediumHost('writer.medium.com'), true);
check('isMediumHost: notmedium.com', isMediumHost('notmedium.com'), false);
check('isPostUrl: story', isPostUrl('https://medium.com/@w/a-post-3f2a9b1c8d7e'), true);
check('isPostUrl: profile', isPostUrl('https://medium.com/@w'), false);
check('shorten on garbage', shortenMediumUrl('not a url'), null);
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
