// Unit tests for src/booking.js — runnable with plain Node, no dependencies.
//
// Usage: node tests/booking.test.js

const path = require('path');
const {
  isBookingHost,
  isHotelPage,
  shortPropertyUrl,
  shortUrlWithDates,
  shortUrlForBar,
  hasDates,
} = require(path.join('..', 'src', 'booking.js'));

const LONG =
  'https://www.booking.com/hotel/th/aira-bangkok.html?aid=304142&label=gen173nr-10CAEoggI46AdIM1gEaIoCiAEBmAEzuAEXyAEM2AED6AEB-AEBiAIBqAIBuALe_a_PBsACAdICJGEwMDI0YmMzLWI3YTQtNDBkOC05MzQ2LWM4Yjk5MmExOTQ0NtgCAeACAQ&sid=8609f9b4c6d90f4d7b6fe811eb9c3435&all_sr_blocks=771924927_389738979_2_2_0_707975&checkin=2026-05-28&checkout=2026-05-29&dest_id=-3414440&dest_type=city&dist=0&group_adults=2&group_children=0&hapos=2&highlighted_blocks=771924927_389738979_2_2_0_707975&hpos=2&matching_block_id=771924927_389738979_2_2_0_707975&no_rooms=1&req_adults=2&req_children=0&room1=A%2CA&sb_price_type=total&sr_order=popularity&sr_pri_blocks=771924927_389738979_2_2_0_707975_209051&srepoch=1777073917&srpvid=5a6ca638786801e7&type=total&ucfs=1&';

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

// -- isBookingHost --------------------------------------------------------

t('isBookingHost: www.booking.com', () =>
  assertEq(isBookingHost('www.booking.com'), true));
t('isBookingHost: booking.com', () =>
  assertEq(isBookingHost('booking.com'), true));
t('isBookingHost: m.booking.com', () =>
  assertEq(isBookingHost('m.booking.com'), true));
t('isBookingHost: booking-fake.com', () =>
  assertEq(isBookingHost('booking-fake.com'), false));
t('isBookingHost: google.com', () =>
  assertEq(isBookingHost('google.com'), false));
t('isBookingHost: empty', () => assertEq(isBookingHost(''), false));

// -- isHotelPage ----------------------------------------------------------

t('isHotelPage: full-long URL', () => assertEq(isHotelPage(LONG), true));
t('isHotelPage: bare hotel URL', () =>
  assertEq(
    isHotelPage('https://www.booking.com/hotel/th/aira-bangkok.html'),
    true,
  ));
t('isHotelPage: gb country code', () =>
  assertEq(
    isHotelPage('https://www.booking.com/hotel/gb/something-london.html'),
    true,
  ));
t('isHotelPage: search results page', () =>
  assertEq(
    isHotelPage('https://www.booking.com/searchresults.html?city=1234'),
    false,
  ));
t('isHotelPage: homepage', () =>
  assertEq(isHotelPage('https://www.booking.com/'), false));
t('isHotelPage: non-Booking site with /hotel/th/x.html', () =>
  assertEq(isHotelPage('https://other.com/hotel/th/foo.html'), false));
t('isHotelPage: Booking path without country code', () =>
  assertEq(
    isHotelPage('https://www.booking.com/hotel/aira-bangkok.html'),
    false,
  ));
t('isHotelPage: Booking path with three-letter cc', () =>
  assertEq(
    isHotelPage('https://www.booking.com/hotel/usa/foo.html'),
    false,
  ));

// -- shortPropertyUrl -----------------------------------------------------

t('shortPropertyUrl: strips all query params', () =>
  assertEq(
    shortPropertyUrl(LONG),
    'https://www.booking.com/hotel/th/aira-bangkok.html',
  ));
t('shortPropertyUrl: strips hash', () =>
  assertEq(
    shortPropertyUrl(
      'https://www.booking.com/hotel/th/aira-bangkok.html#rooms',
    ),
    'https://www.booking.com/hotel/th/aira-bangkok.html',
  ));
t('shortPropertyUrl: non-hotel page returns null', () =>
  assertEq(shortPropertyUrl('https://www.booking.com/'), null));
t('shortPropertyUrl: non-Booking host returns null', () =>
  assertEq(
    shortPropertyUrl('https://www.google.com/hotel/th/x.html'),
    null,
  ));
t('shortPropertyUrl: garbage returns null', () =>
  assertEq(shortPropertyUrl('not a url'), null));

