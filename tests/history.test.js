// history.test.js — unit tests for the local activity-history helpers (v1.13).
'use strict';

const H = require('../src/history.js');

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

// ---- hostOf -----------------------------------------------------------------
check('hostOf: plain', H.hostOf('https://www.example.com/a/b?c=1'), 'www.example.com');
check('hostOf: not a URL -> empty', H.hostOf('garbage'), '');
check('hostOf: null -> empty', H.hostOf(null), '');

// ---- removedParamNames --------------------------------------------------------
check('removed: simple diff',
  H.removedParamNames('https://a.com/?id=1&utm_source=x&gclid=y', 'https://a.com/?id=1'),
  ['utm_source', 'gclid']);
check('removed: nothing removed',
  H.removedParamNames('https://a.com/?id=1', 'https://a.com/?id=1'), []);
check('removed: kept param not listed',
  H.removedParamNames('https://a.com/?id=1&fbclid=z', 'https://a.com/?id=1'), ['fbclid']);
check('removed: repeated param listed once',
  H.removedParamNames('https://a.com/?utm_source=a&utm_source=b&x=1', 'https://a.com/?x=1'),
  ['utm_source']);
check('removed: invalid urls -> empty', H.removedParamNames('nope', 'https://a.com/'), []);

// ---- makeEntry ----------------------------------------------------------------
const e1 = H.makeEntry({ t: 123, host: 'shop.example.com', kind: 'active', count: 2, chars: 40 });
check('entry: basic fields', e1, { t: 123, host: 'shop.example.com', kind: 'active', count: 2, chars: 40 });
check('entry: unknown kind coerced', H.makeEntry({ t: 1, host: 'a.com', kind: 'evil' }).kind, 'rewrite');
check('entry: zero fields omitted',
  Object.keys(H.makeEntry({ t: 1, host: 'a.com', kind: 'copy', count: 0, chars: 0 })),
  ['t', 'host', 'kind']);
const manyParams = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];
const e2 = H.makeEntry({ t: 1, host: 'a.com', kind: 'rewrite', params: manyParams });
check('entry: params capped at 8', e2.params.length, 8);
check('entry: overflow counted', e2.more, 2);
check('entry: params filtered to strings',
  H.makeEntry({ t: 1, host: 'a.com', kind: 'rewrite', params: ['ok', 7, null, ''] }).params,
  ['ok']);
check('entry: no params field when list empty',
  'params' in H.makeEntry({ t: 1, host: 'a.com', kind: 'rewrite', params: [] }), false);
check('entry: long host truncated', H.makeEntry({ t: 1, host: 'x'.repeat(300), kind: 'skip' }).host.length, 128);
// The privacy invariant: there is no way to store a URL or a value.
check('entry: url-ish fields are not carried through',
  'url' in H.makeEntry({ t: 1, host: 'a.com', kind: 'skip', url: 'https://leak.example' }), false);

// ---- push ---------------------------------------------------------------------
check('push: newest first', H.push([{ t: 1 }], { t: 2 }), [{ t: 2 }, { t: 1 }]);
check('push: non-array base tolerated', H.push(null, { t: 1 }), [{ t: 1 }]);
const big = [];
for (let i = 0; i < 60; i++) big.push({ t: i });
const capped = H.push(big, { t: 99 });
check('push: capped at MAX', capped.length, H.MAX);
check('push: newest kept after cap', capped[0], { t: 99 });
const orig = [{ t: 1 }];
H.push(orig, { t: 2 });
check('push: does not mutate input', orig, [{ t: 1 }]);

// ---- report ---------------------------------------------------------------------
if (failed) {
  for (const f of failures) {
    console.error(`FAIL: ${f.label}\n  actual:   ${f.actual}\n  expected: ${f.expected}`);
  }
}
console.log(`\n${passed} passed, ${failed} failed (${passed + failed} total)`);
if (failed) process.exit(1);
