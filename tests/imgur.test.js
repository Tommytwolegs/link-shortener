// Unit tests for src/imgur.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenImgurUrl, needsShortening, isImgurHost, isPostUrl } = require(path.join('..', 'src', 'imgur.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://imgur.com/gallery/abc123?utm_source=share&fbclid=z', expected: 'https://imgur.com/gallery/abc123' },
  { name: 'already clean', input: 'https://imgur.com/gallery/abc123', expected: 'https://imgur.com/gallery/abc123', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://imgur.com/gallery/abc123?utm_source=x#c', expected: 'https://imgur.com/gallery/abc123#c' },
  { name: 'lookalike -> null', input: 'https://notimgur.com/gallery/abc123?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://imgur.com.evil.com/gallery/abc123?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenImgurUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isImgurHost('imgur.com'),true);
check('host not',isImgurHost('notimgur.com'),false);
check('host evil',isImgurHost('imgur.com.evil.com'),false);
check('isPostUrl true',isPostUrl('https://imgur.com/gallery/abc123?utm_source=x'),true);
check('garbage',shortenImgurUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
