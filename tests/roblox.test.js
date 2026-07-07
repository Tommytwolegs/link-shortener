const path = require('path');
const {
  shortenRobloxUrl,
  needsShortening,
  isRobloxHost,
  isPostUrl,
} = require(path.join('..', 'src', 'roblox.js'));

const CASES = [
  { name: 'game already clean',
    input: 'https://www.roblox.com/games/920587237/Adopt-Me',
    expected: 'https://www.roblox.com/games/920587237/Adopt-Me',
    expectedNeeds: false },
  { name: 'search session junk stripped',
    input: 'https://www.roblox.com/games/920587237/Adopt-Me?refPageId=abc-123&gameSearchSessionInfo=xyz&isAd=false&position=3',
    expected: 'https://www.roblox.com/games/920587237/Adopt-Me' },
  { name: 'privateServerLinkCode PRESERVED (invite!)',
    input: 'https://www.roblox.com/games/920587237/Adopt-Me?privateServerLinkCode=12345678901234567890&refPageId=x',
    expected: 'https://www.roblox.com/games/920587237/Adopt-Me?privateServerLinkCode=12345678901234567890' },
  { name: 'slugless game cleaned',
    input: 'https://www.roblox.com/games/920587237?listName=trending',
    expected: 'https://www.roblox.com/games/920587237' },
  { name: 'catalog item cleaned',
    input: 'https://www.roblox.com/catalog/1234567/Cool-Hat?refPageId=x',
    expected: 'https://www.roblox.com/catalog/1234567/Cool-Hat' },
  { name: 'hash preserved',
    input: 'https://www.roblox.com/games/1?isAd=1#about',
    expected: 'https://www.roblox.com/games/1#about' },
  { name: 'discover → null',
    input: 'https://www.roblox.com/discover',
    expected: null },
  { name: 'user profile → null',
    input: 'https://www.roblox.com/users/1/profile',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenRobloxUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('host: valid', isRobloxHost('www.roblox.com'), true);
check('host: lookalike', isRobloxHost('roblox.com.evil.com'), false);
check('shorten on garbage', shortenRobloxUrl('not a url'), null);
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
