// Unit tests for src/agoda.js — runnable with plain Node, no dependencies.
//
// Usage: node tests/agoda.test.js

const path = require('path');
const {
  isAgodaHost,
  isHotelPage,
  shortPropertyUrl,
  shortUrlWithDates,
  shortUrlForBar,
  hasDates,
} = require(path.join('..', 'src', 'agoda.js'));

const LONG = 'https://www.agoda.com/near-don-mueang-hotel/hotel/bangkok-th.html?countryId=106&finalPriceView=1&isShowMobileAppPrice=false&cid=-1&numberOfBedrooms=&familyMode=false&adults=2&children=0&rooms=1&maxRooms=0&checkIn=2026-05-28&isCalendarCallout=false&childAges=&numberOfGuest=0&missingChildAges=false&travellerType=1&showReviewSubmissionEntry=false&currencyCode=USD&isFreeOccSearch=false&flightSearchCriteria=%5Bobject%20Object%5D&los=1&searchrequestid=24d7109b';

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

// -- isAgodaHost ----------------------------------------------------------

t('isAgodaHost: www.agoda.com', () =>
  assertEq(isAgodaHost('www.agoda.com'), true));
t('isAgodaHost: agoda.com', () => assertEq(isAgodaHost('agoda.com'), true));
t('isAgodaHost: m.agoda.com', () => assertEq(isAgodaHost('m.agoda.com'), true));
t('isAgodaHost: agoda-fake.com', () =>
  assertEq(isAgodaHost('agoda-fake.com'), false));
t('isAgodaHost: google.com', () => assertEq(isAgodaHost('google.com'), false));
t('isAgodaHost: empty', () => assertEq(isAgodaHost(''), false));

// -- isHotelPage ----------------------------------------------------------

t('isHotelPage: full-long URL', () => assertEq(isHotelPage(LONG), true));
t('isHotelPage: bare hotel URL', () =>
  assertEq(
    isHotelPage('https://www.agoda.com/near-don-mueang-hotel/hotel/bangkok-th.html'),
    true,
  ));
t('isHotelPage: locale-prefixed hotel URL', () =>
  assertEq(
    isHotelPage(
      'https://www.agoda.com/en-us/near-don-mueang-hotel/hotel/bangkok-th.html',
    ),
    true,
  ));
t('isHotelPage: search results page', () =>
  assertEq(isHotelPage('https://www.agoda.com/search?city=1234'), false));
t('isHotelPage: homepage', () =>
  assertEq(isHotelPage('https://www.agoda.com/'), false));
t('isHotelPage: non-Agoda site with /hotel/x.html', () =>
  assertEq(isHotelPage('https://other.com/foo/hotel/bar.html'), false));
t('isHotelPage: Agoda path without .html', () =>
  assertEq(isHotelPage('https://www.agoda.com/hotel/some-thing'), false));

// -- shortPropertyUrl -----------------------------------------------------

t('shortPropertyUrl: strips all query params', () =>
  assertEq(
    shortPropertyUrl(LONG),
    'https://www.agoda.com/near-don-mueang-hotel/hotel/bangkok-th.html',
  ));
t('shortPropertyUrl: strips hash', () =>
  assertEq(
    shortPropertyUrl(
      'https://www.agoda.com/near-don-mueang-hotel/hotel/bangkok-th.html#rooms',
    ),
    'https://www.agoda.com/near-don-mueang-hotel/hotel/bangkok-th.html',
  ));
t('shortPropertyUrl: preserves locale path prefix', () =>
  assertEq(
    shortPropertyUrl(
      'https://www.agoda.com/en-us/near-don-mueang-hotel/hotel/bangkok-th.html?cid=-1',
    ),
    'https://www.agoda.com/en-us/near-don-mueang-hotel/hotel/bangkok-th.html',
  ));
t('shortPropertyUrl: non-hotel page returns null', () =>
  assertEq(shortPropertyUrl('https://www.agoda.com/'), null));
t('shortPropertyUrl: non-Agoda host returns null', () =>
  assertEq(shortPropertyUrl('https://www.google.com/hotel/x.html'), null));
t('shortPropertyUrl: garbage returns null', () =>
  assertEq(shortPropertyUrl('not a url'), null));

// -- shortUrlWithDates ----------------------------------------------------

t('shortUrlWithDates: full-long URL preserves checkIn+los only', () =>
  assertEq(
    shortUrlWithDates(LONG),
    'https://www.agoda.com/near-don-mueang-hotel/hotel/bangkok-th.html?checkIn=2026-05-28&los=1',
  ));
