// siteopts.test.js — unit tests for the per-site options resolver (v1.13).
'use strict';

const {
  sanitizeSiteOpts,
  resolveKeepTitles,
  resolveHideWidget,
} = require('../src/siteopts.js');

let passed = 0;
let failed = 0;
const failures = [];

function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
  } else {
    failed++;
    failures.push({ label, actual: a, expected: e });
  }
}

// ---- sanitizeSiteOpts -------------------------------------------------------
check('sanitize: null -> {}', sanitizeSiteOpts(null), {});
check('sanitize: array -> {}', sanitizeSiteOpts([1, 2]), {});
check('sanitize: string -> {}', sanitizeSiteOpts('x'), {});
check('sanitize: valid keepTitles kept',
  sanitizeSiteOpts({ enabledAmazon: { keepTitles: 'never' } }),
  { enabledAmazon: { keepTitles: 'never' } });
check('sanitize: valid hideWidget kept',
  sanitizeSiteOpts({ enabledAgoda: { hideWidget: true } }),
  { enabledAgoda: { hideWidget: true } });
check('sanitize: both keys survive together',
  sanitizeSiteOpts({ enabledAmazon: { keepTitles: 'always', hideWidget: true } }),
  { enabledAmazon: { keepTitles: 'always', hideWidget: true } });
check('sanitize: bad site id dropped',
  sanitizeSiteOpts({ notASiteKey: { keepTitles: 'always' }, 'enabled lower': { hideWidget: true } }),
  {});
check('sanitize: unknown option keys dropped, entry pruned when empty',
  sanitizeSiteOpts({ enabledAmazon: { evil: 1, __proto__x: 2 } }),
  {});
check('sanitize: bad keepTitles value dropped',
  sanitizeSiteOpts({ enabledAmazon: { keepTitles: 'sometimes' } }),
  {});
check('sanitize: hideWidget false (default) not stored',
  sanitizeSiteOpts({ enabledAgoda: { hideWidget: false } }),
  {});
check('sanitize: hideWidget truthy-but-not-true dropped',
  sanitizeSiteOpts({ enabledAgoda: { hideWidget: 1 } }),
  {});
check('sanitize: non-object per-site value dropped',
  sanitizeSiteOpts({ enabledAmazon: 'always', enabledEbay: ['x'] }),
  {});
check('sanitize: mixed good and bad',
  sanitizeSiteOpts({
    enabledAmazon: { keepTitles: 'never', junk: true },
    bad: { keepTitles: 'always' },
    enabledVrbo: { hideWidget: true },
  }),
  { enabledAmazon: { keepTitles: 'never' }, enabledVrbo: { hideWidget: true } });

// ---- resolveKeepTitles ------------------------------------------------------
check('keepTitles: no settings -> false', resolveKeepTitles('enabledAmazon', null), false);
check('keepTitles: global off, no override -> false',
  resolveKeepTitles('enabledAmazon', { keepTitles: false, siteOpts: {} }), false);
check('keepTitles: global on, no override -> true',
  resolveKeepTitles('enabledAmazon', { keepTitles: true }), true);
check('keepTitles: legacy includeAmazonTitle still honored',
  resolveKeepTitles('enabledAmazon', { includeAmazonTitle: true }), true);
check('keepTitles: site always beats global off',
  resolveKeepTitles('enabledAmazon',
    { keepTitles: false, siteOpts: { enabledAmazon: { keepTitles: 'always' } } }), true);
check('keepTitles: site never beats global on',
  resolveKeepTitles('enabledAmazon',
    { keepTitles: true, siteOpts: { enabledAmazon: { keepTitles: 'never' } } }), false);
check('keepTitles: site never beats legacy flag too',
  resolveKeepTitles('enabledAmazon',
    { includeAmazonTitle: true, siteOpts: { enabledAmazon: { keepTitles: 'never' } } }), false);
check('keepTitles: override on a DIFFERENT site does not apply',
  resolveKeepTitles('enabledAmazon',
    { keepTitles: true, siteOpts: { enabledEbay: { keepTitles: 'never' } } }), true);
check('keepTitles: malformed siteOpts tolerated',
  resolveKeepTitles('enabledAmazon', { keepTitles: true, siteOpts: 'garbage' }), true);

// ---- resolveHideWidget ------------------------------------------------------
check('hideWidget: no settings -> false', resolveHideWidget('enabledAgoda', null), false);
check('hideWidget: global hide -> true',
  resolveHideWidget('enabledAgoda', { hideTravelPopup: true }), true);
check('hideWidget: site hide with global off -> true',
  resolveHideWidget('enabledAgoda',
    { hideTravelPopup: false, siteOpts: { enabledAgoda: { hideWidget: true } } }), true);
check('hideWidget: other-site hide does not apply',
  resolveHideWidget('enabledAgoda',
    { hideTravelPopup: false, siteOpts: { enabledBooking: { hideWidget: true } } }), false);
check('hideWidget: nothing set -> false',
  resolveHideWidget('enabledAgoda', { hideTravelPopup: false, siteOpts: {} }), false);

// ---- report -----------------------------------------------------------------
if (failed) {
  for (const f of failures) {
    console.error(`FAIL: ${f.label}\n  actual:   ${f.actual}\n  expected: ${f.expected}`);
  }
}
console.log(`\n${passed} passed, ${failed} failed (${passed + failed} total)`);
if (failed) process.exit(1);
