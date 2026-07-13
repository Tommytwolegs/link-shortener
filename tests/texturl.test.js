const path = require('path');
const { extractUrlFromText } = require(path.join('..', 'src', 'texturl.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}

// Plain URLs
check('bare url', extractUrlFromText('https://example.com/page?id=5'), 'https://example.com/page?id=5');
check('url inside prose', extractUrlFromText('check this out: https://example.com/page and tell me'), 'https://example.com/page');
check('url with trailing period', extractUrlFromText('See https://example.com/article.'), 'https://example.com/article');
check('url with trailing comma + quote', extractUrlFromText('"https://example.com/x",'), 'https://example.com/x');
check('url in parentheses loses closer', extractUrlFromText('(see https://example.com/a)'), 'https://example.com/a');
check('wikipedia parens preserved', extractUrlFromText('https://en.wikipedia.org/wiki/Foo_(bar)'), 'https://en.wikipedia.org/wiki/Foo_(bar)');
check('wikipedia parens + sentence close', extractUrlFromText('(https://en.wikipedia.org/wiki/Foo_(bar))'), 'https://en.wikipedia.org/wiki/Foo_(bar)');
check('http scheme kept', extractUrlFromText('http://example.com/'), 'http://example.com/');
check('first of two urls wins', extractUrlFromText('https://first.com/a then https://second.com/b'), 'https://first.com/a');
check('query + fragment survive', extractUrlFromText('https://example.com/p?a=1&utm_source=x#frag'), 'https://example.com/p?a=1&utm_source=x#frag');

// Scheme-less selections
check('bare domain gets https', extractUrlFromText('example.com/page?id=5'), 'https://example.com/page?id=5');
check('bare domain with subdomain', extractUrlFromText('  www.example.co.uk/path  '), 'https://www.example.co.uk/path');
check('bare domain no path', extractUrlFromText('example.com'), 'https://example.com/');
check('mid-sentence bare domain NOT guessed', extractUrlFromText('go to example.com now'), null);

// Garbage
check('plain words -> null', extractUrlFromText('hello world'), null);
check('empty -> null', extractUrlFromText(''), null);
check('null -> null', extractUrlFromText(null), null);
check('javascript: not extracted', extractUrlFromText('javascript:alert(1)'), null);
check('ftp not extracted', extractUrlFromText('ftp://example.com/f'), null);
check('single word -> null', extractUrlFromText('example'), null);
check('version number is NOT a domain guess', extractUrlFromText('1.2.3'), null);

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
