#!/usr/bin/env node
// check-wiring.js
// ----------------------------------------------------------------------------
// The wiring auditor: validates every surface a site module must be
// registered on, treating the modules themselves as the registry (each
// exports its host regex, STORAGE_KEY, and namespace — no parallel
// sites.json to drift).
//
// Adding a site touches several files; forgetting one has historically
// produced SILENT failures (v1.7.0 shipped 7 sites whose toggles did
// nothing). This script makes every miss loud. Checks:
//
//   1. module present in background.js importScripts
//   2. module present in package.sh AND package.ps1 background.scripts
//      arrays, and the two arrays are identical
//   3. module present in background.js HOST_CHECKS (drives both the
//      SPA-navigation fallback and the generated SHORTENERS table)
//   4. module's shorten fn resolvable by the SHORTENERS rule
//      (shortenUrl || shortenAmazonUrl || shortPropertyUrl)
//   5. STORAGE_KEY has a popup.html checkbox AND popup.js SITES entry
//      (news outlets checked per-outlet via storageKeyFor)
//   6. every popup checkbox has a popup.js SITES entry and vice versa
//   7. every hostname in the module's test file that its isXHost
//      accepts is covered by a manifest content_scripts entry AND by
//      host_permissions
//   8. no host is claimed by more than one module (collision matrix)
//   9. dispatcher-paired modules expose the shortenUrl alias the
//      dynamic dispatcher requires
//
// Run: node scripts/check-wiring.js   (exits non-zero on any issue)
// Wired into pre-commit and CI.
// ----------------------------------------------------------------------------

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const issues = [];
const flag = (msg) => issues.push(msg);

// Infra files that are not per-site URL modules.
const INFRA = new Set([
  'background', 'popup', 'options', 'utm', 'utm-content', 'redirect',
  'texturl', 'social-content', 'content', 'amazon-content',
  'travel-content', 'news-content', 'site-toolbar', 'agoda-content',
  'airbnb-content', 'booking-content', 'expedia-content',
  'hotelscom-content', 'trip-content', 'vrbo-content',
  'qr', 'bulk', 'i18n',
]);

// Modules with their OWN content scripts (not social-content paired);
// they legitimately lack the shortenUrl alias.
const OWN_CONTENT_SCRIPT = new Set([
  'asin', 'agoda', 'booking', 'expedia', 'airbnb', 'trip', 'hotelscom', 'vrbo',
]);

