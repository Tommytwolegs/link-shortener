const path = require('path');
const {
  shortenGdriveUrl,
  needsShortening,
  isGdriveHost,
  isPostUrl,
} = require(path.join('..', 'src', 'gdrive.js'));

const CASES = [
  { name: 'doc usp=sharing stripped',
    input: 'https://docs.google.com/document/d/1AbCdEfGh/edit?usp=sharing',
    expected: 'https://docs.google.com/document/d/1AbCdEfGh/edit' },
  { name: 'ouid (sharer account id — privacy) stripped',
    input: 'https://docs.google.com/document/d/1AbCdEfGh/edit?usp=sharing&ouid=103547991503283362046&ts=68236a1d',
    expected: 'https://docs.google.com/document/d/1AbCdEfGh/edit' },
  { name: 'sheet gid PRESERVED',
    input: 'https://docs.google.com/spreadsheets/d/1XyZ/edit?usp=sharing&gid=1837542634',
    expected: 'https://docs.google.com/spreadsheets/d/1XyZ/edit?gid=1837542634' },
  { name: 'resourcekey PRESERVED (access breaks without it)',
    input: 'https://drive.google.com/file/d/0B1abc/view?usp=sharing&resourcekey=0-AbCdEf',
    expected: 'https://drive.google.com/file/d/0B1abc/view?resourcekey=0-AbCdEf' },
  { name: 'drive folder cleaned',
    input: 'https://drive.google.com/drive/folders/1QwErTy?usp=drive_link',
    expected: 'https://drive.google.com/drive/folders/1QwErTy' },
  { name: 'drive folder with account index cleaned',
    input: 'https://drive.google.com/drive/u/1/folders/1QwErTy?usp=sharing',
    expected: 'https://drive.google.com/drive/u/1/folders/1QwErTy' },
  { name: 'form viewform usp=sf_link stripped',
    input: 'https://docs.google.com/forms/d/e/1FAIpQL/viewform?usp=sf_link',
    expected: 'https://docs.google.com/forms/d/e/1FAIpQL/viewform' },
  { name: 'published sheet keeps gid+single+widget',
    input: 'https://docs.google.com/spreadsheets/d/e/2PACX/pubhtml?gid=0&single=true&widget=true&usp=embed',
    expected: 'https://docs.google.com/spreadsheets/d/e/2PACX/pubhtml?gid=0&single=true&widget=true' },
  { name: 'presentation cleaned',
    input: 'https://docs.google.com/presentation/d/1SlIdE/edit?usp=sharing&ts=1234',
    expected: 'https://docs.google.com/presentation/d/1SlIdE/edit' },
  { name: 'heading anchor preserved',
    input: 'https://docs.google.com/document/d/1AbC/edit?usp=sharing#heading=h.gjdgxs',
    expected: 'https://docs.google.com/document/d/1AbC/edit#heading=h.gjdgxs' },
  { name: 'gid hash preserved',
    input: 'https://docs.google.com/spreadsheets/d/1XyZ/edit?usp=sharing#gid=99',
    expected: 'https://docs.google.com/spreadsheets/d/1XyZ/edit#gid=99' },
  { name: 'bare /d/<id> no action segment cleaned',
    input: 'https://docs.google.com/document/d/1AbC?usp=docs_web',
    expected: 'https://docs.google.com/document/d/1AbC' },
  { name: 'already clean',
    input: 'https://docs.google.com/document/d/1AbC/edit',
    expected: 'https://docs.google.com/document/d/1AbC/edit',
    expectedNeeds: false },
  { name: 'drive home → null',
    input: 'https://drive.google.com/drive/my-drive',
    expected: null },
  { name: 'docs home → null',
    input: 'https://docs.google.com/document/u/0/',
    expected: null },
  { name: 'sub-path (revision history) → null',
    input: 'https://docs.google.com/document/d/1AbC/edit/revisions',
    expected: null },
  { name: 'other google host → null',
    input: 'https://mail.google.com/document/d/1AbC/edit',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenGdriveUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('host: docs.google.com', isGdriveHost('docs.google.com'), true);
check('host: drive.google.com', isGdriveHost('drive.google.com'), true);
check('host: mail.google.com', isGdriveHost('mail.google.com'), false);
check('host: www.google.com', isGdriveHost('www.google.com'), false);
check('host: lookalike', isGdriveHost('docs.google.com.evil.com'), false);
check('shorten on garbage', shortenGdriveUrl('not a url'), null);
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
