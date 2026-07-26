// Unit tests for src/unsplash.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenUnsplashUrl, needsShortening, isUnsplashHost, isPostUrl } = require(path.join('..', 'src', 'unsplash.js'));
const CASES = [
  { name: 'path kept, utm + fbclid stripped', input: 'https://www.unsplash.com/photos/some-slug-abc123?utm_source=share&fbclid=z', expected: 'https://www.unsplash.com/photos/some-slug-abc123' },
  { name: 'already clean', input: 'https://www.unsplash.com/photos/some-slug-abc123', expected: 'https://www.unsplash.com/photos/some-slug-abc123', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://www.unsplash.com/photos/some-slug-abc123?utm_source=x#c', expected: 'https://www.unsplash.com/photos/some-slug-abc123#c' },
  { name: 'lookalike -> null', input: 'https://notunsplash.com/photos/some-slug-abc123?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://unsplash.com.evil.com/photos/some-slug-abc123?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenUnsplashUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isUnsplashHost('www.unsplash.com'),true);
check('host not',isUnsplashHost('notunsplash.com'),false);
check('host evil',isUnsplashHost('unsplash.com.evil.com'),false);
check('isPostUrl true',isPostUrl('https://www.unsplash.com/photos/some-slug-abc123?utm_source=x'),true);
check('garbage',shortenUnsplashUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
