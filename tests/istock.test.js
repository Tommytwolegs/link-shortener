// Unit tests for src/istock.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenIstockUrl, needsShortening, isIstockHost, isPostUrl } = require(path.join('..', 'src', 'istock.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://istockphoto.com/photo/some-slug-gm123456789?utm_source=share&fbclid=z', expected: 'https://istockphoto.com/photo/some-slug-gm123456789' },
  { name: 'already clean', input: 'https://istockphoto.com/photo/some-slug-gm123456789', expected: 'https://istockphoto.com/photo/some-slug-gm123456789', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://istockphoto.com/photo/some-slug-gm123456789?utm_source=x#c', expected: 'https://istockphoto.com/photo/some-slug-gm123456789#c' },
  { name: 'lookalike -> null', input: 'https://notistockphoto.com/photo/some-slug-gm123456789?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://istockphoto.com.evil.com/photo/some-slug-gm123456789?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenIstockUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isIstockHost('istockphoto.com'),true);
check('host not',isIstockHost('notistockphoto.com'),false);
check('host evil',isIstockHost('istockphoto.com.evil.com'),false);
check('isPostUrl true',isPostUrl('https://istockphoto.com/photo/some-slug-gm123456789?utm_source=x'),true);
check('garbage',shortenIstockUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
