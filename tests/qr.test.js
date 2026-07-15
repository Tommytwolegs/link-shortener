// qr.test.js
// ----------------------------------------------------------------------------
// Pins the QR encoder to matrices that were verified MODULE-FOR-MODULE
// against python-qrcode (the reference implementation) at build time:
// 13 vectors x all 8 masks matched exactly, versions 1 through 19.
// These golden hashes freeze that verified state; any change to the
// encoder that alters a single module fails loudly.
// ----------------------------------------------------------------------------

const path = require('path');
const crypto = require('crypto');
const qr = require(path.join('..', 'src', 'qr.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}

function matrixHash(text, mask) {
  const r = qr.encode(text, mask === null ? undefined : mask);
  if (!r) return null;
  const s = r.modules.map((row) => row.map((c) => (c ? '1' : '0')).join('')).join('\n');
  return 'v' + r.version + ':' + crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
}

// -- Structural invariants ----------------------------------------------------
const r = qr.encode('https://ratherlinks.com/');
check('version fits', r.version, 2);
check('size = 17+4v', r.size, 17 + 4 * r.version);
check('square matrix', r.modules.length === r.size && r.modules.every((row) => row.length === r.size), true);
check('finder top-left corner dark', r.modules[0][0], true);
check("finder separator light", r.modules[7][7], false);

check("finder ring (1,1) light", r.modules[1][1], false);
check('timing row alternates', r.modules[6][8] !== r.modules[6][9], true);
check('dark module present', r.modules[r.size - 8][8], true);
check('too-long input returns null', qr.encode('x'.repeat(2000)), null);
check('svg returns svg', /^<svg /.test(qr.svg('https://ratherlinks.com/')), true);
check('svg has white ground', qr.svg('x').includes('fill="#ffffff"'), true);
check('svg too-long null', qr.svg('x'.repeat(2000)), null);

// -- Golden hashes (verified against python-qrcode; see header) ----------------
const GOLDEN = [["A",0,"v1:2bae48594b732587"],
  ["A",7,"v1:23eee31305a65603"],
  ["https://ratherlinks.com/",null,"v2:fcc28bbc9cae07b0"],
  ["https://ratherlinks.com/",3,"v2:984c33946bd2eb46"],
  ["https://www.amazon.com/dp/B0ABCDEF12",null,"v3:c1fab765ed96eefa"],
  ["https://example.com/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",null,"v9:c2d3c1afc3810b48"],
  ["https://example.com/ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",5,"v19:2255336264952414"],
  ["päge ✓ 日本語",null,"v2:e4e0a5662655301c"]];
for (const [text, mask, expected] of GOLDEN) {
  check('golden ' + JSON.stringify(text.slice(0, 30)) + ' mask=' + mask, matrixHash(text, mask), expected);
}

if (failures.length) {
  for (const f of failures.slice(0, 10)) {
    console.log('FAIL:', f.label, '\n  actual  :', f.actual, '\n  expected:', f.expected);
  }
}
console.log(`${passed} passed, ${failed} failed (${passed + failed} total)`);
process.exit(failed ? 1 : 0);
