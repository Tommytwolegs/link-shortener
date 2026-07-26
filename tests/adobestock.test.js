// Unit tests for src/adobestock.js — runnable with plain Node, no dependencies.
const path = require('path');
const { shortenAdobestockUrl, needsShortening, isAdobestockHost, isPostUrl } = require(path.join('..', 'src', 'adobestock.js'));
const CASES = [
  { name: 'path kept, utm stripped', input: 'https://stock.adobe.com/images/some-slug/123456789?utm_source=share&fbclid=z', expected: 'https://stock.adobe.com/images/some-slug/123456789' },
  { name: 'already clean', input: 'https://stock.adobe.com/images/some-slug/123456789', expected: 'https://stock.adobe.com/images/some-slug/123456789', expectedNeeds: false },
  { name: 'hash preserved', input: 'https://stock.adobe.com/images/some-slug/123456789?utm_source=x#c', expected: 'https://stock.adobe.com/images/some-slug/123456789#c' },
  { name: 'lookalike -> null', input: 'https://notstock.adobe.com/images/some-slug/123456789?utm_source=x', expected: null },
  { name: 'evil suffix -> null', input: 'https://stock.adobe.com.evil.com/images/some-slug/123456789?utm_source=x', expected: null },
];
let passed=0,failed=0;const failures=[];
function check(l,a,e){if(a===e)passed++;else{failed++;failures.push({l,a,e});}}
for(const c of CASES){check('shorten - '+c.name,shortenAdobestockUrl(c.input),c.expected);let en;if('expectedNeeds' in c)en=c.expectedNeeds;else if(c.expected===null)en=false;else en=c.input!==c.expected;check('needs - '+c.name,needsShortening(c.input),en);}
check('host ok',isAdobestockHost('stock.adobe.com'),true);
check('host not',isAdobestockHost('notstock.adobe.com'),false);
check('host evil',isAdobestockHost('stock.adobe.com.evil.com'),false);
check('isPostUrl true',isPostUrl('https://stock.adobe.com/images/some-slug/123456789?utm_source=x'),true);
check('garbage',shortenAdobestockUrl('not a url'),null);
check('prev_url stripped', shortenAdobestockUrl('https://stock.adobe.com/images/x/1?prev_url=detail&utm_source=y'), 'https://stock.adobe.com/images/x/1');
console.log('\n'+passed+' passed, '+failed+' failed ('+(passed+failed)+' total)');
if(failed>0){for(const f of failures)console.log('FAIL: '+f.l+'\n  exp: '+f.e+'\n  got: '+f.a);process.exit(1);}