t('shortUrlWithDates: multi-night stay', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.agoda.com/foo/hotel/x.html?checkIn=2026-07-15&los=7&adults=4',
    ),
    'https://www.agoda.com/foo/hotel/x.html?checkIn=2026-07-15&los=7',
  ));
t('shortUrlWithDates: missing checkIn returns null', () =>
  assertEq(
    shortUrlWithDates('https://www.agoda.com/foo/hotel/x.html?los=2'),
    null,
  ));
t('shortUrlWithDates: missing los returns null', () =>
  assertEq(
    shortUrlWithDates('https://www.agoda.com/foo/hotel/x.html?checkIn=2026-01-01'),
    null,
  ));
t('shortUrlWithDates: malformed checkIn returns null', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.agoda.com/foo/hotel/x.html?checkIn=tomorrow&los=1',
    ),
    null,
  ));
t('shortUrlWithDates: zero/negative los returns null', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.agoda.com/foo/hotel/x.html?checkIn=2026-01-01&los=0',
    ),
    null,
  ));
t('shortUrlWithDates: non-hotel page returns null', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.agoda.com/search?checkIn=2026-01-01&los=1',
    ),
    null,
  ));

// -- shortUrlForBar -------------------------------------------------------

t('shortUrlForBar: full-long URL keeps dates + occupancy', () =>
  assertEq(
    shortUrlForBar(LONG),
    'https://www.agoda.com/near-don-mueang-hotel/hotel/bangkok-th.html?checkIn=2026-05-28&los=1&adults=2&children=0&rooms=1',
  ));
t('shortUrlForBar: empty childAges param is dropped', () =>
  assertEq(
    shortUrlForBar(
      'https://www.agoda.com/foo/hotel/x.html?adults=2&children=0&rooms=1&childAges=',
    ),
    'https://www.agoda.com/foo/hotel/x.html?adults=2&children=0&rooms=1',
  ));
t('shortUrlForBar: childAges preserved when set', () =>
  assertEq(
    shortUrlForBar(
      'https://www.agoda.com/foo/hotel/x.html?adults=2&children=2&rooms=1&childAges=5,9',
    ),
    'https://www.agoda.com/foo/hotel/x.html?adults=2&children=2&rooms=1&childAges=5%2C9',
  ));
t('shortUrlForBar: bare hotel URL stays bare', () =>
  assertEq(
    shortUrlForBar(
      'https://www.agoda.com/near-don-mueang-hotel/hotel/bangkok-th.html',
    ),
    'https://www.agoda.com/near-don-mueang-hotel/hotel/bangkok-th.html',
  ));
t('shortUrlForBar: idempotent on already-short URL', () => {
  const short =
    'https://www.agoda.com/foo/hotel/x.html?checkIn=2026-05-28&los=1&adults=2&children=0&rooms=1';
  assertEq(shortUrlForBar(short), short);
});
t('shortUrlForBar: drops everything else', () =>
  assertEq(
    shortUrlForBar(
      'https://www.agoda.com/foo/hotel/x.html?cid=-1&currencyCode=USD&searchrequestid=abc&adults=2',
    ),
    'https://www.agoda.com/foo/hotel/x.html?adults=2',
  ));
t('shortUrlForBar: non-hotel page returns null', () =>
  assertEq(
    shortUrlForBar('https://www.agoda.com/search?city=1234&adults=2'),
    null,
  ));
t('shortUrlForBar: non-Agoda host returns null', () =>
  assertEq(
    shortUrlForBar('https://www.example.com/foo/hotel/x.html?adults=2'),
    null,
  ));
t('shortUrlForBar: garbage returns null', () =>
  assertEq(shortUrlForBar('not a url'), null));
t('shortUrlForBar: locale-prefixed hotel URL preserved', () =>
  assertEq(
    shortUrlForBar(
      'https://www.agoda.com/en-us/foo/hotel/x.html?cid=-1&adults=2&checkIn=2026-01-01&los=2',
    ),
    'https://www.agoda.com/en-us/foo/hotel/x.html?checkIn=2026-01-01&los=2&adults=2',
  ));

// -- hasDates -------------------------------------------------------------

t('hasDates: true when dates present', () =>
  assertEq(hasDates(LONG), true));
t('hasDates: false when no dates', () =>
  assertEq(
    hasDates('https://www.agoda.com/near-don-mueang-hotel/hotel/bangkok-th.html'),
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