// -- shortUrlWithDates ----------------------------------------------------

t('shortUrlWithDates: full-long URL preserves checkin+checkout only', () =>
  assertEq(
    shortUrlWithDates(LONG),
    'https://www.booking.com/hotel/th/aira-bangkok.html?checkin=2026-05-28&checkout=2026-05-29',
  ));
t('shortUrlWithDates: multi-night stay', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.booking.com/hotel/th/x.html?checkin=2026-07-15&checkout=2026-07-22&group_adults=4',
    ),
    'https://www.booking.com/hotel/th/x.html?checkin=2026-07-15&checkout=2026-07-22',
  ));
t('shortUrlWithDates: missing checkin returns null', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.booking.com/hotel/th/x.html?checkout=2026-01-02',
    ),
    null,
  ));
t('shortUrlWithDates: missing checkout returns null', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.booking.com/hotel/th/x.html?checkin=2026-01-01',
    ),
    null,
  ));
t('shortUrlWithDates: malformed checkin returns null', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.booking.com/hotel/th/x.html?checkin=tomorrow&checkout=2026-01-02',
    ),
    null,
  ));
t('shortUrlWithDates: checkout earlier than checkin returns null', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.booking.com/hotel/th/x.html?checkin=2026-01-05&checkout=2026-01-02',
    ),
    null,
  ));
t('shortUrlWithDates: checkout same as checkin returns null', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.booking.com/hotel/th/x.html?checkin=2026-01-05&checkout=2026-01-05',
    ),
    null,
  ));
t('shortUrlWithDates: non-hotel page returns null', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.booking.com/searchresults.html?checkin=2026-01-01&checkout=2026-01-02',
    ),
    null,
  ));

// -- shortUrlForBar -------------------------------------------------------

t('shortUrlForBar: full-long URL keeps dates + occupancy', () =>
  assertEq(
    shortUrlForBar(LONG),
    'https://www.booking.com/hotel/th/aira-bangkok.html?checkin=2026-05-28&checkout=2026-05-29&group_adults=2&group_children=0&no_rooms=1',
  ));
t('shortUrlForBar: bare hotel URL stays bare', () =>
  assertEq(
    shortUrlForBar('https://www.booking.com/hotel/th/aira-bangkok.html'),
    'https://www.booking.com/hotel/th/aira-bangkok.html',
  ));
t('shortUrlForBar: idempotent on already-short URL', () => {
  const short =
    'https://www.booking.com/hotel/th/x.html?checkin=2026-05-28&checkout=2026-05-29&group_adults=2&group_children=0&no_rooms=1';
  assertEq(shortUrlForBar(short), short);
});
t('shortUrlForBar: drops everything else', () =>
  assertEq(
    shortUrlForBar(
      'https://www.booking.com/hotel/th/x.html?aid=999&label=gen&sid=abc&group_adults=2',
    ),
    'https://www.booking.com/hotel/th/x.html?group_adults=2',
  ));
t('shortUrlForBar: preserves multiple age params for child rooms', () =>
  assertEq(
    shortUrlForBar(
      'https://www.booking.com/hotel/th/x.html?group_adults=2&group_children=2&age=5&age=9',
    ),
    'https://www.booking.com/hotel/th/x.html?group_adults=2&group_children=2&age=5&age=9',
  ));
t('shortUrlForBar: drops empty params', () =>
  assertEq(
    shortUrlForBar(
      'https://www.booking.com/hotel/th/x.html?group_adults=2&group_children=&no_rooms=',
    ),
    'https://www.booking.com/hotel/th/x.html?group_adults=2',
  ));
t('shortUrlForBar: non-hotel page returns null', () =>
  assertEq(
    shortUrlForBar(
      'https://www.booking.com/searchresults.html?city=1234&group_adults=2',
    ),
    null,
  ));
t('shortUrlForBar: non-Booking host returns null', () =>
  assertEq(
    shortUrlForBar('https://www.example.com/hotel/th/x.html?group_adults=2'),
    null,
  ));
t('shortUrlForBar: garbage returns null', () =>
  assertEq(shortUrlForBar('not a url'), null));

// -- hasDates -------------------------------------------------------------

t('hasDates: true when dates present', () => assertEq(hasDates(LONG), true));
t('hasDates: false when no dates', () =>
  assertEq(
    hasDates('https://www.booking.com/hotel/th/aira-bangkok.html'),
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
