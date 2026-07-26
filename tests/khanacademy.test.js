// Unit tests for src/khanacademy.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenKhanacademyUrl, needsShortening, isKhanacademyHost, isPostUrl } = require(path.join('..', 'src', 'khanacademy.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86?utm_source=share&fbclid=z', expected: 'https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86' },
  { name: 'already clean', input: 'https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86', expected: 'https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86?utm_source=x#c', expected: 'https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86#c' },
  { name: 'lookalike -> null', input: 'https://notkhanacademy.org/math/algebra/x2f8bb11595b61c86?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://khanacademy.org.evil.com/math/algebra/x2f8bb11595b61c86?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenKhanacademyUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isKhanacademyHost('www.khanacademy.org'),true);
check('host not',isKhanacademyHost('notkhanacademy.org'),false);
check('host evil',isKhanacademyHost('khanacademy.org.evil.com'),false);
check('isPostUrl true',isPostUrl('https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86?utm_source=x'),true);
check('garbage',shortenKhanacademyUrl('not a url'),null);
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
