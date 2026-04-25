// Unit tests for src/airbnb.js — runnable with plain Node, no dependencies.
//
// Usage: node tests/airbnb.test.js

const path = require('path');
const {
  isAirbnbHost,
  isListingPage,
  shortPropertyUrl,
  shortUrlWithDates,
  shortUrlForBar,
  hasDates,
} = require(path.join('..', 'src', 'airbnb.js'));

const LONG =
  'https://www.airbnb.com/rooms/750391908732827657?check_in=2026-05-28&check_out=2026-05-29&search_mode=regular_search&source_impression_id=p3_1777075619_P3rljueQRYMwBrMQ&previous_page_section_name=1000&federated_search_id=6150d0ba-eeec-43f7-831b-9bb85beca720';

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

// -- isAirbnbHost ---------------------------------------------------------

t('isAirbnbHost: www.airbnb.com', () =>
  assertEq(isAirbnbHost('www.airbnb.com'), true));
t('isAirbnbHost: airbnb.com', () =>
  assertEq(isAirbnbHost('airbnb.com'), true));
t('isAirbnbHost: www.airbnb.co.uk', () =>
  assertEq(isAirbnbHost('www.airbnb.co.uk'), true));
t('isAirbnbHost: www.airbnb.de', () =>
  assertEq(isAirbnbHost('www.airbnb.de'), true));
t('isAirbnbHost: m.airbnb.com', () =>
  assertEq(isAirbnbHost('m.airbnb.com'), true));
t('isAirbnbHost: airbnb-fake.com', () =>
  assertEq(isAirbnbHost('airbnb-fake.com'), false));
t('isAirbnbHost: google.com', () =>
  assertEq(isAirbnbHost('google.com'), false));
t('isAirbnbHost: empty', () => assertEq(isAirbnbHost(''), false));

// -- isListingPage --------------------------------------------------------

t('isListingPage: full-long URL', () => assertEq(isListingPage(LONG), true));
t('isListingPage: bare /rooms/<id>', () =>
  assertEq(
    isListingPage('https://www.airbnb.com/rooms/750391908732827657'),
    true,
  ));
t('isListingPage: /rooms/plus/<id>', () =>
  assertEq(
    isListingPage('https://www.airbnb.com/rooms/plus/12345'),
    true,
  ));
t('isListingPage: /rooms/luxury/<id>', () =>
  assertEq(
    isListingPage('https://www.airbnb.com/rooms/luxury/12345'),
    true,
  ));
t('isListingPage: /rooms/hotel/<id>', () =>
  assertEq(
    isListingPage('https://www.airbnb.com/rooms/hotel/12345'),
    true,
  ));
t('isListingPage: regional TLD', () =>
  assertEq(
    isListingPage('https://www.airbnb.co.uk/rooms/12345'),
    true,
  ));
t('isListingPage: search results page', () =>
  assertEq(
    isListingPage('https://www.airbnb.com/s/Bangkok/homes'),
    false,
  ));
t('isListingPage: homepage', () =>
  assertEq(isListingPage('https://www.airbnb.com/'), false));
t('isListingPage: non-Airbnb site with same path', () =>
  assertEq(isListingPage('https://other.com/rooms/12345'), false));
t('isListingPage: trailing slash on /rooms/<id>/', () =>
  assertEq(
    isListingPage('https://www.airbnb.com/rooms/12345/'),
    false,
  ));
t('isListingPage: experience URL is not a room', () =>
  assertEq(
    isListingPage('https://www.airbnb.com/experiences/12345'),
    false,
  ));

// -- shortPropertyUrl -----------------------------------------------------

t('shortPropertyUrl: strips all query params', () =>
  assertEq(
    shortPropertyUrl(LONG),
    'https://www.airbnb.com/rooms/750391908732827657',
  ));
t('shortPropertyUrl: strips hash', () =>
  assertEq(
    shortPropertyUrl(
      'https://www.airbnb.com/rooms/12345#reviews',
    ),
    'https://www.airbnb.com/rooms/12345',
  ));
t('shortPropertyUrl: preserves /rooms/plus/<id> path', () =>
  assertEq(
    shortPropertyUrl(
      'https://www.airbnb.com/rooms/plus/12345?check_in=2026-05-28&check_out=2026-05-29',
    ),
    'https://www.airbnb.com/rooms/plus/12345',
  ));
t('shortPropertyUrl: non-listing page returns null', () =>
  assertEq(shortPropertyUrl('https://www.airbnb.com/'), null));
