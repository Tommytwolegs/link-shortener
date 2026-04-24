// Unit tests for src/asin.js — runnable with plain Node, no dependencies.
//
// Usage: node tests/asin.test.js

const path = require('path');
const { shortenAmazonUrl, needsShortening, extractAsin, isAmazonHost } =
  require(path.join('..', 'src', 'asin.js'));

const CASES = [
  { name: 'US: slug + /dp/ASIN with ref and query params',
    input: 'https://www.amazon.com/Some-Product-Title/dp/B08N5WRWNW/ref=sr_1_3?keywords=foo&qid=1234&sr=8-3',
    expected: 'https://www.amazon.com/dp/B08N5WRWNW' },
  { name: 'US: bare /dp/ASIN with affiliate tag',
    input: 'https://www.amazon.com/dp/B08N5WRWNW?tag=somebody-20',
    expected: 'https://www.amazon.com/dp/B08N5WRWNW' },
  { name: 'US: already canonical',
    input: 'https://www.amazon.com/dp/B08N5WRWNW',
    expected: 'https://www.amazon.com/dp/B08N5WRWNW',
    expectedNeeds: false },
  { name: 'US: trailing slash',
    input: 'https://www.amazon.com/dp/B08N5WRWNW/',
    expected: 'https://www.amazon.com/dp/B08N5WRWNW' },
  { name: 'US: /gp/product/ASIN',
    input: 'https://www.amazon.com/gp/product/B07XJ8C8F5/ref=ppx_yo_dt_b_asin_title_o00',
    expected: 'https://www.amazon.com/dp/B07XJ8C8F5' },
  { name: 'US: /gp/product/glance/ASIN',
    input: 'https://www.amazon.com/gp/product/glance/B07XJ8C8F5',
    expected: 'https://www.amazon.com/dp/B07XJ8C8F5' },
  { name: 'US: /gp/aw/d/ASIN',
    input: 'https://www.amazon.com/gp/aw/d/B0BSHF7WHW?some=garbage',
    expected: 'https://www.amazon.com/dp/B0BSHF7WHW' },
  { name: 'US: /gp/aw/reviews/ASIN',
    input: 'https://www.amazon.com/gp/aw/reviews/B0BSHF7WHW',
    expected: 'https://www.amazon.com/dp/B0BSHF7WHW' },
  { name: 'US: /product-reviews/ASIN',
    input: 'https://www.amazon.com/Some-Product/product-reviews/B07XJ8C8F5/ref=cm_cr_arp_d_paging_btm_2?pageNumber=2',
    expected: 'https://www.amazon.com/dp/B07XJ8C8F5' },
  { name: 'US: /gp/offer-listing/ASIN',
    input: 'https://www.amazon.com/gp/offer-listing/B07XJ8C8F5/ref=dp_olp_NEW_mbc',
    expected: 'https://www.amazon.com/dp/B07XJ8C8F5' },
  { name: 'US: legacy /exec/obidos/ASIN/',
    input: 'https://www.amazon.com/exec/obidos/ASIN/0451524934/ref=foo',
    expected: 'https://www.amazon.com/dp/0451524934' },
  { name: 'US: legacy /exec/obidos/tg/detail/-/',
    input: 'https://www.amazon.com/exec/obidos/tg/detail/-/0451524934',
    expected: 'https://www.amazon.com/dp/0451524934' },
  { name: 'US: 10-digit numeric ASIN (book)',
    input: 'https://www.amazon.com/Hobbit-J-R-R-Tolkien/dp/0547928227',
    expected: 'https://www.amazon.com/dp/0547928227' },
  { name: 'JP: international /-/en/dp/ASIN',
    input: 'https://www.amazon.co.jp/-/en/dp/B0BSHF7WHW/ref=foo',
    expected: 'https://www.amazon.co.jp/dp/B0BSHF7WHW' },
  { name: 'UK: .co.uk preserved',
    input: 'https://www.amazon.co.uk/Some-Title/dp/B08N5WRWNW/ref=foo',
    expected: 'https://www.amazon.co.uk/dp/B08N5WRWNW' },
  { name: 'DE: .de preserved',
    input: 'https://www.amazon.de/Some-Title/dp/B08N5WRWNW',
    expected: 'https://www.amazon.de/dp/B08N5WRWNW' },
  { name: 'JP: .co.jp preserved',
    input: 'https://www.amazon.co.jp/dp/B08N5WRWNW/ref=foo',
    expected: 'https://www.amazon.co.jp/dp/B08N5WRWNW' },
  { name: 'AU: .com.au preserved',
    input: 'https://www.amazon.com.au/dp/B08N5WRWNW',
    expected: 'https://www.amazon.com.au/dp/B08N5WRWNW' },
  { name: 'BR: .com.br preserved',
    input: 'https://www.amazon.com.br/dp/B08N5WRWNW',
    expected: 'https://www.amazon.com.br/dp/B08N5WRWNW' },
  { name: 'TR: .com.tr preserved',
    input: 'https://www.amazon.com.tr/dp/B08N5WRWNW',
    expected: 'https://www.amazon.com.tr/dp/B08N5WRWNW' },
  { name: 'US: smile. subdomain preserved',
    input: 'https://smile.amazon.com/dp/B08N5WRWNW/ref=foo',
    expected: 'https://smile.amazon.com/dp/B08N5WRWNW' },
  { name: 'US: m. subdomain preserved',
    input: 'https://m.amazon.com/Some-Slug/dp/B08N5WRWNW',
    expected: 'https://m.amazon.com/dp/B08N5WRWNW' },
  { name: 'Non-Amazon URL returns null',
    input: 'https://www.google.com/search?q=B08N5WRWNW',
    expected: null },
  { name: 'Amazon homepage returns null',
    input: 'https://www.amazon.com/',
    expected: null },
  { name: 'Amazon search returns null',
    input: 'https://www.amazon.com/s?k=hello&ref=nb_sb_noss',
    expected: null },
  { name: 'Amazon cart returns null',
    input: 'https://www.amazon.com/gp/cart/view.html',
    expected: null },
  { name: 'amazon-aws.com is rejected',
    input: 'https://amazon-aws.com/dp/B08N5WRWNW',
    expected: null },
  { name: 'aws.amazon.com has no /dp/ paths',
    input: 'https://aws.amazon.com/some/path',
    expected: null },
  { name: 'US: /dp/ASIN with #hash strips the hash',
    input: 'https://www.amazon.com/Slug/dp/B08N5WRWNW#customerReviews',
    expected: 'https://www.amazon.com/dp/B08N5WRWNW' },
  { name: 'Lowercase ASIN intentionally NOT matched',
    input: 'https://www.amazon.com/dp/b08n5wrwnw',
    expected: null },
  { name: 'Sponsored: /sspa/click with url= param',
    input: 'https://www.amazon.com/sspa/click?ie=UTF8&spc=MTo5MjkzMzg5ODA2MDQyOTE&url=%2FWordsworth-Black-Cartridges-Converter-Calligraphy%2Fdp%2FB0B57CV483%3Fpsc%3D1%26pd_rd_w%3D8Wtcb',
    expected: 'https://www.amazon.com/dp/B0B57CV483' },
  { name: 'Sponsored: /sspa/click with bare /dp/ASIN in url= param',
    input: 'https://www.amazon.com/sspa/click?ie=UTF8&url=%2Fdp%2FB08N5WRWNW',
    expected: 'https://www.amazon.com/dp/B08N5WRWNW' },
  { name: 'Redirect: /gp/slredirect/picassoRedirect.html',
    input: 'https://www.amazon.com/gp/slredirect/picassoRedirect.html?ie=UTF8&adId=A123&url=%2FSome-Title%2Fdp%2FB07XJ8C8F5%2Fref%3Dfoo',
    expected: 'https://www.amazon.com/dp/B07XJ8C8F5' },
  { name: 'Redirect: /gp/redirect.html with /gp/product/ inside url param',
    input: 'https://www.amazon.com/gp/redirect.html?url=%2Fgp%2Fproduct%2FB08N5WRWNW%3Fref%3Dfoo',
    expected: 'https://www.amazon.com/dp/B08N5WRWNW' },
  { name: 'DE: /sspa/click preserves .de storefront',
    input: 'https://www.amazon.de/sspa/click?url=%2FSlug%2Fdp%2FB0B57CV483',
    expected: 'https://www.amazon.de/dp/B0B57CV483' },
  { name: 'Wrapper: url param present but not an Amazon product → null',
    input: 'https://www.amazon.com/sspa/click?url=%2Fs%3Fk%3Dhello',
    expected: null },
  { name: 'Wrapper: no url param → null',
    input: 'https://www.amazon.com/sspa/click?ie=UTF8&spc=abc',
    expected: null },
];