const modules = fs.readdirSync(path.join(ROOT, 'src'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => f.slice(0, -3))
  .filter((m) => !INFRA.has(m));

// ---- Load every module + its namespace --------------------------------------
const mods = {};
for (const m of modules) {
  const src = read('src/' + m + '.js');
  const g = src.match(/global\.(\w+)LinkShortener\s*=/);
  if (!g) { flag(`src/${m}.js: no global *LinkShortener namespace`); continue; }
  mods[m] = { ns: g[1] + 'LinkShortener', api: require(path.join(ROOT, 'src', m + '.js')) };
}

// ---- 1-3. Registration lists --------------------------------------------------
const bg = read('src/background.js');
const importMatch = bg.match(/importScripts\(([\s\S]*?)\);/);
const imported = new Set([...importMatch[1].matchAll(/'([^']+)\.js'/g)].map((x) => x[1]));
const shList = [...read('package.sh').matchAll(/"src\/([a-z0-9-]+)\.js"/g)].map((x) => x[1]);
const psList = [...read('package.ps1').matchAll(/'src\/([a-z0-9-]+)\.js'/g)].map((x) => x[1]);
const hostChecks = new Map([...bg.matchAll(/\['(\w+LinkShortener)', '(\w+)'\]/g)].map((x) => [x[1], x[2]]));

if (shList.join('|') !== psList.join('|')) flag('package.sh and package.ps1 background.scripts arrays differ');

for (const m of Object.keys(mods)) {
  if (!imported.has(m)) flag(`${m}: missing from background.js importScripts`);
  if (!shList.includes(m)) flag(`${m}: missing from package.sh scripts array`);
  if (!psList.includes(m)) flag(`${m}: missing from package.ps1 scripts array`);
  if (!hostChecks.has(mods[m].ns)) flag(`${m}: missing from background.js HOST_CHECKS`);
}

// ---- 4 + 9. Shorten resolution + dispatcher alias -----------------------------
for (const [m, { ns, api }] of Object.entries(mods)) {
  const isFn = hostChecks.get(ns);
  if (isFn && typeof api[isFn] !== 'function') flag(`${m}: HOST_CHECKS names ${isFn} but module doesn't export it`);
  const shorten = api.shortenUrl || api.shortenAmazonUrl || api.shortPropertyUrl;
  if (typeof shorten !== 'function') flag(`${m}: no shorten fn resolvable by the SHORTENERS rule`);
  if (!OWN_CONTENT_SCRIPT.has(m) && typeof api.shortenUrl !== 'function') {
    flag(`${m}: dispatcher-paired but missing the shortenUrl alias (dynamic dispatcher would skip it)`);
  }
}

// ---- 5-6. Popup wiring ----------------------------------------------------------
// Site rows render lazily from the SITE_GROUPS catalog in popup.js (the
// popup HTML carries only the group shells), so the catalog IS the
// registry: every row is ['enabledKey', 'Label', 'SiteTag'].
const popupJs = read('src/popup.js');
const popupKeys = new Set([...popupJs.matchAll(/\[\s*'(enabled[A-Za-z0-9_]+)', '/g)].map((x) => x[1]));
const htmlIds = new Set([...read('src/popup.html').matchAll(/input type="checkbox" id="(enabled\w+)"/g)].map((x) => x[1]));

// Static popup.html checkboxes are feature flags only now; every per-site
// toggle must come from the catalog, and no site row may linger in HTML.
const FEATURE_FLAGS = new Set(['enabledUtmStrip', 'enabledRedirectSkip']);
for (const k of htmlIds) {
  if (!FEATURE_FLAGS.has(k)) flag(`popup.html static checkbox ${k}: site rows must live in SITE_GROUPS`);
}
for (const f of FEATURE_FLAGS) if (!htmlIds.has(f)) flag(`popup.html: feature flag ${f} checkbox missing`);
// Each group referenced by the catalog needs a .group-body shell to render into.
const groupShells = new Set([...read('src/popup.html').matchAll(/data-group="(\w+)"/g)].map((x) => x[1]));
for (const g of [...popupJs.matchAll(/^    (\w+): \[$/gm)].map((x) => x[1])) {
  if (!groupShells.has(g)) flag(`SITE_GROUPS group ${g}: no <details data-group> shell in popup.html`);
}

for (const [m, { api }] of Object.entries(mods)) {
  const key = api.STORAGE_KEY;
  if (!key) continue;
  if (m === 'news') continue; // per-outlet keys checked below
  if (!popupKeys.has(key)) flag(`${m}: STORAGE_KEY ${key} has no popup toggle`);
}
// News per-outlet keys
const newsSrc = read('src/news.js');
const outletKeys = new Set([...newsSrc.matchAll(/'(enabledNews\w+)'/g)].map((x) => x[1]));
for (const k of outletKeys) if (!popupKeys.has(k)) flag(`news outlet key ${k}: no popup toggle`);
for (const k of popupKeys) if (k.startsWith('enabledNews') && !outletKeys.has(k)) flag(`popup news key ${k}: not in news.js`);

// ---- 7-8. Host coverage + collision matrix -------------------------------------
const manifest = JSON.parse(read('manifest.json'));
function patToRe(pat) {
  const mm = pat.match(/^\*:\/\/([^/]+)\//);
  if (!mm) return null;
  const host = mm[1].replace(/\./g, '\\.').replace(/^\*\\\./, '(?:[^.]+\\.)*');
  return new RegExp('^' + host + '$', 'i');
}
const csRes = manifest.content_scripts.flatMap((e) => e.matches.map(patToRe)).filter(Boolean);
const hpRes = manifest.host_permissions.map(patToRe).filter(Boolean);

for (const [m, { api }] of Object.entries(mods)) {
  const testPath = path.join(ROOT, 'tests', m + '.test.js');
  if (!fs.existsSync(testPath)) { flag(`${m}: no test file`); continue; }
  const tsrc = fs.readFileSync(testPath, 'utf8');
  const hosts = new Set([...tsrc.matchAll(/input:\s*'https?:\/\/([^/'?#]+)/g)].map((x) => x[1].replace(/^user:pass@/, '').split(':')[0]));
  const isFn = Object.keys(api).find((k) => /^is\w+Host$/.test(k));
  if (!isFn) continue;
  for (const h of hosts) {
    if (!api[isFn](h)) continue; // negative-case host
    if (!csRes.some((re) => re.test(h))) flag(`${m}: host ${h} not covered by any content_scripts entry`);
    if (!hpRes.some((re) => re.test(h))) flag(`${m}: host ${h} not covered by host_permissions`);
    // collision matrix
    const claimers = [];
    for (const [m2, { api: api2 }] of Object.entries(mods)) {
      const f2 = Object.keys(api2).find((k) => /^is\w+Host$/.test(k));
      if (f2 && api2[f2](h)) claimers.push(m2);
    }
    if (claimers.length > 1) flag(`host ${h} claimed by multiple modules: ${claimers.join(', ')}`);
  }
}

// ---- Report ----------------------------------------------------------------------
const unique = [...new Set(issues)];
if (unique.length) {
  console.error('WIRING ISSUES (' + unique.length + '):');
  for (const i of unique) console.error('  - ' + i);
  process.exit(1);
}
// ---- i18n catalog audit -----------------------------------------------------
// Every locale must carry exactly the en key set; every key referenced from
// code (t('key'...), getMessage('key'...)) or markup (data-i18n*="key") and
// the manifest (__MSG_key__) must exist in en; placeholder counts must agree.
const localeDirs = fs.readdirSync(path.join(ROOT, '_locales'));
const en = JSON.parse(read('_locales/en/messages.json'));
const enKeys = new Set(Object.keys(en));
const maxSub = (msg) => {
  let n = 0;
  for (const m of msg.matchAll(/\$(\d)/g)) n = Math.max(n, Number(m[1]));
  return n;
};
for (const dir of localeDirs) {
  const cat = JSON.parse(read('_locales/' + dir + '/messages.json'));
  const keys = new Set(Object.keys(cat));
  for (const k of enKeys) if (!keys.has(k)) flag(`_locales/${dir}: missing key ${k}`);
  for (const k of keys) {
    if (!enKeys.has(k)) flag(`_locales/${dir}: extra key ${k}`);
    else {
      if (!cat[k].message || !cat[k].message.trim()) flag(`_locales/${dir}: empty message ${k}`);
      if (maxSub(cat[k].message || '') !== maxSub(en[k].message)) {
        flag(`_locales/${dir}: placeholder count differs for ${k}`);
      }
    }
  }
}
const refKeys = new Set();
for (const f of fs.readdirSync(path.join(ROOT, 'src'))) {
  const src = read('src/' + f);
  for (const m of src.matchAll(/\bt\(\s*'([A-Za-z0-9_]+)'/g)) refKeys.add(m[1]);
  for (const m of src.matchAll(/i18nKey: '([A-Za-z0-9_]+)'/g)) refKeys.add(m[1]);
  for (const m of src.matchAll(/getMessage\(\s*'([A-Za-z0-9_]+)'/g)) refKeys.add(m[1]);
  for (const m of src.matchAll(/data-i18n(?:-placeholder|-title|-html|-tip)?="([A-Za-z0-9_]+)"/g)) refKeys.add(m[1]);
}
for (const m of read('manifest.json').matchAll(/__MSG_([A-Za-z0-9_]+)__/g)) refKeys.add(m[1]);
for (const k of refKeys) if (!enKeys.has(k)) flag(`i18n: referenced key ${k} missing from _locales/en`);
for (const k of enKeys) if (!refKeys.has(k)) flag(`i18n: en key ${k} is referenced nowhere`);

if (issues.length) {
  console.error('wiring problems:');
  for (const i of issues) console.error('  - ' + i);
  process.exit(1);
}

console.log('wiring OK: ' + Object.keys(mods).length + ' modules x 9 surfaces, '
  + popupKeys.size + ' popup toggles, ' + manifest.host_permissions.length + ' host permissions, '
  + localeDirs.length + ' locales');
