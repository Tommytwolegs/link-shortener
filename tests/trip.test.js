// Unit tests for src/trip.js — runnable with plain Node, no dependencies.

const path = require('path');
const {
  isTripHost,
  isHotelPage,
  shortPropertyUrl,
  shortUrlWithDates,
  shortUrlForBar,
  hasDates,
} = require(path.join('..', 'src', 'trip.js'));

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

const LONG =
  'https://us.trip.com/hotels/detail/?cityId=347&hotelId=2246857&checkIn=2026-07-10&checkOut=2026-07-12&adult=2&children=1&ages=7&crn=1&curr=USD&barcurr=USD&hoteluniquekey=H4sIAAA&masterhotelid_tracelogid=abc123&detailFilters=17%7C1&hotelType=normal&display=exchanged&subStamp=456&isCT=true&isFlexible=false&isFirstEnterDetail=true&locale=en-US&isRightClick=false';

// -- isTripHost -------------------------------------------------------------
t('isTripHost: trip.com', () => assertEq(isTripHost('trip.com'), true));
t('isTripHost: us.trip.com', () => assertEq(isTripHost('us.trip.com'), true));
t('isTripHost: www.trip.com', () => assertEq(isTripHost('www.trip.com'), true));
t('isTripHost: trip.evil.com', () => assertEq(isTripHost('trip.evil.com'), false));

// -- isHotelPage --------------------------------------------------------------
t('isHotelPage: detail with hotelId', () => assertEq(isHotelPage(LONG), true));
t('isHotelPage: detail WITHOUT hotelId → false', () =>
  assertEq(isHotelPage('https://us.trip.com/hotels/detail/?cityId=347'), false));
t('isHotelPage: hotel list → false', () =>
  assertEq(isHotelPage('https://us.trip.com/hotels/list?city=347'), false));
t('isHotelPage: flights → false', () =>
  assertEq(isHotelPage('https://us.trip.com/flights/'), false));
t('isHotelPage: non-numeric hotelId → false', () =>
  assertEq(isHotelPage('https://us.trip.com/hotels/detail/?hotelId=abc'), false));

// -- shortPropertyUrl ---------------------------------------------------------
t('shortPropertyUrl: hotelId only', () =>
  assertEq(shortPropertyUrl(LONG), 'https://us.trip.com/hotels/detail/?hotelId=2246857'));
t('shortPropertyUrl: non-hotel → null', () =>
  assertEq(shortPropertyUrl('https://us.trip.com/hotels/list?city=347'), null));
t('shortPropertyUrl: garbage → null', () => assertEq(shortPropertyUrl('not a url'), null));

// -- shortUrlWithDates --------------------------------------------------------
t('shortUrlWithDates: hotelId + dates', () =>
  assertEq(
    shortUrlWithDates(LONG),
    'https://us.trip.com/hotels/detail/?hotelId=2246857&checkIn=2026-07-10&checkOut=2026-07-12',
  ));
t('shortUrlWithDates: no dates → null', () =>
  assertEq(shortUrlWithDates('https://us.trip.com/hotels/detail/?hotelId=1'), null));
t('shortUrlWithDates: malformed date → null', () =>
  assertEq(shortUrlWithDates('https://us.trip.com/hotels/detail/?hotelId=1&checkIn=07/10/2026&checkOut=2026-07-12'), null));
t('shortUrlWithDates: checkOut <= checkIn → null', () =>
  assertEq(shortUrlWithDates('https://us.trip.com/hotels/detail/?hotelId=1&checkIn=2026-07-12&checkOut=2026-07-12'), null));
t('hasDates: true on LONG', () => assertEq(hasDates(LONG), true));
t('hasDates: false without dates', () =>
  assertEq(hasDates('https://us.trip.com/hotels/detail/?hotelId=1'), false));

// -- shortUrlForBar -----------------------------------------------------------
t('shortUrlForBar: keeps id + dates + occupancy + cityId, strips junk', () =>
  assertEq(
    shortUrlForBar(LONG),
    'https://us.trip.com/hotels/detail/?hotelId=2246857&checkIn=2026-07-10&checkOut=2026-07-12&adult=2&children=1&ages=7&crn=1&cityId=347',
  ));
t('shortUrlForBar: idempotent', () => {
  const short = shortUrlForBar(LONG);
  assertEq(shortUrlForBar(short), short);
});
t('shortUrlForBar: hotelId only stays minimal', () =>
  assertEq(
    shortUrlForBar('https://us.trip.com/hotels/detail/?hotelId=99'),
    'https://us.trip.com/hotels/detail/?hotelId=99',
  ));
t('shortUrlForBar: hash preserved', () =>
  assertEq(
    shortUrlForBar('https://us.trip.com/hotels/detail/?hotelId=99&subStamp=1#reviews'),
    'https://us.trip.com/hotels/detail/?hotelId=99#reviews',
  ));
t('shortUrlForBar: non-hotel → null', () =>
  assertEq(shortUrlForBar('https://us.trip.com/hotels/list?city=347'), null));

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