t('shortPropertyUrl: non-Airbnb host returns null', () =>
  assertEq(shortPropertyUrl('https://www.google.com/rooms/12345'), null));
t('shortPropertyUrl: garbage returns null', () =>
  assertEq(shortPropertyUrl('not a url'), null));

// -- shortUrlWithDates ----------------------------------------------------

t('shortUrlWithDates: full-long URL preserves dates only', () =>
  assertEq(
    shortUrlWithDates(LONG),
    'https://www.airbnb.com/rooms/750391908732827657?check_in=2026-05-28&check_out=2026-05-29',
  ));
t('shortUrlWithDates: multi-night stay', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.airbnb.com/rooms/12345?check_in=2026-07-15&check_out=2026-07-22&adults=4',
    ),
    'https://www.airbnb.com/rooms/12345?check_in=2026-07-15&check_out=2026-07-22',
  ));
t('shortUrlWithDates: missing check_in returns null', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.airbnb.com/rooms/12345?check_out=2026-01-02',
    ),
    null,
  ));
t('shortUrlWithDates: missing check_out returns null', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.airbnb.com/rooms/12345?check_in=2026-01-01',
    ),
    null,
  ));
t('shortUrlWithDates: malformed check_in returns null', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.airbnb.com/rooms/12345?check_in=tomorrow&check_out=2026-01-02',
    ),
    null,
  ));
t('shortUrlWithDates: check_out earlier than check_in returns null', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.airbnb.com/rooms/12345?check_in=2026-01-05&check_out=2026-01-02',
    ),
    null,
  ));
t('shortUrlWithDates: check_out same as check_in returns null', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.airbnb.com/rooms/12345?check_in=2026-01-05&check_out=2026-01-05',
    ),
    null,
  ));
t('shortUrlWithDates: non-listing page returns null', () =>
  assertEq(
    shortUrlWithDates(
      'https://www.airbnb.com/s/Bangkok/homes?check_in=2026-01-01&check_out=2026-01-02',
    ),
    null,
  ));

// -- shortUrlForBar -------------------------------------------------------

t('shortUrlForBar: full-long URL keeps dates only (no occupancy in URL)', () =>
  assertEq(
    shortUrlForBar(LONG),
    'https://www.airbnb.com/rooms/750391908732827657?check_in=2026-05-28&check_out=2026-05-29',
  ));
t('shortUrlForBar: bare listing URL stays bare', () =>
  assertEq(
    shortUrlForBar('https://www.airbnb.com/rooms/12345'),
    'https://www.airbnb.com/rooms/12345',
  ));
t('shortUrlForBar: idempotent on already-short URL', () => {
  const short =
    'https://www.airbnb.com/rooms/12345?check_in=2026-05-28&check_out=2026-05-29&adults=2&children=0&infants=0&pets=0';
  assertEq(shortUrlForBar(short), short);
});
t('shortUrlForBar: drops everything except dates and occupancy', () =>
  assertEq(
    shortUrlForBar(
      'https://www.airbnb.com/rooms/12345?check_in=2026-05-28&check_out=2026-05-29&adults=2&search_mode=regular_search&source_impression_id=p3_xyz&federated_search_id=abc',
    ),
    'https://www.airbnb.com/rooms/12345?check_in=2026-05-28&check_out=2026-05-29&adults=2',
  ));
t('shortUrlForBar: drops empty params', () =>
  assertEq(
    shortUrlForBar(
      'https://www.airbnb.com/rooms/12345?check_in=&check_out=2026-05-29&adults=2&children=&pets=',
    ),
    'https://www.airbnb.com/rooms/12345?check_out=2026-05-29&adults=2',
  ));
t('shortUrlForBar: non-listing page returns null', () =>
  assertEq(
    shortUrlForBar(
      'https://www.airbnb.com/s/Bangkok/homes?check_in=2026-01-01&check_out=2026-01-02',
    ),
    null,
  ));
t('shortUrlForBar: non-Airbnb host returns null', () =>
  assertEq(
    shortUrlForBar('https://www.example.com/rooms/12345?adults=2'),
    null,
  ));
t('shortUrlForBar: garbage returns null', () =>
  assertEq(shortUrlForBar('not a url'), null));

// -- hasDates -------------------------------------------------------------

t('hasDates: true when dates present', () => assertEq(hasDates(LONG), true));
t('hasDates: false when no dates', () =>
  assertEq(hasDates('https://www.airbnb.com/rooms/12345'), false));

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
