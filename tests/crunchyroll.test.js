// Unit tests for src/crunchyroll.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenCrunchyrollUrl, needsShortening, isCrunchyrollHost, isPostUrl } = require(path.join('..', 'src', 'crunchyroll.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://www.crunchyroll.com/watch/ABC123/some-episode?utm_source=share&fbclid=z', expected: 'https://www.crunchyroll.com/watch/ABC123/some-episode' },
  { name: 'already clean', input: 'https://www.crunchyroll.com/watch/ABC123/some-episode', expected: 'https://www.crunchyroll.com/watch/ABC123/some-episode', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://www.crunchyroll.com/watch/ABC123/some-episode?utm_source=x#c', expected: 'https://www.crunchyroll.com/watch/ABC123/some-episode#c' },
  { name: 'lookalike -> null', input: 'https://notcrunchyroll.com/watch/ABC123/some-episode?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://crunchyroll.com.evil.com/watch/ABC123/some-episode?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenCrunchyrollUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isCrunchyrollHost('www.crunchyroll.com'),true);
check('host not',isCrunchyrollHost('notcrunchyroll.com'),false);
check('host evil',isCrunchyrollHost('crunchyroll.com.evil.com'),false);
check('isPostUrl true',isPostUrl('https://www.crunchyroll.com/watch/ABC123/some-episode?utm_source=x'),true);
check('garbage',shortenCrunchyrollUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
