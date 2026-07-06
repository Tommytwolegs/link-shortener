// Unit tests for src/vrbo.js — runnable with plain Node, no dependencies.

const path = require('path');
const {
  isVrboHost,
  isPropertyPage,
  shortPropertyUrl,
  shortUrlWithDates,
  shortUrlForBar,
  hasDates,
} = require(path.join('..', 'src', 'vrbo.js'));

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
  'https://www.vrbo.com/2318557?chkin=2026-08-01&chkout=2026-08-05&adults=4&children=2&unitApId=123&rfrr=HSR&x_pwa=1';
const LEGACY =
  'https://www.vrbo.com/1234567ha?startDate=2026-08-01&endDate=2026-08-05&adultsCount=4&petIncluded=false';

t('isVrboHost: vrbo.com', () => assertEq(isVrboHost('vrbo.com'), true));
t('isVrboHost: www.vrbo.com', () => assertEq(isVrboHost('www.vrbo.com'), true));
t('isVrboHost: vrbo.evil.com', () => assertEq(isVrboHost('vrbo.evil.com'), false));

t('isPropertyPage: numeric id', () => assertEq(isPropertyPage(MODERN), true));
t('isPropertyPage: id with ha suffix', () => assertEq(isPropertyPage(LEGACY), true));
t('isPropertyPage: search → false', () =>
  assertEq(isPropertyPage('https://www.vrbo.com/search?destination=Miami'), false));
t('isPropertyPage: home → false', () => assertEq(isPropertyPage('https://www.vrbo.com/'), false));
t('isPropertyPage: non-numeric → false', () =>
  assertEq(isPropertyPage('https://www.vrbo.com/trip-boards'), false));

t('shortPropertyUrl: path only', () =>
  assertEq(shortPropertyUrl(MODERN), 'https://www.vrbo.com/2318557'));
t('shortPropertyUrl: ha suffix kept', () =>
  assertEq(shortPropertyUrl(LEGACY), 'https://www.vrbo.com/1234567ha'));
t('shortPropertyUrl: garbage → null', () => assertEq(shortPropertyUrl('not a url'), null));

t('shortUrlWithDates: modern chkin/chkout', () =>
  assertEq(
    shortUrlWithDates(MODERN),
    'https://www.vrbo.com/2318557?chkin=2026-08-01&chkout=2026-08-05',
  ));
t('shortUrlWithDates: legacy startDate/endDate (names preserved)', () =>
  assertEq(
    shortUrlWithDates(LEGACY),
    'https://www.vrbo.com/1234567ha?startDate=2026-08-01&endDate=2026-08-05',
  ));
t('shortUrlWithDates: no dates → null', () =>
  assertEq(shortUrlWithDates('https://www.vrbo.com/2318557'), null));
t('shortUrlWithDates: bad order → null', () =>
  assertEq(shortUrlWithDates('https://www.vrbo.com/1?chkin=2026-08-05&chkout=2026-08-01'), null));
t('hasDates: modern true', () => assertEq(hasDates(MODERN), true));
t('hasDates: bare false', () => assertEq(hasDates('https://www.vrbo.com/1'), false));

t('shortUrlForBar: modern keeps dates + occupancy, strips junk', () =>
  assertEq(
    shortUrlForBar(MODERN),
    'https://www.vrbo.com/2318557?chkin=2026-08-01&chkout=2026-08-05&adults=4&children=2',
  ));
t('shortUrlForBar: legacy keeps startDate/endDate', () =>
  assertEq(
    shortUrlForBar(LEGACY),
    'https://www.vrbo.com/1234567ha?startDate=2026-08-01&endDate=2026-08-05',
  ));
t('shortUrlForBar: idempotent', () => {
  const short = shortUrlForBar(MODERN);
  assertEq(shortUrlForBar(short), short);
});
t('shortUrlForBar: no params → bare path', () =>
  assertEq(shortUrlForBar('https://www.vrbo.com/1?rfrr=x'), 'https://www.vrbo.com/1'));
t('shortUrlForBar: hash preserved', () =>
  assertEq(shortUrlForBar('https://www.vrbo.com/1?rfrr=x#reviews'), 'https://www.vrbo.com/1#reviews'));
t('shortUrlForBar: search → null', () =>
  assertEq(shortUrlForBar('https://www.vrbo.com/search?destination=X'), null));

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
