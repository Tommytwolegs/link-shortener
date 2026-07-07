const path = require('path');
const {
  shortenTwitchUrl,
  needsShortening,
  isTwitchHost,
  isPostUrl,
} = require(path.join('..', 'src', 'twitch.js'));

const CASES = [

  { name: 'VOD already clean',
    input: 'https://www.twitch.tv/videos/1234567890',
    expected: 'https://www.twitch.tv/videos/1234567890',
    expectedNeeds: false },
  { name: 'VOD timestamp t= PRESERVED, junk stripped',
    input: 'https://www.twitch.tv/videos/1234567890?t=1h2m30s&tt_content=vod&tt_medium=vod_embed',
    expected: 'https://www.twitch.tv/videos/1234567890?t=1h2m30s' },
  { name: 'collection queue context PRESERVED',
    input: 'https://www.twitch.tv/videos/1234567890?collection=abcDEF123&tt_content=collection',
    expected: 'https://www.twitch.tv/videos/1234567890?collection=abcDEF123' },
  { name: 'channel clip form cleaned',
    input: 'https://www.twitch.tv/somechannel/clip/FunnyClipName-AbC123?featured=true&filter=clips&range=7d',
    expected: 'https://www.twitch.tv/somechannel/clip/FunnyClipName-AbC123' },
  { name: 'clips.twitch.tv short form cleaned',
    input: 'https://clips.twitch.tv/FunnyClipName-AbC123?tt_medium=clips_api&tt_content=url',
    expected: 'https://clips.twitch.tv/FunnyClipName-AbC123' },
  { name: 'hash preserved',
    input: 'https://www.twitch.tv/videos/1?tt_content=x#comment',
    expected: 'https://www.twitch.tv/videos/1#comment' },
  { name: 'channel page → null (intentionally unhandled)',
    input: 'https://www.twitch.tv/somechannel?tt_content=live',
    expected: null },
  { name: 'directory → null',
    input: 'https://www.twitch.tv/directory/category/just-chatting',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://nottwitch.tv/videos/1',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenTwitchUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isTwitchHost: twitch.tv', isTwitchHost('twitch.tv'), true);
check('isTwitchHost: clips.twitch.tv', isTwitchHost('clips.twitch.tv'), true);
check('isTwitchHost: nottwitch.tv', isTwitchHost('nottwitch.tv'), false);
check('isPostUrl: vod', isPostUrl('https://twitch.tv/videos/1'), true);
check('isPostUrl: channel', isPostUrl('https://twitch.tv/somechannel'), false);
check('shorten on garbage', shortenTwitchUrl('not a url'), null);
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
