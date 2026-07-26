// Unit tests for src/smugmug.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenSmugmugUrl, needsShortening, isSmugmugHost, isPostUrl } = require(path.join('..', 'src', 'smugmug.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://smugmug.com/gallery/n-abc/i-xyz?utm_source=share&fbclid=z', expected: 'https://smugmug.com/gallery/n-abc/i-xyz' },
  { name: 'already clean', input: 'https://smugmug.com/gallery/n-abc/i-xyz', expected: 'https://smugmug.com/gallery/n-abc/i-xyz', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://smugmug.com/gallery/n-abc/i-xyz?utm_source=x#c', expected: 'https://smugmug.com/gallery/n-abc/i-xyz#c' },
  { name: 'lookalike -> null', input: 'https://notsmugmug.com/gallery/n-abc/i-xyz?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://smugmug.com.evil.com/gallery/n-abc/i-xyz?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenSmugmugUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isSmugmugHost('smugmug.com'),true);
check('host not',isSmugmugHost('notsmugmug.com'),false);
check('host evil',isSmugmugHost('smugmug.com.evil.com'),false);
check('isPostUrl true',isPostUrl('https://smugmug.com/gallery/n-abc/i-xyz?utm_source=x'),true);
check('garbage',shortenSmugmugUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
