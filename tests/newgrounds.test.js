// Unit tests for src/newgrounds.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenNewgroundsUrl, needsShortening, isNewgroundsHost, isPostUrl } = require(path.join('..', 'src', 'newgrounds.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://www.newgrounds.com/portal/view/123456?utm_source=share&fbclid=z', expected: 'https://www.newgrounds.com/portal/view/123456' },
  { name: 'already clean', input: 'https://www.newgrounds.com/portal/view/123456', expected: 'https://www.newgrounds.com/portal/view/123456', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://www.newgrounds.com/portal/view/123456?utm_source=x#c', expected: 'https://www.newgrounds.com/portal/view/123456#c' },
  { name: 'lookalike -> null', input: 'https://notnewgrounds.com/portal/view/123456?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://newgrounds.com.evil.com/portal/view/123456?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenNewgroundsUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isNewgroundsHost('www.newgrounds.com'),true);
check('host not',isNewgroundsHost('notnewgrounds.com'),false);
check('host evil',isNewgroundsHost('newgrounds.com.evil.com'),false);
check('isPostUrl true',isPostUrl('https://www.newgrounds.com/portal/view/123456?utm_source=x'),true);
check('garbage',shortenNewgroundsUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
