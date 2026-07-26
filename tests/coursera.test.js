// Unit tests for src/coursera.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenCourseraUrl, needsShortening, isCourseraHost, isPostUrl } = require(path.join('..', 'src', 'coursera.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://www.coursera.org/learn/machine-learning?utm_source=share&fbclid=z', expected: 'https://www.coursera.org/learn/machine-learning' },
  { name: 'already clean', input: 'https://www.coursera.org/learn/machine-learning', expected: 'https://www.coursera.org/learn/machine-learning', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://www.coursera.org/learn/machine-learning?utm_source=x#c', expected: 'https://www.coursera.org/learn/machine-learning#c' },
  { name: 'lookalike -> null', input: 'https://notcoursera.org/learn/machine-learning?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://coursera.org.evil.com/learn/machine-learning?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenCourseraUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isCourseraHost('www.coursera.org'),true);
check('host not',isCourseraHost('notcoursera.org'),false);
check('host evil',isCourseraHost('coursera.org.evil.com'),false);
check('isPostUrl true',isPostUrl('https://www.coursera.org/learn/machine-learning?utm_source=x'),true);
check('garbage',shortenCourseraUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
