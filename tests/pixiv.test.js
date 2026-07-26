// Unit tests for src/pixiv.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenPixivUrl, needsShortening, isPixivHost, isPostUrl } = require(path.join('..', 'src', 'pixiv.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://www.pixiv.net/en/artworks/12345678?utm_source=share&fbclid=z', expected: 'https://www.pixiv.net/en/artworks/12345678' },
  { name: 'already clean', input: 'https://www.pixiv.net/en/artworks/12345678', expected: 'https://www.pixiv.net/en/artworks/12345678', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://www.pixiv.net/en/artworks/12345678?utm_source=x#c', expected: 'https://www.pixiv.net/en/artworks/12345678#c' },
  { name: 'lookalike -> null', input: 'https://notpixiv.net/en/artworks/12345678?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://pixiv.net.evil.com/en/artworks/12345678?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenPixivUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isPixivHost('www.pixiv.net'),true);
check('host not',isPixivHost('notpixiv.net'),false);
check('host evil',isPixivHost('pixiv.net.evil.com'),false);
check('isPostUrl true',isPostUrl('https://www.pixiv.net/en/artworks/12345678?utm_source=x'),true);
check('garbage',shortenPixivUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
