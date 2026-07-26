// Unit tests for src/giphy.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenGiphyUrl, needsShortening, isGiphyHost, isPostUrl } = require(path.join('..', 'src', 'giphy.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://www.giphy.com/gifs/some-slug-AbCdEf12?utm_source=share&fbclid=z', expected: 'https://www.giphy.com/gifs/some-slug-AbCdEf12' },
  { name: 'already clean', input: 'https://www.giphy.com/gifs/some-slug-AbCdEf12', expected: 'https://www.giphy.com/gifs/some-slug-AbCdEf12', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://www.giphy.com/gifs/some-slug-AbCdEf12?utm_source=x#c', expected: 'https://www.giphy.com/gifs/some-slug-AbCdEf12#c' },
  { name: 'lookalike -> null', input: 'https://notgiphy.com/gifs/some-slug-AbCdEf12?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://giphy.com.evil.com/gifs/some-slug-AbCdEf12?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenGiphyUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isGiphyHost('www.giphy.com'),true);
check('host not',isGiphyHost('notgiphy.com'),false);
check('host evil',isGiphyHost('giphy.com.evil.com'),false);
check('isPostUrl true',isPostUrl('https://www.giphy.com/gifs/some-slug-AbCdEf12?utm_source=x'),true);
check('garbage',shortenGiphyUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
