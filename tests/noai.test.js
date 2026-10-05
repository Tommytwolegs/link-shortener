const path = require('path');
const { transformSearchUrl } = require(path.join('..', 'src', 'noai.js'));

const CASES = [
  // Appends
  { name: 'plain web search gets the suffix',
    input: 'https://www.google.com/search?q=best+laptop',
    expected: 'https://www.google.com/search?q=best+laptop+-ai' },
  { name: 'bare google.com host works',
    input: 'https://google.com/search?q=weather+boston',
    expected: 'https://google.com/search?q=weather+boston+-ai' },
  { name: 'ccTLD: google.de',
    input: 'https://www.google.de/search?q=waschmaschine+test',
    expected: 'https://www.google.de/search?q=waschmaschine+test+-ai' },
  { name: 'ccTLD: google.co.uk',
    input: 'https://www.google.co.uk/search?q=train+times',
    expected: 'https://www.google.co.uk/search?q=train+times+-ai' },
  { name: 'ccTLD: google.com.br',
    input: 'https://www.google.com.br/search?q=receita+de+bolo',
    expected: 'https://www.google.com.br/search?q=receita+de+bolo+-ai' },
  { name: 'other params and hash survive',
    input: 'https://www.google.com/search?q=hotels&hl=en&num=20#top',
    expected: 'https://www.google.com/search?q=hotels+-ai&hl=en&num=20#top' },
  { name: 'openai is not the ai token: still appends',
    input: 'https://www.google.com/search?q=openai+pricing',
    expected: 'https://www.google.com/search?q=openai+pricing+-ai' },
  { name: 'air fryer is not the ai token: still appends',
    input: 'https://www.google.com/search?q=air+fryer+recipes',
    expected: 'https://www.google.com/search?q=air+fryer+recipes+-ai' },
  { name: 'bonsai is not the ai token: still appends',
    input: 'https://www.google.com/search?q=bonsai+care',
    expected: 'https://www.google.com/search?q=bonsai+care+-ai' },

  // Stand-downs: loop guard
  { name: 'already suffixed (the rewritten navigation): null',
    input: 'https://www.google.com/search?q=best+laptop+-ai',
    expected: null },
  { name: 'user typed -ai themselves mid-query: null',
    input: 'https://www.google.com/search?q=-ai+best+laptop',
    expected: null },
  { name: 'quoted exclusion -"ai": null',
    input: 'https://www.google.com/search?q=robots+-%22ai%22',
    expected: null },

  // Stand-downs: the query is about AI
  { name: 'query about ai: null (would exclude wanted results)',
    input: 'https://www.google.com/search?q=what+is+ai',
    expected: null },
  { name: 'ai-generated (hyphenated token): null',
    input: 'https://www.google.com/search?q=ai-generated+art',
    expected: null },
  { name: 'ai at the start: null',
    input: 'https://www.google.com/search?q=ai+safety+jobs',
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
