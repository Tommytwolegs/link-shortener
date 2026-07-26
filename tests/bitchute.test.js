// Unit tests for src/bitchute.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenBitchuteUrl, needsShortening, isBitchuteHost, isPostUrl } = require(path.join('..', 'src', 'bitchute.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://www.bitchute.com/video/abc123def?utm_source=share&fbclid=z', expected: 'https://www.bitchute.com/video/abc123def' },
  { name: 'already clean', input: 'https://www.bitchute.com/video/abc123def', expected: 'https://www.bitchute.com/video/abc123def', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://www.bitchute.com/video/abc123def?utm_source=x#c', expected: 'https://www.bitchute.com/video/abc123def#c' },
  { name: 'lookalike -> null', input: 'https://notbitchute.com/video/abc123def?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://bitchute.com.evil.com/video/abc123def?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenBitchuteUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isBitchuteHost('www.bitchute.com'),true);
check('host not',isBitchuteHost('notbitchute.com'),false);
check('host evil',isBitchuteHost('bitchute.com.evil.com'),false);
check('isPostUrl true',isPostUrl('https://www.bitchute.com/video/abc123def?utm_source=x'),true);
check('garbage',shortenBitchuteUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
