// Unit tests for src/brilliant.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenBrilliantUrl, needsShortening, isBrilliantHost, isPostUrl } = require(path.join('..', 'src', 'brilliant.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://www.brilliant.org/courses/some-course?utm_source=share&fbclid=z', expected: 'https://www.brilliant.org/courses/some-course' },
  { name: 'already clean', input: 'https://www.brilliant.org/courses/some-course', expected: 'https://www.brilliant.org/courses/some-course', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://www.brilliant.org/courses/some-course?utm_source=x#c', expected: 'https://www.brilliant.org/courses/some-course#c' },
  { name: 'lookalike -> null', input: 'https://notbrilliant.org/courses/some-course?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://brilliant.org.evil.com/courses/some-course?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenBrilliantUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isBrilliantHost('www.brilliant.org'),true);
check('host not',isBrilliantHost('notbrilliant.org'),false);
check('host evil',isBrilliantHost('brilliant.org.evil.com'),false);
check('isPostUrl true',isPostUrl('https://www.brilliant.org/courses/some-course?utm_source=x'),true);
check('garbage',shortenBrilliantUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
