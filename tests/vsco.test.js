// Unit tests for src/vsco.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenVscoUrl, needsShortening, isVscoHost, isPostUrl } = require(path.join('..', 'src', 'vsco.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://vsco.co/someuser/media/abc123?utm_source=share&fbclid=z', expected: 'https://vsco.co/someuser/media/abc123' },
  { name: 'already clean', input: 'https://vsco.co/someuser/media/abc123', expected: 'https://vsco.co/someuser/media/abc123', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://vsco.co/someuser/media/abc123?utm_source=x#c', expected: 'https://vsco.co/someuser/media/abc123#c' },
  { name: 'lookalike -> null', input: 'https://notvsco.co/someuser/media/abc123?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://vsco.co.evil.com/someuser/media/abc123?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenVscoUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isVscoHost('vsco.co'),true);
check('host not',isVscoHost('notvsco.co'),false);
check('host evil',isVscoHost('vsco.co.evil.com'),false);
check('isPostUrl true',isPostUrl('https://vsco.co/someuser/media/abc123?utm_source=x'),true);
check('garbage',shortenVscoUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
