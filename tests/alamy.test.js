// Unit tests for src/alamy.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenAlamyUrl, needsShortening, isAlamyHost, isPostUrl } = require(path.join('..', 'src', 'alamy.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://alamy.com/stock-photo/some-slug-123456789.html?utm_source=share&fbclid=z', expected: 'https://alamy.com/stock-photo/some-slug-123456789.html' },
  { name: 'already clean', input: 'https://alamy.com/stock-photo/some-slug-123456789.html', expected: 'https://alamy.com/stock-photo/some-slug-123456789.html', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://alamy.com/stock-photo/some-slug-123456789.html?utm_source=x#c', expected: 'https://alamy.com/stock-photo/some-slug-123456789.html#c' },
  { name: 'lookalike -> null', input: 'https://notalamy.com/stock-photo/some-slug-123456789.html?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://alamy.com.evil.com/stock-photo/some-slug-123456789.html?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenAlamyUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isAlamyHost('alamy.com'),true);
check('host not',isAlamyHost('notalamy.com'),false);
check('host evil',isAlamyHost('alamy.com.evil.com'),false);
check('isPostUrl true',isPostUrl('https://alamy.com/stock-photo/some-slug-123456789.html?utm_source=x'),true);
check('garbage',shortenAlamyUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
