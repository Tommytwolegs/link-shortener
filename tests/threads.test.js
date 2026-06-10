const path = require('path');
const {
  shortenThreadsUrl,
  needsShortening,
  isThreadsHost,
  isPostUrl,
} = require(path.join('..', 'src', 'threads.js'));

const CASES = [
  { name: 'post: xmt tracking stripped',
    input: 'https://www.threads.net/@janedoe/post/AbCdEfGhIjK?xmt=AKBhgPAk4Bw_abc123',
    expected: 'https://www.threads.net/@janedoe/post/AbCdEfGhIjK' },
  { name: 'post: igshid stripped',
    input: 'https://www.threads.net/@janedoe/post/AbCdEfGhIjK?igshid=NTc4MTIwNjQ2YQ%3D%3D',
    expected: 'https://www.threads.net/@janedoe/post/AbCdEfGhIjK' },
  { name: 'post: already clean',
    input: 'https://www.threads.net/@janedoe/post/AbCdEfGhIjK',
    expected: 'https://www.threads.net/@janedoe/post/AbCdEfGhIjK',
    expectedNeeds: false },
  { name: 'post: trailing slash preserved',
    input: 'https://www.threads.net/@janedoe/post/AbCdEfGhIjK/?xmt=foo',
    expected: 'https://www.threads.net/@janedoe/post/AbCdEfGhIjK/' },
  { name: 'post: hash preserved',
    input: 'https://www.threads.net/@janedoe/post/AbCdEfGhIjK?xmt=foo#replies',
    expected: 'https://www.threads.net/@janedoe/post/AbCdEfGhIjK#replies' },
  { name: 'threads.com alias',
    input: 'https://www.threads.com/@janedoe/post/AbCdEfGhIjK?xmt=foo',
    expected: 'https://www.threads.com/@janedoe/post/AbCdEfGhIjK' },
  // Non-post
  { name: 'profile page → null',
    input: 'https://www.threads.net/@janedoe',
    expected: null },
  { name: 'home → null',
    input: 'https://www.threads.net/',
    expected: null },
  { name: 'search → null',
    input: 'https://www.threads.net/search?q=hello',
    expected: null },
  { name: 'non-Threads → null',
    input: 'https://www.google.com/@janedoe/post/AbCdEfGhIjK',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenThreadsUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isThreadsHost: threads.net', isThreadsHost('threads.net'), true);
check('isThreadsHost: www.threads.net', isThreadsHost('www.threads.net'), true);
check('isThreadsHost: threads.com', isThreadsHost('threads.com'), true);
check('isThreadsHost: threads-clone.net', isThreadsHost('threads-clone.net'), false);
check('isPostUrl: /@u/post/', isPostUrl('https://www.threads.net/@u/post/abc'), true);
check('isPostUrl: profile', isPostUrl('https://www.threads.net/@u'), false);
check('shorten on garbage', shortenThreadsUrl('not a url'), null);
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
