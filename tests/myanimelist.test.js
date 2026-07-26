// Unit tests for src/myanimelist.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenMyanimelistUrl, needsShortening, isMyanimelistHost, isPostUrl } = require(path.join('..', 'src', 'myanimelist.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://www.myanimelist.net/anime/12345/Some_Title?utm_source=share&fbclid=z', expected: 'https://www.myanimelist.net/anime/12345/Some_Title' },
  { name: 'already clean', input: 'https://www.myanimelist.net/anime/12345/Some_Title', expected: 'https://www.myanimelist.net/anime/12345/Some_Title', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://www.myanimelist.net/anime/12345/Some_Title?utm_source=x#c', expected: 'https://www.myanimelist.net/anime/12345/Some_Title#c' },
  { name: 'lookalike -> null', input: 'https://notmyanimelist.net/anime/12345/Some_Title?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://myanimelist.net.evil.com/anime/12345/Some_Title?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenMyanimelistUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isMyanimelistHost('www.myanimelist.net'),true);
check('host not',isMyanimelistHost('notmyanimelist.net'),false);
check('host evil',isMyanimelistHost('myanimelist.net.evil.com'),false);
check('isPostUrl true',isPostUrl('https://www.myanimelist.net/anime/12345/Some_Title?utm_source=x'),true);
check('garbage',shortenMyanimelistUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
