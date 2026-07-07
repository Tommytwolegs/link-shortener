const path = require('path');
const {
  shortenStackoverflowUrl,
  needsShortening,
  isStackoverflowHost,
  isPostUrl,
} = require(path.join('..', 'src', 'stackoverflow.js'));

const CASES = [

  { name: 'long question form already clean',
    input: 'https://stackoverflow.com/questions/11227809/why-is-processing-a-sorted-array-faster',
    expected: 'https://stackoverflow.com/questions/11227809/why-is-processing-a-sorted-array-faster',
    expectedNeeds: false },
  { name: 'share link: attribution user-id segment REMOVED',
    input: 'https://stackoverflow.com/q/11227809/1234567',
    expected: 'https://stackoverflow.com/q/11227809' },
  { name: 'answer share link: user-id segment REMOVED',
    input: 'https://stackoverflow.com/a/11227902/1234567',
    expected: 'https://stackoverflow.com/a/11227902' },
  { name: 'share link without user id stays',
    input: 'https://stackoverflow.com/q/11227809',
    expected: 'https://stackoverflow.com/q/11227809',
    expectedNeeds: false },
  { name: 'noredirect + so_medium stripped',
    input: 'https://stackoverflow.com/questions/11227809/why-sorted?noredirect=1&so_medium=link&so_source=share',
    expected: 'https://stackoverflow.com/questions/11227809/why-sorted' },
  { name: 'answer anchor hash preserved',
    input: 'https://stackoverflow.com/questions/11227809/why-sorted?r=Saves_AllUserSaves#11227902',
    expected: 'https://stackoverflow.com/questions/11227809/why-sorted#11227902' },
  { name: 'stackexchange site cleaned',
    input: 'https://softwareengineering.stackexchange.com/a/98765/4321',
    expected: 'https://softwareengineering.stackexchange.com/a/98765' },
  { name: 'superuser cleaned',
    input: 'https://superuser.com/q/1234/999',
    expected: 'https://superuser.com/q/1234' },
  { name: 'askubuntu cleaned',
    input: 'https://askubuntu.com/a/55555/1111',
    expected: 'https://askubuntu.com/a/55555' },
  { name: 'answer pagination PRESERVED (page 2 stays page 2)',
    input: 'https://stackoverflow.com/questions/11227809/why-sorted?page=2&noredirect=1',
    expected: 'https://stackoverflow.com/questions/11227809/why-sorted?page=2' },
  { name: 'answertab sort state PRESERVED',
    input: 'https://stackoverflow.com/questions/11227809/why-sorted?answertab=votes&so_medium=link#tab-top',
    expected: 'https://stackoverflow.com/questions/11227809/why-sorted?answertab=votes#tab-top' },
  { name: 'share links never carry page state (still fully stripped)',
    input: 'https://stackoverflow.com/q/11227809/1234567?page=9',
    expected: 'https://stackoverflow.com/q/11227809' },
  { name: 'question list → null',
    input: 'https://stackoverflow.com/questions?tab=newest',
    expected: null },
  { name: 'user profile → null',
    input: 'https://stackoverflow.com/users/22656/jon-skeet',
    expected: null },
  { name: 'tag page → null',
    input: 'https://stackoverflow.com/questions/tagged/javascript',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenStackoverflowUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isStackoverflowHost: stackoverflow.com', isStackoverflowHost('stackoverflow.com'), true);
check('isStackoverflowHost: x.stackexchange.com', isStackoverflowHost('softwareengineering.stackexchange.com'), true);
check('isStackoverflowHost: serverfault.com', isStackoverflowHost('serverfault.com'), true);
check('isStackoverflowHost: notso.com', isStackoverflowHost('notso.com'), false);
check('isPostUrl: share q', isPostUrl('https://stackoverflow.com/q/1/2'), true);
check('isPostUrl: tag', isPostUrl('https://stackoverflow.com/questions/tagged/js'), false);
check('shorten on garbage', shortenStackoverflowUrl('not a url'), null);
check('needs on garbage', needsShortening('not a url'), false);
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
