// Unit tests for src/odysee.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenOdyseeUrl, needsShortening, isOdyseeHost, isPostUrl } = require(path.join('..', 'src', 'odysee.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://www.odysee.com/@channel:a/video-slug:b?utm_source=share&fbclid=z', expected: 'https://www.odysee.com/@channel:a/video-slug:b' },
  { name: 'already clean', input: 'https://www.odysee.com/@channel:a/video-slug:b', expected: 'https://www.odysee.com/@channel:a/video-slug:b', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://www.odysee.com/@channel:a/video-slug:b?utm_source=x#c', expected: 'https://www.odysee.com/@channel:a/video-slug:b#c' },
  { name: 'lookalike -> null', input: 'https://notodysee.com/@channel:a/video-slug:b?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://odysee.com.evil.com/@channel:a/video-slug:b?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenOdyseeUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isOdyseeHost('www.odysee.com'),true);
check('host not',isOdyseeHost('notodysee.com'),false);
check('host evil',isOdyseeHost('odysee.com.evil.com'),false);
check('isPostUrl true',isPostUrl('https://www.odysee.com/@channel:a/video-slug:b?utm_source=x'),true);
check('garbage',shortenOdyseeUrl('not a url'),null);
check('r (referral) stripped', shortenOdyseeUrl('https://odysee.com/@c:a/v:b?r=INVITE&fbclid=z'), 'https://odysee.com/@c:a/v:b');
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
