// Unit tests for src/vimeo.js — runnable with plain Node, no dependencies.
//
// Usage: node tests/vimeo.test.js

const path = require('path');
const {
  shortenVimeoUrl,
  needsShortening,
  isVimeoHost,
  isPostUrl,
} = require(path.join('..', 'src', 'vimeo.js'));

const CASES = [
  // Public video — all query is share/tracking junk.
  { name: 'public video: ?share + utm stripped',
    input: 'https://vimeo.com/123456789?share=copy&utm_source=x',
    expected: 'https://vimeo.com/123456789' },
  { name: 'public video: already clean',
    input: 'https://vimeo.com/123456789',
    expected: 'https://vimeo.com/123456789',
    expectedNeeds: false },
  // UNLISTED video — the privacy hash is the 2nd path segment and MUST survive.
  { name: 'unlisted: privacy hash (path segment) preserved',
    input: 'https://vimeo.com/123456789/6ea54a3a04?share=copy',
    expected: 'https://vimeo.com/123456789/6ea54a3a04' },
  { name: 'unlisted: hash preserved, already clean',
    input: 'https://vimeo.com/123456789/6ea54a3a04',
    expected: 'https://vimeo.com/123456789/6ea54a3a04',
    expectedNeeds: false },
  // Player embed — ?h= is the privacy hash, PRESERVED; other params stripped.
  { name: 'player: ?h= hash kept, title/utm stripped',
    input: 'https://player.vimeo.com/video/123456789?h=6ea54a3a04&title=0&byline=0&utm_source=x',
    expected: 'https://player.vimeo.com/video/123456789?h=6ea54a3a04' },
  { name: 'player: no hash, params stripped',
    input: 'https://player.vimeo.com/video/123456789?autoplay=1',
    expected: 'https://player.vimeo.com/video/123456789' },
  // Timestamp deep-link is a fragment — always preserved.
  { name: 'timestamp #t= fragment preserved',
    input: 'https://vimeo.com/123456789?utm_source=x#t=1m30s',
    expected: 'https://vimeo.com/123456789#t=1m30s' },
  { name: 'fragment preserved when already clean',
    input: 'https://vimeo.com/123456789#t=90s',
    expected: 'https://vimeo.com/123456789#t=90s',
    expectedNeeds: false },
  // Non-video paths — fallback denylist.
  { name: 'profile: utm stripped via fallback',
    input: 'https://vimeo.com/johndoe?utm_source=x',
    expected: 'https://vimeo.com/johndoe' },
  { name: 'profile: clean unchanged',
    input: 'https://vimeo.com/johndoe',
    expected: 'https://vimeo.com/johndoe',
    expectedNeeds: false },
  { name: 'ondemand: fbclid stripped via fallback',
    input: 'https://vimeo.com/ondemand/somefilm?fbclid=abc',
    expected: 'https://vimeo.com/ondemand/somefilm' },
  // Non-Vimeo host.
  { name: 'lookalike host → null',
    input: 'https://notvimeo.com/123456789?share=x',
    expected: null },
  { name: 'vimeo.com.evil.com → null',
    input: 'https://vimeo.com.evil.com/123456789',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  check('shorten - ' + c.name, shortenVimeoUrl(c.input), c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}

check('isVimeoHost: vimeo.com', isVimeoHost('vimeo.com'), true);
check('isVimeoHost: www.vimeo.com', isVimeoHost('www.vimeo.com'), true);
check('isVimeoHost: player.vimeo.com', isVimeoHost('player.vimeo.com'), true);
check('isVimeoHost: notvimeo.com', isVimeoHost('notvimeo.com'), false);
check('isVimeoHost: vimeo.com.evil.com', isVimeoHost('vimeo.com.evil.com'), false);
check('isPostUrl: video true', isPostUrl('https://vimeo.com/123'), true);
check('isPostUrl: profile false', isPostUrl('https://vimeo.com/johndoe'), false);
check('shorten on garbage', shortenVimeoUrl('not a url'), null);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) {
  for (const f of failures) console.log('FAIL: ' + f.label + '\n  expected: ' + f.expected + '\n  actual:   ' + f.actual);
  process.exit(1);
}
