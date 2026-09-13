// Unit tests for src/dnr.js — runnable with plain Node, no dependencies.
//
// Usage: node tests/dnr.test.js

const path = require('path');
const {
  ACTIVE_RULE_ID,
  PREFIX_EXPANSIONS,
  normalizeSkipDomains,
  buildRemoveParams,
  buildRules,
  diffRemovedParams,
} = require(path.join('..', 'src', 'dnr.js'));
const utm = require(path.join('..', 'src', 'utm.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed++;
  else { failed++; failures.push({ label, actual: a, expected: e }); }
}

// ---- prefix parity with utm.js ---------------------------------------------
// Every prefix family utm.js strips must have an enumerated expansion here;
// otherwise adding a prefix to utm.js silently narrows active-strip coverage.
for (const prefix of utm.TRACKING_PARAM_PREFIXES) {
  check('parity - utm.js prefix "' + prefix + '" has an expansion',
    Array.isArray(PREFIX_EXPANSIONS[prefix]) && PREFIX_EXPANSIONS[prefix].length > 0, true);
  // and every enumerated name actually starts with its family prefix
  if (Array.isArray(PREFIX_EXPANSIONS[prefix])) {
    check('parity - "' + prefix + '" expansions all match prefix',
      PREFIX_EXPANSIONS[prefix].every((p) => p.startsWith(prefix)), true);
  }
}

// ---- buildRemoveParams ------------------------------------------------------
const rp = buildRemoveParams(['gclid', 'FBCLID', 'gclid'], []);
check('exact names lowercased + deduped',
  rp.filter((p) => p === 'gclid' || p === 'fbclid').sort(), ['fbclid', 'gclid']);
check('prefix expansions included', rp.includes('utm_source') && rp.includes('hsa_cam'), true);
check('keep list removes exact name',
  buildRemoveParams(['gclid', 'fbclid'], ['GCLID']).includes('gclid'), false);
check('keep list removes expanded prefix name',
  buildRemoveParams(['gclid'], ['utm_campaign']).includes('utm_campaign'), false);
check('keep list leaves siblings alone',
  buildRemoveParams(['gclid'], ['utm_campaign']).includes('utm_source'), true);

// ---- normalizeSkipDomains ---------------------------------------------------
check('skip: lowercase + leading dot stripped',
  normalizeSkipDomains(['.Example.COM']), ['example.com']);
check('skip: dedupe', normalizeSkipDomains(['a.com', '.a.com', 'a.com']), ['a.com']);
check('skip: invalid entries dropped',
  normalizeSkipDomains(['not a domain', '', 'localhost', 'ok.org']), ['ok.org']);
check('skip: non-array tolerated', normalizeSkipDomains(null), []);

// ---- buildRules -------------------------------------------------------------
const rules = buildRules({
  params: Array.from(utm.TRACKING_PARAMS),
  keepParams: [],
  skipDomains: ['.corp.example.com'],
});
check('one rule', rules.length, 1);
check('rule id', rules[0].id, ACTIVE_RULE_ID);
check('redirect transform action', rules[0].action.type, 'redirect');
check('main_frame only', rules[0].condition.resourceTypes, ['main_frame']);
check('skip domains wired',
  rules[0].condition.excludedRequestDomains, ['corp.example.com']);
check('real denylist size lands in rule',
  rules[0].action.redirect.transform.queryTransform.removeParams.length > 90, true);
// v1.13 universal promotions flow through from utm.js automatically
check('mibextid flows into the rule',
  rules[0].action.redirect.transform.queryTransform.removeParams.includes('mibextid'), true);
check('sfnsn flows into the rule',
  rules[0].action.redirect.transform.queryTransform.removeParams.includes('sfnsn'), true);
const noSkip = buildRules({ params: ['gclid'], keepParams: [], skipDomains: [] });
check('no skip list -> no excludedRequestDomains key',
  'excludedRequestDomains' in noSkip[0].condition, false);
check('everything kept -> no rules',
  buildRules({ params: ['gclid'], keepParams: ['gclid', ...Object.values(PREFIX_EXPANSIONS).flat()] }),
  []);

// ---- diffRemovedParams ------------------------------------------------------
const SET = new Set(['utm_source', 'utm_medium', 'gclid', 'fbclid']);
check('pure removal counted',
  diffRemovedParams('https://a.com/p?id=1&utm_source=x&gclid=y', 'https://a.com/p?id=1', SET), 2);
check('nothing removed -> 0',
  diffRemovedParams('https://a.com/p?id=1', 'https://a.com/p?id=1', SET), 0);
check('non-ours removal -> -1',
  diffRemovedParams('https://a.com/p?id=1&sess=9', 'https://a.com/p', SET), -1);
check('mixed ours+non-ours removal -> -1',
  diffRemovedParams('https://a.com/p?gclid=y&sess=9', 'https://a.com/p', SET), -1);
check('value changed -> -1',
  diffRemovedParams('https://a.com/p?id=1&gclid=y', 'https://a.com/p?id=2', SET), -1);
check('param added -> -1',
  diffRemovedParams('https://a.com/p?gclid=y', 'https://a.com/p?new=1', SET), -1);
check('different path -> -1',
  diffRemovedParams('https://a.com/p?gclid=y', 'https://a.com/q', SET), -1);
check('different origin -> -1',
  diffRemovedParams('https://a.com/p?gclid=y', 'https://b.com/p', SET), -1);
check('hash mismatch -> -1',
  diffRemovedParams('https://a.com/p?gclid=y#x', 'https://a.com/p#y', SET), -1);
check('hash preserved ok',
  diffRemovedParams('https://a.com/p?gclid=y#x', 'https://a.com/p#x', SET), 1);
check('repeated removed param counts occurrences',
  diffRemovedParams('https://a.com/p?utm_source=a&utm_source=b&id=1', 'https://a.com/p?id=1', SET), 2);
check('repeated kept param must survive with multiplicity',
  diffRemovedParams('https://a.com/p?id=1&id=1&gclid=y', 'https://a.com/p?id=1', SET), -1);
check('garbage input -> -1', diffRemovedParams('not a url', 'https://a.com/p', SET), -1);
check('array works as removeSet',
  diffRemovedParams('https://a.com/p?gclid=y', 'https://a.com/p', ['gclid']), 1);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log('  - ' + f.label);
    console.log('      expected: ' + f.expected);
    console.log('      actual:   ' + f.actual);
  }
  process.exit(1);
}
