// Unit tests for src/skillshare.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenSkillshareUrl, needsShortening, isSkillshareHost, isPostUrl } = require(path.join('..', 'src', 'skillshare.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://www.skillshare.com/classes/Some-Class/123456789?utm_source=share&fbclid=z', expected: 'https://www.skillshare.com/classes/Some-Class/123456789' },
  { name: 'already clean', input: 'https://www.skillshare.com/classes/Some-Class/123456789', expected: 'https://www.skillshare.com/classes/Some-Class/123456789', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://www.skillshare.com/classes/Some-Class/123456789?utm_source=x#c', expected: 'https://www.skillshare.com/classes/Some-Class/123456789#c' },
  { name: 'lookalike -> null', input: 'https://notskillshare.com/classes/Some-Class/123456789?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://skillshare.com.evil.com/classes/Some-Class/123456789?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenSkillshareUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isSkillshareHost('www.skillshare.com'),true);
check('host not',isSkillshareHost('notskillshare.com'),false);
check('host evil',isSkillshareHost('skillshare.com.evil.com'),false);
check('isPostUrl true',isPostUrl('https://www.skillshare.com/classes/Some-Class/123456789?utm_source=x'),true);
check('garbage',shortenSkillshareUrl('not a url'),null);
check('via stripped', shortenSkillshareUrl('https://www.skillshare.com/classes/x/1?via=teacher&utm_medium=z'), 'https://www.skillshare.com/classes/x/1');
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
