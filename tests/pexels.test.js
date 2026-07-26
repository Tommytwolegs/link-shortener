// Unit tests for src/pexels.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenPexelsUrl, needsShortening, isPexelsHost, isPostUrl } = require(path.join('..', 'src', 'pexels.js'));
const CASES = [
  { name: 'path kept, utm + fbclid stripped', input: 'https://www.pexels.com/photo/some-slug-12345/?utm_source=share&fbclid=z', expected: 'https://www.pexels.com/photo/some-slug-12345/' },
  { name: 'already clean', input: 'https://www.pexels.com/photo/some-slug-12345/', expected: 'https://www.pexels.com/photo/some-slug-12345/', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://www.pexels.com/photo/some-slug-12345/?utm_source=x#c', expected: 'https://www.pexels.com/photo/some-slug-12345/#c' },
  { name: 'lookalike -> null', input: 'https://notpexels.com/photo/some-slug-12345/?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://pexels.com.evil.com/photo/some-slug-12345/?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenPexelsUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isPexelsHost('www.pexels.com'),true);
check('host not',isPexelsHost('notpexels.com'),false);
check('host evil',isPexelsHost('pexels.com.evil.com'),false);
check('isPostUrl true',isPostUrl('https://www.pexels.com/photo/some-slug-12345/?utm_source=x'),true);
check('garbage',shortenPexelsUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
