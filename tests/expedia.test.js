// Unit tests for src/expedia.js — runnable with plain Node, no dependencies.
//
// Usage: node tests/expedia.test.js

const path = require('path');
const {
  isExpediaHost,
  isHotelPage,
  shortPropertyUrl,
  shortUrlWithDates,
  shortUrlForBar,
  hasDates,
} = require(path.join('..', 'src', 'expedia.js'));

const LONG =
  'https://www.expedia.com/Bangkok-Hotels-Grand-President-Bangkok.h520975.Hotel-Information?chkin=2026-05-28&chkout=2026-05-29&x_pwa=1&rfrr=HSR&pwa_ts=1777075573473&referrerUrl=aHR0cHM6Ly93d3cuZXhwZWRpYS5jb20vSG90ZWwtU2VhcmNo&useRewards=false&rm1=a2&regionId=4934466&destination=Bangkok%2C+Thailand+%28BKK-Suvarnabhumi+Intl.%29&destType=MARKET&neighborhoodId=553248633976358764&latLong=13.693073%2C100.751137&sort=RECOMMENDED&top_dp=100&top_cur=USD&userIntent=&selectedRoomType=326803862&selectedRatePlan=402839852&categorySearch=any_option&searchId=3a6c6f56-4054-4f97-b96d-0eebb8d14a97';

const cases = [];

function t(name, fn) {
  cases.push({ name, fn });
}

function assertEq(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `${label || ''}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`,
    );
  }
}

// -- isExpediaHost --------------------------------------------------------

t('isExpediaHost: www.expedia.com', () =>
  assertEq(isExpediaHost('www.expedia.com'), true));
t('isExpediaHost: expedia.com', () =>
  assertEq(isExpediaHost('expedia.com'), true));
t('isExpediaHost: www.expedia.co.uk', () =>
  assertEq(isExpediaHost('www.expedia.co.uk'), true));
t('isExpediaHost: www.expedia.de', () =>
  assertEq(isExpediaHost('www.expedia.de'), true));
t('isExpediaHost: m.expedia.com', () =>
  assertEq(isExpediaHost('m.expedia.com'), true));
t('isExpediaHost: expedia-fake.com', () =>
  assertEq(isExpediaHost('expedia-fake.com'), false));
t('isExpediaHost: google.com', () =>
  assertEq(isExpediaHost('google.com'), false));
t('isExpediaHost: empty', () => assertEq(isExpediaHost(''), false));

// -- isHotelPage ----------------------------------------------------------

t('isHotelPage: full-long URL', () => assertEq(isHotelPage(LONG), true));
t('isHotelPage: bare hotel URL', () =>
  assertEq(
    isHotelPage(
      'https://www.expedia.com/Bangkok-Hotels-Grand-President-Bangkok.h520975.Hotel-Information',
    ),
    true,
  ));
t('isHotelPage: regional TLD', () =>
  assertEq(
    isHotelPage(
      'https://www.expedia.co.uk/London-Hotels-Some-Place.h12345.Hotel-Information',
    ),
    true,
  ));
t('isHotelPage: search results page', () =>
  assertEq(
    isHotelPage('https://www.expedia.com/Hotel-Search?destination=Bangkok'),
    false,
  ));
t('isHotelPage: homepage', () =>
  assertEq(isHotelPage('https://www.expedia.com/'), false));
t('isHotelPage: non-Expedia site with same path shape', () =>
  assertEq(
    isHotelPage('https://other.com/Foo-Hotels-Bar.h12345.Hotel-Information'),
    false,
  ));
t('isHotelPage: missing hotel ID', () =>
  assertEq(
    isHotelPage('https://www.expedia.com/Bangkok-Hotels-Foo.Hotel-Information'),
    false,
  ));
t('isHotelPage: missing Hotel-Information suffix', () =>
  assertEq(
    isHotelPage('https://www.expedia.com/Bangkok-Hotels-Foo.h520975'),
    false,
  ));

// -- shortPropertyUrl -----------------------------------------------------

t('shortPropertyUrl: strips all query params', () =>
  assertEq(
    shortPropertyUrl(LONG),
    'https://www.expedia.com/Bangkok-Hotels-Grand-President-Bangkok.h520975.Hotel-Information',
  ));
t('shortPropertyUrl: strips hash', () =>
  assertEq(
    shortPropertyUrl(
      'https://www.expedia.com/Bangkok-Hotels-Foo.h12345.Hotel-Information#rooms',
    ),
    'https://www.expedia.com/Bangkok-Hotels-Foo.h12345.Hotel-Information',
  ));
t('shortPropertyUrl: non-hotel page returns null', () =>
  assertEq(shortPropertyUrl('https://www.expedia.com/'), null));
t('shortPropertyUrl: non-Expedia host returns null', () =>
  assertEq(
    shortPropertyUrl(
      'https://www.google.com/Foo-Hotels-Bar.h12345.Hotel-Information',
    ),
    null,
  ));
t('shortPropertyUrl: garbage returns null', () =>
  assertEq(shortPropertyUrl('not a url'), null));

// -- shortUrlWithDates ----------------------------------------------------

