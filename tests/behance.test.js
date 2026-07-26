// Unit tests for src/behance.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenBehanceUrl, needsShortening, isBehanceHost, isPostUrl } = require(path.join('..', 'src', 'behance.js'));
const CASES = [
  { name: 'path kept, utm + tracking_source stripped', input: 'https://www.behance.net/gallery/12345678/Some-Project?utm_source=share&tracking_source=z', expected: 'https://www.behance.net/gallery/12345678/Some-Project' },
  { name: 'already clean', input: 'https://www.behance.net/gallery/12345678/Some-Project', expected: 'https://www.behance.net/gallery/12345678/Some-Project', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://www.behance.net/gallery/12345678/Some-Project?utm_source=x#c', expected: 'https://www.behance.net/gallery/12345678/Some-Project#c' },
  { name: 'lookalike -> null', input: 'https://notbehance.net/gallery/12345678/Some-Project?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://behance.net.evil.com/gallery/12345678/Some-Project?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenBehanceUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isBehanceHost('www.behance.net'),true);
check('host not',isBehanceHost('notbehance.net'),false);
check('host evil',isBehanceHost('behance.net.evil.com'),false);
check('isPostUrl true',isPostUrl('https://www.behance.net/gallery/12345678/Some-Project?utm_source=x'),true);
check('garbage',shortenBehanceUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
