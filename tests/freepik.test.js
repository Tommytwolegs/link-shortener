// Unit tests for src/freepik.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenFreepikUrl, needsShortening, isFreepikHost, isPostUrl } = require(path.join('..', 'src', 'freepik.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://www.freepik.com/free-photo/some-slug_12345.htm?utm_source=share&fbclid=z', expected: 'https://www.freepik.com/free-photo/some-slug_12345.htm' },
  { name: 'already clean', input: 'https://www.freepik.com/free-photo/some-slug_12345.htm', expected: 'https://www.freepik.com/free-photo/some-slug_12345.htm', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://www.freepik.com/free-photo/some-slug_12345.htm?utm_source=x#c', expected: 'https://www.freepik.com/free-photo/some-slug_12345.htm#c' },
  { name: 'lookalike -> null', input: 'https://notfreepik.com/free-photo/some-slug_12345.htm?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://freepik.com.evil.com/free-photo/some-slug_12345.htm?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenFreepikUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isFreepikHost('www.freepik.com'),true);
check('host not',isFreepikHost('notfreepik.com'),false);
check('host evil',isFreepikHost('freepik.com.evil.com'),false);
check('isPostUrl true',isPostUrl('https://www.freepik.com/free-photo/some-slug_12345.htm?utm_source=x'),true);
check('garbage',shortenFreepikUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