let passed = 0;
let failed = 0;
const failures = [];

function check(label, actual, expected) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    failures.push({ label, actual, expected });
  }
}

for (const c of CASES) {
  const got = shortenAmazonUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) {
    expectedNeeds = c.expectedNeeds;
  } else if (c.expected === null) {
    expectedNeeds = false;
  } else {
    expectedNeeds = c.input !== c.expected;
  }
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}

check('isAmazonHost: www.amazon.com', isAmazonHost('www.amazon.com'), true);
check('isAmazonHost: smile.amazon.com', isAmazonHost('smile.amazon.com'), true);
check('isAmazonHost: amazon.de', isAmazonHost('amazon.de'), true);
check('isAmazonHost: amazon-aws.com', isAmazonHost('amazon-aws.com'), false);
check('isAmazonHost: aws.amazon.com', isAmazonHost('aws.amazon.com'), true);
check('extractAsin: /dp/B08N5WRWNW', extractAsin('/dp/B08N5WRWNW'), 'B08N5WRWNW');
check('extractAsin: /', extractAsin('/'), null);
check('extractAsin: wrapper path + search',
  extractAsin('/sspa/click', '?url=%2Fdp%2FB08N5WRWNW'),
  'B08N5WRWNW');

check('shorten on garbage string', shortenAmazonUrl('not a url'), null);
check('needs on garbage string', needsShortening('not a url'), false);

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
