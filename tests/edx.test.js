// Unit tests for src/edx.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenEdxUrl, needsShortening, isEdxHost, isPostUrl } = require(path.join('..', 'src', 'edx.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://www.edx.org/learn/computer-science/harvard-cs50?utm_source=share&fbclid=z', expected: 'https://www.edx.org/learn/computer-science/harvard-cs50' },
  { name: 'already clean', input: 'https://www.edx.org/learn/computer-science/harvard-cs50', expected: 'https://www.edx.org/learn/computer-science/harvard-cs50', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://www.edx.org/learn/computer-science/harvard-cs50?utm_source=x#c', expected: 'https://www.edx.org/learn/computer-science/harvard-cs50#c' },
  { name: 'lookalike -> null', input: 'https://notedx.org/learn/computer-science/harvard-cs50?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://edx.org.evil.com/learn/computer-science/harvard-cs50?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenEdxUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isEdxHost('www.edx.org'),true);
check('host not',isEdxHost('notedx.org'),false);
check('host evil',isEdxHost('edx.org.evil.com'),false);
check('isPostUrl true',isPostUrl('https://www.edx.org/learn/computer-science/harvard-cs50?utm_source=x'),true);
check('garbage',shortenEdxUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
