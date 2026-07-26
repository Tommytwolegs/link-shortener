// Unit tests for src/udemy.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenUdemyUrl, needsShortening, isUdemyHost, isPostUrl } = require(path.join('..', 'src', 'udemy.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://www.udemy.com/course/the-complete-web-developer?utm_source=share&fbclid=z', expected: 'https://www.udemy.com/course/the-complete-web-developer' },
  { name: 'already clean', input: 'https://www.udemy.com/course/the-complete-web-developer', expected: 'https://www.udemy.com/course/the-complete-web-developer', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://www.udemy.com/course/the-complete-web-developer?utm_source=x#c', expected: 'https://www.udemy.com/course/the-complete-web-developer#c' },
  { name: 'lookalike -> null', input: 'https://notudemy.com/course/the-complete-web-developer?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://udemy.com.evil.com/course/the-complete-web-developer?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenUdemyUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isUdemyHost('www.udemy.com'),true);
check('host not',isUdemyHost('notudemy.com'),false);
check('host evil',isUdemyHost('udemy.com.evil.com'),false);
check('isPostUrl true',isPostUrl('https://www.udemy.com/course/the-complete-web-developer?utm_source=x'),true);
check('garbage',shortenUdemyUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
