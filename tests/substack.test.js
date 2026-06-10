const path = require('path');
const {
  shortenSubstackUrl,
  needsShortening,
  isSubstackHost,
  isPostUrl,
} = require(path.join('..', 'src', 'substack.js'));

const CASES = [
  // Canonical
  { name: 'post already clean',
    input: 'https://thezvi.substack.com/p/ai-weekly-roundup',
    expected: 'https://thezvi.substack.com/p/ai-weekly-roundup',
    expectedNeeds: false },
  { name: 'trailing slash preserved',
    input: 'https://thezvi.substack.com/p/ai-weekly-roundup/',
    expected: 'https://thezvi.substack.com/p/ai-weekly-roundup/',
    expectedNeeds: false },

  // Tracking strip
  { name: 'r= referral handle stripped',
    input: 'https://thezvi.substack.com/p/ai-weekly-roundup?r=8b5fk',
    expected: 'https://thezvi.substack.com/p/ai-weekly-roundup' },
  { name: 'utm_* family stripped',
    input: 'https://pub.substack.com/p/some-post?utm_source=substack&utm_medium=web&utm_campaign=post',
    expected: 'https://pub.substack.com/p/some-post' },
  { name: 'triedRedirect stripped',
    input: 'https://pub.substack.com/p/some-post?triedRedirect=true',
    expected: 'https://pub.substack.com/p/some-post' },
  { name: 'kitchen sink stripped',
    input: 'https://pub.substack.com/p/some-post?r=8b5fk&utm_source=share&utm_medium=android&triedRedirect=true&showWelcomeOnShare=false',
    expected: 'https://pub.substack.com/p/some-post' },

  // Comments forms
  { name: 'comments list cleaned',
    input: 'https://pub.substack.com/p/some-post/comments?utm_source=share',
    expected: 'https://pub.substack.com/p/some-post/comments' },
  { name: 'individual comment cleaned',
    input: 'https://pub.substack.com/p/some-post/comment/12345678?utm_source=share&r=abc',
    expected: 'https://pub.substack.com/p/some-post/comment/12345678' },

  // open.substack.com share-redirect form
  { name: 'open.substack.com /pub/ form cleaned (host preserved)',
    input: 'https://open.substack.com/pub/thezvi/p/ai-weekly-roundup?r=8b5fk&utm_campaign=post&utm_medium=web',
    expected: 'https://open.substack.com/pub/thezvi/p/ai-weekly-roundup' },

  // Profile-routed forms on bare substack.com
  { name: '/@user/p/<slug> cleaned',
    input: 'https://substack.com/@somewriter/p/a-good-post?utm_source=profile',
    expected: 'https://substack.com/@somewriter/p/a-good-post' },
  { name: '/@user/note/c-<id> (Notes) cleaned',
    input: 'https://substack.com/@somewriter/note/c-98765432?utm_source=notes-share-action&r=abc',
    expected: 'https://substack.com/@somewriter/note/c-98765432' },

  // Hash preservation
  { name: 'footnote anchor preserved',
    input: 'https://pub.substack.com/p/some-post?utm_source=share#footnote-anchor-3',
    expected: 'https://pub.substack.com/p/some-post#footnote-anchor-3' },

  // Not posts
  { name: 'publication home → null',
    input: 'https://thezvi.substack.com/',
    expected: null },
  { name: 'archive page → null',
    input: 'https://thezvi.substack.com/archive?sort=top',
    expected: null },
  { name: 'about page → null',
    input: 'https://thezvi.substack.com/about',
    expected: null },
  { name: 'profile page → null',
    input: 'https://substack.com/@somewriter',
    expected: null },
  { name: 'subscribe page → null',
    input: 'https://thezvi.substack.com/subscribe?utm_source=menu',
    expected: null },

  // Non-Substack
  { name: 'custom-domain publication → null (out of scope)',
    input: 'https://www.astralcodexten.com/p/some-post?r=abc',
    expected: null },
  { name: 'lookalike host → null',
    input: 'https://notsubstack.com/p/some-post',
    expected: null },
  { name: 'substack.com.evil.com → null',
    input: 'https://substack.com.evil.com/p/some-post',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenSubstackUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isSubstackHost: substack.com', isSubstackHost('substack.com'), true);
check('isSubstackHost: thezvi.substack.com', isSubstackHost('thezvi.substack.com'), true);
check('isSubstackHost: open.substack.com', isSubstackHost('open.substack.com'), true);
check('isSubstackHost: notsubstack.com', isSubstackHost('notsubstack.com'), false);
check('isPostUrl: post', isPostUrl('https://pub.substack.com/p/a-post'), true);
check('isPostUrl: archive', isPostUrl('https://pub.substack.com/archive'), false);
check('shorten on garbage', shortenSubstackUrl('not a url'), null);
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
