// Unit tests for src/tenor.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenTenorUrl, needsShortening, isTenorHost, isPostUrl } = require(path.join('..', 'src', 'tenor.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://www.tenor.com/view/some-slug-gif-12345?utm_source=share&fbclid=z', expected: 'https://www.tenor.com/view/some-slug-gif-12345' },
  { name: 'already clean', input: 'https://www.tenor.com/view/some-slug-gif-12345', expected: 'https://www.tenor.com/view/some-slug-gif-12345', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://www.tenor.com/view/some-slug-gif-12345?utm_source=x#c', expected: 'https://www.tenor.com/view/some-slug-gif-12345#c' },
  { name: 'lookalike -> null', input: 'https://nottenor.com/view/some-slug-gif-12345?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://tenor.com.evil.com/view/some-slug-gif-12345?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenTenorUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isTenorHost('www.tenor.com'),true);
check('host not',isTenorHost('nottenor.com'),false);
check('host evil',isTenorHost('tenor.com.evil.com'),false);
check('isPostUrl true',isPostUrl('https://www.tenor.com/view/some-slug-gif-12345?utm_source=x'),true);
check('garbage',shortenTenorUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
