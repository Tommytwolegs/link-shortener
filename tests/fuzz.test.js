// fuzz.test.js
// ----------------------------------------------------------------------------
// Deterministic seeded fuzzing across every URL module. The corpus tests
// check known-good expectations; this checks INVARIANTS on generated
// garbage the corpus would never think of:
//
//   1. shorten() never throws, on any input
//   2. shorten() output is idempotent (cleaning twice = cleaning once)
//   3. needsShortening() never throws and is never true on shorten()'s
//      own output (no rewrite churn)
//   4. URL-object inputs are never mutated
//
// The generator builds URLs from each module's own test-file hostnames
// plus adversarial parts: unicode paths, %-encodings, repeated params,
// empty values, '+' vs %20, uppercase param names, deep paths, long
// values, degenerate queries ('?', '?=', '?&&'), userinfo, ports.
//
// Seeded PRNG (mulberry32) — same URLs every run, so failures are
// reproducible and CI is never flaky. Bump SEED deliberately to explore
// new space; never at random.
// ----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

const SEED = 0xC0FFEE;
const URLS_PER_MODULE = 200;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const maybe = (p) => rand() < p;

const PATH_PARTS = [
  'dp', 'p', 'item', 'watch', 'article', 'a-b-c', 'B08N5WRWNW', '12345',
  'itm', 's', 'search', 'wiki', 'status', '@user', 'x%20y', '%E6%97%A5%E6%9C%AC',
  'foo.bar', 'index.html', 'v', 'shorts', 'reviews', 'l', 'redirect', 'ck',
  'amp', 'profile', 'shop', 'category', 'なまえ', 'ünïcode', '..', '.', '-',
];
const PARAM_NAMES = [
  'utm_source', 'ref', 'q', 'id', 'k', 'v', 't', 'si', 'tag', 'fbclid',
  'gclid', 'UTM_MEDIUM', 'Ref_', 'sk', 'st', 'gid', 'variant', 'sku_id',
  'query', 'searchTerm', 'page', 'sort', 'lang', 'x', '', 'a b', 'a&b',
];
const PARAM_VALUES = [
  '1', 'abc', '', 'x y', 'a+b', '%2Fpath', 'https%3A%2F%2Fevil.com',
  'ABC123', '日本語', '%%%', 'null', 'undefined', '0', '-1',
  'a'.repeat(600), '<script>', '"quote"', "it's",
];

function genUrl(host) {
  let u = pick(['https://', 'http://']);
  if (maybe(0.05)) u += 'user:pass@';
  // case-mangle the host sometimes
  u += maybe(0.15)
    ? host.split('').map((c) => (maybe(0.3) ? c.toUpperCase() : c)).join('')
    : host;
  if (maybe(0.05)) u += ':8443';
  const depth = Math.floor(rand() * 5);
  for (let i = 0; i < depth; i++) u += '/' + pick(PATH_PARTS);
  if (maybe(0.3)) u += '/';
  const q = rand();
  if (q < 0.1) u += pick(['?', '?=', '?&&', '?&=&']);
  else if (q < 0.85) {
    const n = 1 + Math.floor(rand() * 5);
    const parts = [];
    for (let i = 0; i < n; i++) {
      const name = pick(PARAM_NAMES);
      parts.push(maybe(0.15) ? name : name + '=' + pick(PARAM_VALUES));
    }
    if (maybe(0.2)) parts.push(parts[0]); // repeated param
    u += '?' + parts.join('&');
  }
  if (maybe(0.25)) u += pick(['#frag', '#', '#a=b', '#:~:text=hi', '#日本']);
  return u;
}

// Modules under test: everything with a test file except infra.
const SKIP = new Set(['utm', 'redirect', 'texturl', 'fuzz']);
const modules = fs.readdirSync('tests')
  .filter((f) => f.endsWith('.test.js'))
  .map((f) => f.replace('.test.js', ''))
  .filter((m) => !SKIP.has(m) && fs.existsSync(path.join(__dirname, '..', 'src', m + '.js')));

let passed = 0, failed = 0;
const failures = [];
function fail(label, detail) {
  failed++;
  if (failures.length < 20) failures.push({ label, detail });
}

for (const mod of modules) {
  const api = require(path.join('..', 'src', mod + '.js'));
  const shorten = api.shortenUrl
    || Object.keys(api).filter((k) => /^short/i.test(k) && typeof api[k] === 'function').map((k) => api[k])[0];
  const needs = api.needsShortening;
  // Hosts from the module's own test inputs (positive + lookalikes).
  const tsrc = fs.readFileSync(path.join(__dirname, mod + '.test.js'), 'utf8');
  const hosts = [...new Set([...tsrc.matchAll(/input:\s*'https?:\/\/([^/'?#]+)/g)].map((m) => m[1]))];
  if (!hosts.length || typeof shorten !== 'function') continue;

  for (let i = 0; i < URLS_PER_MODULE; i++) {
    const input = genUrl(pick(hosts));
    let once;
    try { once = shorten(input); } catch (e) {
      fail(mod + ' shorten throws', input + ' :: ' + e.message); continue;
    }
    try { if (needs) needs(input); } catch (e) {
      fail(mod + ' needs throws', input + ' :: ' + e.message); continue;
    }
    passed++;
    if (once == null) continue;
    let twice;
    try { twice = shorten(once); } catch (e) {
      fail(mod + ' shorten throws on own output', once + ' :: ' + e.message); continue;
    }
    if (twice !== null && twice !== once) {
      fail(mod + ' not idempotent', input + ' -> ' + once + ' -> ' + twice); continue;
    }
    if (needs && needs(once) === true) {
      fail(mod + ' needsShortening true on own output', input + ' -> ' + once); continue;
    }
    try {
      const u = new URL(input);
      const before = u.href;
      shorten(u);
      if (u.href !== before) { fail(mod + ' mutates URL object', input); continue; }
    } catch (_e) { /* not URL-object parseable; fine */ }
  }
}

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) {
  console.log('\nFailures (first ' + failures.length + '):');
  for (const f of failures) {
    console.log('  - ' + f.label);
    console.log('      ' + f.detail);
  }
  process.exit(1);
}
