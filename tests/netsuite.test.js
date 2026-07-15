const path = require('path');
const mod = require(path.join('..', 'src', 'netsuite.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
function run(cases) {
  for (const c of cases) {
    check('shorten - ' + c.name, mod.shortenNetsuiteUrl(c.input), c.expected);
    let expectedNeeds;
    if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
    else if (c.expected === null) expectedNeeds = false;
    else expectedNeeds = c.input !== c.expected;
    check('needs   - ' + c.name, mod.needsShortening(c.input), expectedNeeds);
  }
}

run([
  { name: 'the original specimen: sia* + record id',
    input: 'https://3356652.app.netsuite.com/app/common/item/item.nl?id=86757&siaT=1783620245509&siaWhc=%2Fapp%2Fcommon%2Fsearch&siaPs=0&siaPfx=&siaQ=23005MAL&siaNv=gs',
    expected: 'https://3356652.app.netsuite.com/app/common/item/item.nl?id=86757' },
  { name: 'whence breadcrumb stripped, e=T edit mode kept',
    input: 'https://3356652.app.netsuite.com/app/common/item/item.nl?id=86757&e=T&whence=%2Fapp%2Fcenter%2Fcard.nl',
    expected: 'https://3356652.app.netsuite.com/app/common/item/item.nl?id=86757&e=T' },
  { name: 'transaction with script/deploy params untouched',
    input: 'https://123.app.netsuite.com/app/site/hosting/scriptlet.nl?script=42&deploy=1&compid=123',
    expected: 'https://123.app.netsuite.com/app/site/hosting/scriptlet.nl?script=42&deploy=1&compid=123',
    expectedNeeds: false },
  { name: 'already clean record',
    input: 'https://3356652.app.netsuite.com/app/common/item/item.nl?id=86757',
    expected: 'https://3356652.app.netsuite.com/app/common/item/item.nl?id=86757',
    expectedNeeds: false },
  { name: 'system.netsuite.com login OUT of scope',
    input: 'https://system.netsuite.com/pages/customerlogin.jsp?country=US&whence=x',
    expected: null },
]);
check('host: numbered account', mod.isNetsuiteHost('3356652.app.netsuite.com'), true);
check('host: bare app', mod.isNetsuiteHost('app.netsuite.com'), true);
check('host: system host rejected', mod.isNetsuiteHost('system.netsuite.com'), false);
check('host: lookalike', mod.isNetsuiteHost('app.netsuite.com.evil.example'), false);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log('  - ' + f.label);
    console.log('      expected: ' + JSON.stringify(f.expected));
    console.log('      actual:   ' + JSON.stringify(f.actual));
  }
  process.exit(1);
}
