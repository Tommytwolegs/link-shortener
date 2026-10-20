const path = require('path');
const { transformSearchUrl, SUFFIX } = require(path.join('..', 'src', 'noai.js'));

// q=... with the suffix appended, as URLSearchParams serializes it:
// space -> +, quote -> %22.
const ENC_SUFFIX = '+-%22AI+Overview%22';

const CASES = [
  // Appends
  { name: 'plain web search gets the suffix',
    input: 'https://www.google.com/search?q=best+laptop',
    expected: 'https://www.google.com/search?q=best+laptop' + ENC_SUFFIX },
  { name: 'bare google.com host works',
    input: 'https://google.com/search?q=weather+boston',
    expected: 'https://google.com/search?q=weather+boston' + ENC_SUFFIX },
  { name: 'ccTLD: google.de',
    input: 'https://www.google.de/search?q=waschmaschine+test',
    expected: 'https://www.google.de/search?q=waschmaschine+test' + ENC_SUFFIX },
  { name: 'ccTLD: google.co.uk',
    input: 'https://www.google.co.uk/search?q=train+times',
    expected: 'https://www.google.co.uk/search?q=train+times' + ENC_SUFFIX },
  { name: 'ccTLD: google.com.br',
    input: 'https://www.google.com.br/search?q=receita+de+bolo',
    expected: 'https://www.google.com.br/search?q=receita+de+bolo' + ENC_SUFFIX },
  { name: 'other params and hash survive',
    input: 'https://www.google.com/search?q=hotels&hl=en&num=20#top',
    expected: 'https://www.google.com/search?q=hotels' + ENC_SUFFIX + '&hl=en&num=20#top' },
  { name: 'AI-topic query STILL works (the phrase form needs no guard)',
    input: 'https://www.google.com/search?q=what+is+ai',
    expected: 'https://www.google.com/search?q=what+is+ai' + ENC_SUFFIX },
  { name: 'ai-generated art appends too',
    input: 'https://www.google.com/search?q=ai-generated+art',
    expected: 'https://www.google.com/search?q=ai-generated+art' + ENC_SUFFIX },
  { name: 'openai appends',
    input: 'https://www.google.com/search?q=openai+pricing',
    expected: 'https://www.google.com/search?q=openai+pricing' + ENC_SUFFIX },
  { name: 'hyphenated word is not an exclusion: gluten-free appends',
    input: 'https://www.google.com/search?q=gluten-free+recipes',
    expected: 'https://www.google.com/search?q=gluten-free+recipes' + ENC_SUFFIX },

  // Stand-downs: an exclusion operator is already there
  { name: 'our own suffix (the rewritten navigation): null',
    input: 'https://www.google.com/search?q=best+laptop' + ENC_SUFFIX,
    expected: null },
  { name: 'user excluded a word themselves: null',
    input: 'https://www.google.com/search?q=best+phones+-samsung',
    expected: null },
  { name: 'user excluded a quoted phrase: null',
    input: 'https://www.google.com/search?q=robots+-%22sci+fi%22',
    expected: null },
  { name: 'the old -ai trick typed by hand: null (already suppressed)',
    input: 'https://www.google.com/search?q=best+laptop+-ai',
    expected: null },
  { name: 'exclusion at the start: null',
    input: 'https://www.google.com/search?q=-ads+best+vpn',
    expected: null },

  // Stand-downs: the query is about AI Overviews themselves
  { name: 'searching about ai overview: null',
    input: 'https://www.google.com/search?q=google+ai+overview+rollout',
    expected: null },
  { name: 'searching how to turn off ai overviews: null',
    input: 'https://www.google.com/search?q=turn+off+ai+overviews',
    expected: null },

  // Stand-downs: verticals and hosts
  { name: 'image search (tbm=isch): null',
    input: 'https://www.google.com/search?q=kittens&tbm=isch',
    expected: null },
  { name: 'udm tab (udm=14 Web): null',
    input: 'https://www.google.com/search?q=kittens&udm=14',
    expected: null },
  { name: 'news.google.com: null (product subdomain)',
    input: 'https://news.google.com/search?q=elections',
    expected: null },
  { name: 'maps.google.com: null',
    input: 'https://maps.google.com/search?q=pizza',
    expected: null },
  { name: 'not google at all: null',
    input: 'https://www.bing.com/search?q=best+laptop',
    expected: null },
  { name: 'lookalike host: null',
    input: 'https://google.com.evil.example/search?q=x',
    expected: null },
  { name: 'google homepage (no /search): null',
    input: 'https://www.google.com/?q=test',
    expected: null },
  { name: 'empty q: null',
    input: 'https://www.google.com/search?q=',
    expected: null },
  { name: 'no q at all: null',
    input: 'https://www.google.com/search?tbs=qdr:d',
    expected: null },
  { name: 'garbage input: null', input: 'not a url', expected: null },
  { name: 'non-http scheme: null',
    input: 'ftp://www.google.com/search?q=x',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  check(c.name, transformSearchUrl(c.input), c.expected);
}

// Idempotence: transforming a transformed URL is always null.
for (const c of CASES) {
  if (c.expected) {
    check('idempotent - ' + c.name, transformSearchUrl(c.expected), null);
  }
}

check('exported suffix is the quoted-phrase form', SUFFIX, ' -"AI Overview"');

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
