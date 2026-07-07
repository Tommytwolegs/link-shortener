const path = require('path');
const {
  shortenSteamUrl,
  needsShortening,
  isSteamHost,
  isPostUrl,
} = require(path.join('..', 'src', 'steam.js'));

const CASES = [

  { name: 'app with slug already clean',
    input: 'https://store.steampowered.com/app/1091500/Cyberpunk_2077/',
    expected: 'https://store.steampowered.com/app/1091500/Cyberpunk_2077/',
    expectedNeeds: false },
  { name: 'snr click-path stripped',
    input: 'https://store.steampowered.com/app/1091500/Cyberpunk_2077/?snr=1_7_7_151_150_1',
    expected: 'https://store.steampowered.com/app/1091500/Cyberpunk_2077/' },
  { name: 'curator + utm stripped',
    input: 'https://store.steampowered.com/app/570/Dota_2/?curator_clanid=123&utm_source=share',
    expected: 'https://store.steampowered.com/app/570/Dota_2/' },
  { name: 'slugless app cleaned',
    input: 'https://store.steampowered.com/app/570?snr=2_9_100000_',
    expected: 'https://store.steampowered.com/app/570' },
  { name: 'bundle cleaned',
    input: 'https://store.steampowered.com/bundle/232/Valve_Complete_Pack/?snr=1_4_4__tab-Specials',
    expected: 'https://store.steampowered.com/bundle/232/Valve_Complete_Pack/' },
  { name: 'sub cleaned',
    input: 'https://store.steampowered.com/sub/54029/?snr=1_5_9__403',
    expected: 'https://store.steampowered.com/sub/54029/' },
  { name: 'hash preserved',
    input: 'https://store.steampowered.com/app/570/?snr=x#reviews',
    expected: 'https://store.steampowered.com/app/570/#reviews' },
  { name: 'l= language override PRESERVED',
    input: 'https://store.steampowered.com/app/570/Dota_2/?l=japanese&snr=1_7_7',
    expected: 'https://store.steampowered.com/app/570/Dota_2/?l=japanese' },
  { name: 'search → null',
    input: 'https://store.steampowered.com/search/?term=rpg',
    expected: null },
  { name: 'steamcommunity → null (out of scope)',
    input: 'https://steamcommunity.com/app/570',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenSteamUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isSteamHost: store.steampowered.com', isSteamHost('store.steampowered.com'), true);
check('isSteamHost: steamcommunity.com', isSteamHost('steamcommunity.com'), false);
check('isPostUrl: app', isPostUrl('https://store.steampowered.com/app/570'), true);
check('isPostUrl: search', isPostUrl('https://store.steampowered.com/search/?term=x'), false);
check('shorten on garbage', shortenSteamUrl('not a url'), null);
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
