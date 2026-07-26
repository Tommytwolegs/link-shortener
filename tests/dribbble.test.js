// Unit tests for src/dribbble.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenDribbbleUrl, needsShortening, isDribbbleHost, isPostUrl } = require(path.join('..', 'src', 'dribbble.js'));
const CASES = [
  { name: 'path kept, utm + fbclid stripped', input: 'https://www.dribbble.com/shots/12345678-Some-Shot?utm_source=share&fbclid=z', expected: 'https://www.dribbble.com/shots/12345678-Some-Shot' },
  { name: 'already clean', input: 'https://www.dribbble.com/shots/12345678-Some-Shot', expected: 'https://www.dribbble.com/shots/12345678-Some-Shot', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://www.dribbble.com/shots/12345678-Some-Shot?utm_source=x#c', expected: 'https://www.dribbble.com/shots/12345678-Some-Shot#c' },
  { name: 'lookalike -> null', input: 'https://notdribbble.com/shots/12345678-Some-Shot?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://dribbble.com.evil.com/shots/12345678-Some-Shot?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenDribbbleUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isDribbbleHost('www.dribbble.com'),true);
check('host not',isDribbbleHost('notdribbble.com'),false);
check('host evil',isDribbbleHost('dribbble.com.evil.com'),false);
check('isPostUrl true',isPostUrl('https://www.dribbble.com/shots/12345678-Some-Shot?utm_source=x'),true);
check('garbage',shortenDribbbleUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
