const path = require('path');
const {
  shortenPrimevideoUrl,
  needsShortening,
  isPrimevideoHost,
  isPostUrl,
} = require(path.join('..', 'src', 'primevideo.js'));

const CASES = [
  // Canonical
  { name: 'detail page already clean',
    input: 'https://www.primevideo.com/detail/0TJ0J7BJTQ1BR9EF8WFYX5X0GJ/',
    expected: 'https://www.primevideo.com/detail/0TJ0J7BJTQ1BR9EF8WFYX5X0GJ/',
    expectedNeeds: false },

  // The /ref= path suffix (amazon.js-style)
  { name: 'ref path suffix stripped',
    input: 'https://www.primevideo.com/detail/0TJ0J7BJTQ1BR9EF8WFYX5X0GJ/ref=atv_hm_hom_c_8vbBJc_brws_2_1',
    expected: 'https://www.primevideo.com/detail/0TJ0J7BJTQ1BR9EF8WFYX5X0GJ' },
  { name: 'ref path + ref_ query together',
    input: 'https://www.primevideo.com/detail/ABC123/ref=atv_dp_share_cp?ref_=atv_dp_share_seas',
    expected: 'https://www.primevideo.com/detail/ABC123' },

  // Query junk families
  { name: 'pf_rd_* / pd_rd_* families stripped',
    input: 'https://www.primevideo.com/detail/ABC123/?pf_rd_r=XYZ&pf_rd_p=123abc&pd_rd_wg=AbCd&pd_rd_r=e1f2',
    expected: 'https://www.primevideo.com/detail/ABC123/' },
  { name: 'associates junk stripped',
    input: 'https://www.primevideo.com/detail/ABC123/?tag=blog-20&linkCode=ll2&ascsubtag=x1',
    expected: 'https://www.primevideo.com/detail/ABC123/' },
  { name: 'ad-click ids + utm stripped',
    input: 'https://www.primevideo.com/storefront?gclid=a&dclid=b&utm_campaign=promo',
    expected: 'https://www.primevideo.com/storefront' },

  // Functional params survive
  { name: 'autoplay + t resume timestamp survive',
    input: 'https://www.primevideo.com/detail/ABC123/?autoplay=1&t=1520&ref_=atv_cf_strg_wb',
    expected: 'https://www.primevideo.com/detail/ABC123/?autoplay=1&t=1520' },

  // Hash
  { name: 'hash preserved',
    input: 'https://www.primevideo.com/detail/ABC123/ref=atv_hm#about',
    expected: 'https://www.primevideo.com/detail/ABC123#about' },

  // Non-primevideo (amazon.com itself belongs to amazon.js)
  { name: 'amazon.com -> null (different module)',
    input: 'https://www.amazon.com/gp/video/detail/ABC123?ref_=atv',
    expected: null },
  { name: 'lookalike -> null',
    input: 'https://primevideo.example.com/detail/ABC?ref_=x',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenPrimevideoUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isPrimevideoHost: primevideo.com', isPrimevideoHost('www.primevideo.com'), true);
check('isPrimevideoHost: amazon.com rejected', isPrimevideoHost('www.amazon.com'), false);
check('isPostUrl: ref path', isPostUrl('https://www.primevideo.com/detail/A/ref=atv'), true);
check('isPostUrl: clean', isPostUrl('https://www.primevideo.com/detail/A/'), false);
check('shorten on garbage', shortenPrimevideoUrl('not a url'), null);
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
