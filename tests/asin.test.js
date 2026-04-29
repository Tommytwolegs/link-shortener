// Unit tests for src/asin.js — runnable with plain Node, no dependencies.
//
// Usage: node tests/asin.test.js

const path = require('path');
const {
  shortenAmazonUrl,
  needsShortening,
  extractAsin,
  isAmazonHost,
  extractTitleSlug,
  extractSlug,
  slugifyTitle,
} = require(path.join('..', 'src', 'asin.js'));

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

// ---- Title-slug feature ---------------------------------------------------

// extractTitleSlug
check('slug: /Foo-Bar/dp/ASIN',
  extractTitleSlug('/Acme-Smoked-Fish-Whitefish-Portion/dp/B0D47V1Q5B'),
  'Acme-Smoked-Fish-Whitefish-Portion');
check('slug: /Foo/dp/ASIN with ref tail',
  extractTitleSlug('/Foo-Bar/dp/B08N5WRWNW/ref=sr_1_3'),
  'Foo-Bar');
check('slug: /Foo/gp/product/ASIN',
  extractTitleSlug('/Foo-Bar/gp/product/B07XJ8C8F5'),
  'Foo-Bar');
check('slug: bare /dp/ASIN -> null',
  extractTitleSlug('/dp/B08N5WRWNW'),
  null);
check('slug: /gp/product/ASIN -> null',
  extractTitleSlug('/gp/product/B08N5WRWNW'),
  null);
check('slug: blocklisted segment -> null',
  extractTitleSlug('/dp/dp/B08N5WRWNW'),
  null);
check('slug: empty path -> null',
  extractTitleSlug('/'),
  null);

// extractSlug — wrapper-aware
check('extractSlug wrapper: sspa/click with encoded slug',
  extractSlug('/sspa/click', '?url=%2FAcme-Foo-Bar%2Fdp%2FB0D47V1Q5B'),
  'Acme-Foo-Bar');
check('extractSlug wrapper: no slug in wrapped path',
  extractSlug('/sspa/click', '?url=%2Fdp%2FB0D47V1Q5B'),
  null);
check('extractSlug direct path beats search',
  extractSlug('/Direct-Slug/dp/B0D47V1Q5B', '?url=%2FOther%2Fdp%2FB0D47V1Q5B'),
  'Direct-Slug');

// slugifyTitle
check('slugify: simple title',
  slugifyTitle('Acme Smoked Fish Whitefish Portion'),
  'Acme-Smoked-Fish-Whitefish-Portion');
check('slugify: punctuation stripped',
  slugifyTitle('Foo, Bar & Baz! (4-Pack)'),
  'Foo-Bar-and-Baz-4-Pack');
check('slugify: trademark glyphs stripped',
  slugifyTitle('Bose® QuietComfort™ Headphones'),
  'Bose-QuietComfort-Headphones');
check('slugify: trims Amazon.com suffix from document.title',
  slugifyTitle('Acme Smoked Fish Whitefish Portion : Amazon.com'),
  'Acme-Smoked-Fish-Whitefish-Portion');
check('slugify: trims Amazon.de prefix',
  slugifyTitle('Amazon.de: Some Long German Product Name'),
  'Some-Long-German-Product-Name');
check('slugify: empty/whitespace -> null',
  slugifyTitle('   '),
  null);
check('slugify: caps long titles at 80 chars',
  slugifyTitle('A '.repeat(100).trim()).length <= 80,
  true);
check('slugify: returns null on null input',
  slugifyTitle(null),
  null);

// shortenAmazonUrl with slug option
check('shorten with slug: bare /dp/ASIN gets slug prepended',
  shortenAmazonUrl('https://www.amazon.com/dp/B0D47V1Q5B', { slug: 'Acme-Foo' }),
  'https://www.amazon.com/Acme-Foo/dp/B0D47V1Q5B');
check('shorten with slug: messy URL gets clean slug form',
  shortenAmazonUrl('https://www.amazon.com/Old-Slug/dp/B0D47V1Q5B/ref=sr_1?keywords=x', { slug: 'New-Slug' }),
  'https://www.amazon.com/New-Slug/dp/B0D47V1Q5B');
check('shorten with slug: regional TLD preserved',
  shortenAmazonUrl('https://www.amazon.de/old/dp/B0D47V1Q5B', { slug: 'Foo-Bar' }),
  'https://www.amazon.de/Foo-Bar/dp/B0D47V1Q5B');
check('shorten with slug: gp/product input',
  shortenAmazonUrl('https://www.amazon.com/gp/product/B07XJ8C8F5', { slug: 'My-Title' }),
  'https://www.amazon.com/My-Title/dp/B07XJ8C8F5');
check('shorten with slug:null falls back to bare form',
  shortenAmazonUrl('https://www.amazon.com/dp/B0D47V1Q5B', { slug: null }),
  'https://www.amazon.com/dp/B0D47V1Q5B');

// needsShortening with slug option
check('needs with slug: already in /<slug>/dp/ASIN form -> false',
  needsShortening('https://www.amazon.com/Foo-Bar/dp/B0D47V1Q5B', { slug: 'Foo-Bar' }),
  false);
check('needs with slug: bare /dp/ASIN, slug requested -> true',
  needsShortening('https://www.amazon.com/dp/B0D47V1Q5B', { slug: 'Foo-Bar' }),
  true);
check('needs with slug: different slug than current -> true',
  needsShortening('https://www.amazon.com/Old/dp/B0D47V1Q5B', { slug: 'New' }),
  true);
check('needs with slug: trailing query -> true',
  needsShortening('https://www.amazon.com/Foo/dp/B0D47V1Q5B?tag=x', { slug: 'Foo' }),
  true);
check('needs without slug option: in /<slug>/dp/ASIN form -> still true',
  needsShortening('https://www.amazon.com/Foo/dp/B0D47V1Q5B'),
  true);

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
