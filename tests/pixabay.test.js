// Unit tests for src/pixabay.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenPixabayUrl, needsShortening, isPixabayHost, isPostUrl } = require(path.join('..', 'src', 'pixabay.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://www.pixabay.com/photos/nature-12345?utm_source=share&fbclid=z', expected: 'https://www.pixabay.com/photos/nature-12345' },
  { name: 'already clean', input: 'https://www.pixabay.com/photos/nature-12345', expected: 'https://www.pixabay.com/photos/nature-12345', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://www.pixabay.com/photos/nature-12345?utm_source=x#c', expected: 'https://www.pixabay.com/photos/nature-12345#c' },
  { name: 'lookalike -> null', input: 'https://notpixabay.com/photos/nature-12345?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://pixabay.com.evil.com/photos/nature-12345?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenPixabayUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isPixabayHost('www.pixabay.com'),true);
check('host not',isPixabayHost('notpixabay.com'),false);
check('host evil',isPixabayHost('pixabay.com.evil.com'),false);
check('isPostUrl true',isPostUrl('https://www.pixabay.com/photos/nature-12345?utm_source=x'),true);
check('garbage',shortenPixabayUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
