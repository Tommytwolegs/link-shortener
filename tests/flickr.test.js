// Unit tests for src/flickr.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenFlickrUrl, needsShortening, isFlickrHost, isPostUrl } = require(path.join('..', 'src', 'flickr.js'));
const CASES = [
  { name: 'path kept, utm + fbclid stripped', input: 'https://www.flickr.com/photos/someuser/12345678901?utm_source=share&fbclid=z', expected: 'https://www.flickr.com/photos/someuser/12345678901' },
  { name: 'already clean', input: 'https://www.flickr.com/photos/someuser/12345678901', expected: 'https://www.flickr.com/photos/someuser/12345678901', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://www.flickr.com/photos/someuser/12345678901?utm_source=x#c', expected: 'https://www.flickr.com/photos/someuser/12345678901#c' },
  { name: 'lookalike -> null', input: 'https://notflickr.com/photos/someuser/12345678901?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://flickr.com.evil.com/photos/someuser/12345678901?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenFlickrUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isFlickrHost('www.flickr.com'),true);
check('host not',isFlickrHost('notflickr.com'),false);
check('host evil',isFlickrHost('flickr.com.evil.com'),false);
check('isPostUrl true',isPostUrl('https://www.flickr.com/photos/someuser/12345678901?utm_source=x'),true);
check('garbage',shortenFlickrUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
