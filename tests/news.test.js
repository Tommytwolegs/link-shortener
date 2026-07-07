const path = require('path');
const {
  shortenNewsUrl,
  needsShortening,
  isNewsHost,
  isPostUrl,
} = require(path.join('..', 'src', 'news.js'));

const CASES = [
  { name: 'NYT smid stripped',
    input: 'https://www.nytimes.com/2026/06/12/technology/some-article.html?smid=url-share&smtyp=cur',
    expected: 'https://www.nytimes.com/2026/06/12/technology/some-article.html' },
  { name: 'NYT GIFT TOKEN PRESERVED',
    input: 'https://www.nytimes.com/2026/06/12/technology/some-article.html?unlocked_article_code=1.abc123&smid=url-share',
    expected: 'https://www.nytimes.com/2026/06/12/technology/some-article.html?unlocked_article_code=1.abc123' },
  { name: 'Guardian CMP stripped',
    input: 'https://www.theguardian.com/world/2026/jun/12/some-story?CMP=share_btn_url',
    expected: 'https://www.theguardian.com/world/2026/jun/12/some-story' },
  { name: 'WaPo itid stripped',
    input: 'https://www.washingtonpost.com/technology/2026/06/12/story/?itid=hp-top-table-main',
    expected: 'https://www.washingtonpost.com/technology/2026/06/12/story/' },
  { name: 'BBC at_* family stripped',
    input: 'https://www.bbc.com/news/articles/abc123?at_medium=social&at_campaign=Social_Flow&at_link_origin=BBCWorld',
    expected: 'https://www.bbc.com/news/articles/abc123' },
  { name: 'Daily Mail ito stripped',
    input: 'https://www.dailymail.co.uk/news/article-12345/story.html?ito=social-twitter',
    expected: 'https://www.dailymail.co.uk/news/article-12345/story.html' },
  { name: 'Bloomberg sref stripped, accessToken (gift) PRESERVED',
    input: 'https://www.bloomberg.com/news/articles/2026-06-12/story?sref=AbC123&accessToken=xyz789&cmpid=socialflow',
    expected: 'https://www.bloomberg.com/news/articles/2026-06-12/story?accessToken=xyz789' },
  { name: 'WSJ mod stripped, st gift token PRESERVED',
    input: 'https://www.wsj.com/tech/some-story-abc123?mod=hp_lead_pos1&st=xyzGift&reflink=share_mobilewebshare',
    expected: 'https://www.wsj.com/tech/some-story-abc123?st=xyzGift' },
  { name: 'CNN cid stripped',
    input: 'https://www.cnn.com/2026/06/12/tech/story/index.html?cid=external-feeds_iluminar_google',
    expected: 'https://www.cnn.com/2026/06/12/tech/story/index.html' },
  { name: 'AP utm stripped',
    input: 'https://apnews.com/article/abc123?utm_source=copy&utm_medium=share',
    expected: 'https://apnews.com/article/abc123' },
  { name: 'NPR utm stripped, functional preserved',
    input: 'https://www.npr.org/2026/06/12/story-slug?utm_campaign=npr&live=1',
    expected: 'https://www.npr.org/2026/06/12/story-slug?live=1' },
  { name: 'Fox intcmp stripped',
    input: 'https://www.foxnews.com/politics/story?intcmp=tw_fnc',
    expected: 'https://www.foxnews.com/politics/story' },
  { name: 'Reuters taid stripped',
    input: 'https://www.reuters.com/technology/story-2026-06-12/?taid=abc123',
    expected: 'https://www.reuters.com/technology/story-2026-06-12/' },
  { name: 'clean article passthrough',
    input: 'https://www.theguardian.com/world/2026/jun/12/some-story',
    expected: 'https://www.theguardian.com/world/2026/jun/12/some-story',
    expectedNeeds: false },
  { name: 'hash preserved',
    input: 'https://www.bbc.com/news/articles/abc?at_medium=social#comments',
    expected: 'https://www.bbc.com/news/articles/abc#comments' },
  { name: 'non-outlet → null',
    input: 'https://www.economist.com/leaders/2026/06/12/story?utm_source=x',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenNewsUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('host: nytimes', isNewsHost('www.nytimes.com'), true);
check('host: bbc.co.uk', isNewsHost('www.bbc.co.uk'), true);
check('host: lookalike', isNewsHost('nytimes.com.evil.com'), false);
check('shorten on garbage', shortenNewsUrl('not a url'), null);
check('needs on garbage', needsShortening('not a url'), false);
// Mutation guard (denylist module):
const probe = new URL('https://www.cnn.com/story?cid=x');
check('shorten on URL object', shortenNewsUrl(probe), 'https://www.cnn.com/story');
check('URL-object input not mutated', probe.href, 'https://www.cnn.com/story?cid=x');
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
