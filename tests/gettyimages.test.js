// Unit tests for src/gettyimages.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenGettyimagesUrl, needsShortening, isGettyimagesHost, isPostUrl } = require(path.join('..', 'src', 'gettyimages.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://www.gettyimages.com/detail/photo/title-royalty-free-image/123456789?utm_source=share&fbclid=z', expected: 'https://www.gettyimages.com/detail/photo/title-royalty-free-image/123456789' },
  { name: 'already clean', input: 'https://www.gettyimages.com/detail/photo/title-royalty-free-image/123456789', expected: 'https://www.gettyimages.com/detail/photo/title-royalty-free-image/123456789', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://www.gettyimages.com/detail/photo/title-royalty-free-image/123456789?utm_source=x#c', expected: 'https://www.gettyimages.com/detail/photo/title-royalty-free-image/123456789#c' },
  { name: 'lookalike -> null', input: 'https://notgettyimages.com/detail/photo/title-royalty-free-image/123456789?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://gettyimages.com.evil.com/detail/photo/title-royalty-free-image/123456789?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenGettyimagesUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isGettyimagesHost('www.gettyimages.com'),true);
check('host not',isGettyimagesHost('notgettyimages.com'),false);
check('host evil',isGettyimagesHost('gettyimages.com.evil.com'),false);
check('isPostUrl true',isPostUrl('https://www.gettyimages.com/detail/photo/title-royalty-free-image/123456789?utm_source=x'),true);
check('garbage',shortenGettyimagesUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
