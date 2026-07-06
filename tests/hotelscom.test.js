// Unit tests for src/hotelscom.js — runnable with plain Node, no dependencies.

const path = require('path');
const {
  isHotelscomHost,
  isHotelPage,
  shortPropertyUrl,
  shortUrlWithDates,
  shortUrlForBar,
  hasDates,
} = require(path.join('..', 'src', 'hotelscom.js'));

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

const MODERN =
  'https://www.hotels.com/ho276485/the-drake-hotel-chicago/?chkin=2026-07-10&chkout=2026-07-12&rm1=a2%3Ac5&x_pwa=1&rfrr=HSR&pwaLob=wizard-hotel-pwa-v2';
const LEGACY =
  'https://www.hotels.com/ho276485/?q-check-in=2026-07-10&q-check-out=2026-07-12&q-room-0-adults=2&q-room-0-children=1&WOE=7&WOD=4';

// -- isHotelscomHost ----------------------------------------------------------
t('isHotelscomHost: hotels.com', () => assertEq(isHotelscomHost('hotels.com'), true));
t('isHotelscomHost: www.hotels.com', () => assertEq(isHotelscomHost('www.hotels.com'), true));
t('isHotelscomHost: uk.hotels.com', () => assertEq(isHotelscomHost('uk.hotels.com'), true));
t('isHotelscomHost: hotels.evil.com', () => assertEq(isHotelscomHost('hotels.evil.com'), false));

// -- isHotelPage --------------------------------------------------------------
t('isHotelPage: /ho<id>/<slug>/', () => assertEq(isHotelPage(MODERN), true));
t('isHotelPage: /ho<id>/ bare', () => assertEq(isHotelPage(LEGACY), true));
t('isHotelPage: search page → false', () =>
  assertEq(isHotelPage('https://www.hotels.com/Hotel-Search?destination=Chicago'), false));
t('isHotelPage: home → false', () => assertEq(isHotelPage('https://www.hotels.com/'), false));
t('isHotelPage: non-ho path → false', () =>
  assertEq(isHotelPage('https://www.hotels.com/page/deals/'), false));

// -- shortPropertyUrl ---------------------------------------------------------
t('shortPropertyUrl: path only (modern)', () =>
  assertEq(shortPropertyUrl(MODERN), 'https://www.hotels.com/ho276485/the-drake-hotel-chicago/'));
t('shortPropertyUrl: path only (legacy)', () =>
  assertEq(shortPropertyUrl(LEGACY), 'https://www.hotels.com/ho276485/'));
t('shortPropertyUrl: garbage → null', () => assertEq(shortPropertyUrl('not a url'), null));

// -- shortUrlWithDates --------------------------------------------------------
t('shortUrlWithDates: modern chkin/chkout', () =>
  assertEq(
    shortUrlWithDates(MODERN),
    'https://www.hotels.com/ho276485/the-drake-hotel-chicago/?chkin=2026-07-10&chkout=2026-07-12',
  ));
t('shortUrlWithDates: legacy q-check-in/out (names preserved)', () =>
  assertEq(
    shortUrlWithDates(LEGACY),
    'https://www.hotels.com/ho276485/?q-check-in=2026-07-10&q-check-out=2026-07-12',
  ));
t('shortUrlWithDates: no dates → null', () =>
  assertEq(shortUrlWithDates('https://www.hotels.com/ho276485/'), null));
t('shortUrlWithDates: checkOut <= checkIn → null', () =>
  assertEq(shortUrlWithDates('https://www.hotels.com/ho1/?chkin=2026-07-12&chkout=2026-07-10'), null));
t('hasDates: modern true', () => assertEq(hasDates(MODERN), true));
t('hasDates: bare false', () => assertEq(hasDates('https://www.hotels.com/ho1/'), false));

// -- shortUrlForBar -----------------------------------------------------------
t('shortUrlForBar: modern keeps dates + rm rooms, strips junk', () =>
  assertEq(
    shortUrlForBar(MODERN),
    'https://www.hotels.com/ho276485/the-drake-hotel-chicago/?chkin=2026-07-10&chkout=2026-07-12&rm1=a2%3Ac5',
  ));
t('shortUrlForBar: legacy keeps q-* dates + rooms', () =>
  assertEq(
    shortUrlForBar(LEGACY),
    'https://www.hotels.com/ho276485/?q-check-in=2026-07-10&q-check-out=2026-07-12&q-room-0-adults=2&q-room-0-children=1',
  ));
t('shortUrlForBar: idempotent', () => {
  const short = shortUrlForBar(MODERN);
  assertEq(shortUrlForBar(short), short);
});
t('shortUrlForBar: no params → bare path', () =>
  assertEq(shortUrlForBar('https://www.hotels.com/ho1/?rfrr=HSR'), 'https://www.hotels.com/ho1/'));
t('shortUrlForBar: hash preserved', () =>
  assertEq(shortUrlForBar('https://www.hotels.com/ho1/?rfrr=x#reviews'), 'https://www.hotels.com/ho1/#reviews'));
t('shortUrlForBar: search page → null', () =>
  assertEq(shortUrlForBar('https://www.hotels.com/Hotel-Search?destination=X'), null));

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
