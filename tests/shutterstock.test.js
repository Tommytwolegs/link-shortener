// Unit tests for src/shutterstock.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenShutterstockUrl, needsShortening, isShutterstockHost, isPostUrl } = require(path.join('..', 'src', 'shutterstock.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://www.shutterstock.com/image-photo/some-slug-123456789?utm_source=share&fbclid=z', expected: 'https://www.shutterstock.com/image-photo/some-slug-123456789' },
  { name: 'already clean', input: 'https://www.shutterstock.com/image-photo/some-slug-123456789', expected: 'https://www.shutterstock.com/image-photo/some-slug-123456789', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://www.shutterstock.com/image-photo/some-slug-123456789?utm_source=x#c', expected: 'https://www.shutterstock.com/image-photo/some-slug-123456789#c' },
  { name: 'lookalike -> null', input: 'https://notshutterstock.com/image-photo/some-slug-123456789?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://shutterstock.com.evil.com/image-photo/some-slug-123456789?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenShutterstockUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isShutterstockHost('www.shutterstock.com'),true);
check('host not',isShutterstockHost('notshutterstock.com'),false);
check('host evil',isShutterstockHost('shutterstock.com.evil.com'),false);
check('isPostUrl true',isPostUrl('https://www.shutterstock.com/image-photo/some-slug-123456789?utm_source=x'),true);
check('garbage',shortenShutterstockUrl('not a url'),null);
check('src stripped', shortenShutterstockUrl('https://www.shutterstock.com/image-photo/x-1?src=abc-1&utm_source=y'), 'https://www.shutterstock.com/image-photo/x-1');
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