t('shortUrlWithDates: full-long URL preserves chkin+chkout only', () =>
  assertEq(
    shortUrlWithDates(LONG),
    'https://www.expedia.com/Bangkok-Hotels-Grand-President-Bangkok.h520975.Hotel-Information?chkin=2026-05-28&chkout=2026-05-29',
  ));
t('shortUrlWithDates: multi-night stay', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.expedia.com/Foo.h1.Hotel-Information?chkin=2026-07-15&chkout=2026-07-22&rm1=a4',
    ),
    'https://www.expedia.com/Foo.h1.Hotel-Information?chkin=2026-07-15&chkout=2026-07-22',
  ));
t('shortUrlWithDates: missing chkin returns null', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.expedia.com/Foo.h1.Hotel-Information?chkout=2026-01-02',
    ),
    null,
  ));
t('shortUrlWithDates: missing chkout returns null', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.expedia.com/Foo.h1.Hotel-Information?chkin=2026-01-01',
    ),
    null,
  ));
t('shortUrlWithDates: malformed chkin returns null', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.expedia.com/Foo.h1.Hotel-Information?chkin=tomorrow&chkout=2026-01-02',
    ),
    null,
  ));
t('shortUrlWithDates: chkout earlier than chkin returns null', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.expedia.com/Foo.h1.Hotel-Information?chkin=2026-01-05&chkout=2026-01-02',
    ),
    null,
  ));
t('shortUrlWithDates: chkout same as chkin returns null', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.expedia.com/Foo.h1.Hotel-Information?chkin=2026-01-05&chkout=2026-01-05',
    ),
    null,
  ));
t('shortUrlWithDates: non-hotel page returns null', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.expedia.com/Hotel-Search?chkin=2026-01-01&chkout=2026-01-02',
    ),
    null,
  ));

// -- shortUrlForBar -------------------------------------------------------

t('shortUrlForBar: full-long URL keeps dates + rm1', () =>
  assertEq(
    shortUrlForBar(LONG),
    'https://www.expedia.com/Bangkok-Hotels-Grand-President-Bangkok.h520975.Hotel-Information?chkin=2026-05-28&chkout=2026-05-29&rm1=a2',
  ));
t('shortUrlForBar: bare hotel URL stays bare', () =>
  assertEq(
    shortUrlForBar(
      'https://www.expedia.com/Foo.h1.Hotel-Information',
    ),
    'https://www.expedia.com/Foo.h1.Hotel-Information',
  ));
t('shortUrlForBar: idempotent on already-short URL', () => {
  const short =
    'https://www.expedia.com/Foo.h1.Hotel-Information?chkin=2026-05-28&chkout=2026-05-29&rm1=a2';
  assertEq(shortUrlForBar(short), short);
});
t('shortUrlForBar: drops everything except dates and rmN', () =>
  assertEq(
    shortUrlForBar(
      'https://www.expedia.com/Foo.h1.Hotel-Information?x_pwa=1&rfrr=HSR&useRewards=false&rm1=a2&regionId=4934466',
    ),
    'https://www.expedia.com/Foo.h1.Hotel-Information?rm1=a2',
  ));
t('shortUrlForBar: preserves multi-room occupancy', () =>
  assertEq(
    shortUrlForBar(
      'https://www.expedia.com/Foo.h1.Hotel-Information?chkin=2026-05-28&chkout=2026-05-29&rm1=a2&rm2=a2,c5_8',
    ),
    'https://www.expedia.com/Foo.h1.Hotel-Information?chkin=2026-05-28&chkout=2026-05-29&rm1=a2&rm2=a2%2Cc5_8',
  ));
t('shortUrlForBar: drops empty rm and date params', () =>
  assertEq(
    shortUrlForBar(
      'https://www.expedia.com/Foo.h1.Hotel-Information?chkin=&chkout=2026-05-29&rm1=a2&rm2=',
    ),
    'https://www.expedia.com/Foo.h1.Hotel-Information?chkout=2026-05-29&rm1=a2',
  ));
t('shortUrlForBar: non-hotel page returns null', () =>
  assertEq(
    shortUrlForBar(
      'https://www.expedia.com/Hotel-Search?chkin=2026-01-01&chkout=2026-01-02',
    ),
    null,
  ));
t('shortUrlForBar: non-Expedia host returns null', () =>
  assertEq(
    shortUrlForBar(
      'https://www.example.com/Foo.h1.Hotel-Information?rm1=a2',
    ),
    null,
  ));
t('shortUrlForBar: garbage returns null', () =>
  assertEq(shortUrlForBar('not a url'), null));

// -- hasDates -------------------------------------------------------------

t('hasDates: true when dates present', () => assertEq(hasDates(LONG), true));
t('hasDates: false when no dates', () =>
  assertEq(
    hasDates('https://www.expedia.com/Foo.h1.Hotel-Information'),
    false,
  ));

// -- runner ---------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures = [];

for (const c of cases) {
  try {
    c.fn();
    passed++;
  } catch (e) {
    failed++;
    failures.push({ name: c.name, message: e.message });
  }
}

console.log(`\n${passed} passed, ${failed} failed (${passed + failed} total)`);
if (failed > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log('  - ' + f.name);
    console.log('    ' + f.message.replace(/\n/g, '\n    '));
  }
  process.exit(1);
}
