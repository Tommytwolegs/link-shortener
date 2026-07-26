// Unit tests for src/kick.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenKickUrl, needsShortening, isKickHost, isPostUrl } = require(path.join('..', 'src', 'kick.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://www.kick.com/somechannel?utm_source=share&fbclid=z', expected: 'https://www.kick.com/somechannel' },
  { name: 'already clean', input: 'https://www.kick.com/somechannel', expected: 'https://www.kick.com/somechannel', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://www.kick.com/somechannel?utm_source=x#c', expected: 'https://www.kick.com/somechannel#c' },
  { name: 'lookalike -> null', input: 'https://notkick.com/somechannel?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://kick.com.evil.com/somechannel?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenKickUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isKickHost('www.kick.com'),true);
check('host not',isKickHost('notkick.com'),false);
check('host evil',isKickHost('kick.com.evil.com'),false);
check('isPostUrl true',isPostUrl('https://www.kick.com/somechannel?utm_source=x'),true);
check('garbage',shortenKickUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
