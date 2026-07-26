// Unit tests for src/vecteezy.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenVecteezyUrl, needsShortening, isVecteezyHost, isPostUrl } = require(path.join('..', 'src', 'vecteezy.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://vecteezy.com/vector-art/123456-some-slug?utm_source=share&fbclid=z', expected: 'https://vecteezy.com/vector-art/123456-some-slug' },
  { name: 'already clean', input: 'https://vecteezy.com/vector-art/123456-some-slug', expected: 'https://vecteezy.com/vector-art/123456-some-slug', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://vecteezy.com/vector-art/123456-some-slug?utm_source=x#c', expected: 'https://vecteezy.com/vector-art/123456-some-slug#c' },
  { name: 'lookalike -> null', input: 'https://notvecteezy.com/vector-art/123456-some-slug?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://vecteezy.com.evil.com/vector-art/123456-some-slug?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenVecteezyUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isVecteezyHost('vecteezy.com'),true);
check('host not',isVecteezyHost('notvecteezy.com'),false);
check('host evil',isVecteezyHost('vecteezy.com.evil.com'),false);
check('isPostUrl true',isPostUrl('https://vecteezy.com/vector-art/123456-some-slug?utm_source=x'),true);
check('garbage',shortenVecteezyUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
