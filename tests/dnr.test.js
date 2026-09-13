// Unit tests for src/dnr.js — runnable with plain Node, no dependencies.
//
// Usage: node tests/dnr.test.js

const path = require('path');
const dnr = require(path.join('..', 'src', 'dnr.js'));
const {
  ACTIVE_RULE_ID,
  PREFIX_EXPANSIONS,
  normalizeSkipDomains,
  buildRemoveParams,
  buildRules,
  diffRemovedParams,
} = dnr;
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

// ---- buildSkipRules (v1.13 active redirect skip) ----------------------------
const {
  SKIP_RULE_IDS, buildSkipRules, skipRuleWouldMatch, skipRuleTarget,
  PAUSE_RULE_ID, buildPauseRules,
} = dnr;
const unwrap = require('../src/redirect.js').unwrapRedirects;

const skipRules = buildSkipRules({ skipDomains: [] });
check('skip: one rule per family', skipRules.length, SKIP_RULE_IDS.length);
check('skip: ids stable and unique', new Set(skipRules.map((r) => r.id)).size, SKIP_RULE_IDS.length);
check('skip: all ids >= 900101', skipRules.every((r) => r.id >= 900101 && r.id < 920000), true);
check('skip: no collision with active-strip id', skipRules.some((r) => r.id === ACTIVE_RULE_ID), false);
check('skip: main_frame only', skipRules.every((r) => JSON.stringify(r.condition.resourceTypes) === '["main_frame"]'), true);
check('skip: regexSubstitution \\1', skipRules.every((r) => r.action.redirect.regexSubstitution === '\\1'), true);
check('skip: no excludedRequestDomains when list empty',
  skipRules.some((r) => 'excludedRequestDomains' in r.condition), false);
const skipRulesEx = buildSkipRules({ skipDomains: ['.Corp.Example.com'] });
check('skip: skip domains wired on every rule',
  skipRulesEx.every((r) => JSON.stringify(r.condition.excludedRequestDomains) === '["corp.example.com"]'), true);
check('skip: regexFilter under the 2KB limit', skipRules.every((r) => r.condition.regexFilter.length < 2048), true);

// Fast-path positives: raw targets redirect, and the regex capture is
// byte-identical to what the tab-layer unwrapper would produce.
const RAW_CASES = [
  ['google /url q=', 'https://www.google.com/url?q=https://example.com/article&sa=t&ved=abc123', 'https://example.com/article'],
  ['google /url url=', 'https://google.com/url?url=https://example.com/x', 'https://example.com/x'],
  ['l.facebook l.php', 'https://l.facebook.com/l.php?u=https://news.example.com/story&h=AT0abc', 'https://news.example.com/story'],
  ['lm.facebook l.php', 'https://lm.facebook.com/l.php?u=https://news.example.com/story', 'https://news.example.com/story'],
  ['l.messenger l.php', 'https://l.messenger.com/l.php?u=https://ex.com/p', 'https://ex.com/p'],
  ['l.instagram', 'https://l.instagram.com/?u=https://shop.example.com/item&e=AT1x', 'https://shop.example.com/item'],
  ['out.reddit', 'https://out.reddit.com/?url=https://blog.example.com/post&token=abc', 'https://blog.example.com/post'],
  ['youtube /redirect', 'https://www.youtube.com/redirect?event=video_description&q=https://example.com/tool', 'https://example.com/tool'],
  ['m.youtube /redirect', 'https://m.youtube.com/redirect?q=https://example.com/tool', 'https://example.com/tool'],
  ['steam linkfilter', 'https://steamcommunity.com/linkfilter/?u=https://example.com/mod', 'https://example.com/mod'],
  ['t.umblr redirect', 'https://t.umblr.com/redirect?z=https://example.com/art&t=sig', 'https://example.com/art'],
  ['href.li raw (keeps its own query)', 'https://href.li/?https://example.com/page?a=1&b=2', 'https://example.com/page?a=1&b=2'],
  ['skimlinks redirectingat', 'https://go.redirectingat.com/?id=123X456&url=https://store.example.com/deal', 'https://store.example.com/deal'],
  ['skimresources', 'https://go.skimresources.com/?id=1&url=https://store.example.com/deal', 'https://store.example.com/deal'],
  ['slack-redir', 'https://slack-redir.net/link?url=https://docs.example.com/page', 'https://docs.example.com/page'],
  ['exit.sc', 'https://exit.sc/?url=https://artist.example.com/track', 'https://artist.example.com/track'],
  ['vk away', 'https://vk.com/away.php?to=https://example.com/x&post=1', 'https://example.com/x'],
  ['vk away modern', 'https://vk.com/away?to=https://example.com/x', 'https://example.com/x'],
  ['pixiv jump url=', 'https://www.pixiv.net/jump.php?url=https://artist.example.com/gallery', 'https://artist.example.com/gallery'],
  ['pixiv jump raw', 'https://www.pixiv.net/jump.php?https://artist.example.com/gallery', 'https://artist.example.com/gallery'],
  ['deviantart outgoing', 'https://www.deviantart.com/users/outgoing?https://example.com/portfolio', 'https://example.com/portfolio'],
];
for (const [name, wrapped, want] of RAW_CASES) {
  check('skip match - ' + name, skipRuleWouldMatch(wrapped), true);
  check('skip target - ' + name, skipRuleTarget(wrapped), want);
}
// Byte-identical with the tab-layer unwrapper wherever it recognizes the
// wrapper (unwrap also strips further; equality proves the fast path never
// diverges — for these single-hop cases both produce the same URL).
for (const [name, wrapped, want] of RAW_CASES) {
  const u = unwrap(wrapped);
  if (u !== wrapped) {
    check('skip parity with unwrapper - ' + name, u, want);
  }
}

// Encoded or unsafe targets must NOT match — they fall to the tab layer.
const NO_MATCH = [
  ['google encoded scheme', 'https://www.google.com/url?q=https%3A%2F%2Fexample.com%2Fpage'],
  ['facebook encoded', 'https://l.facebook.com/l.php?u=https%3A%2F%2Fnews.example.com%2Fstory&h=AT0'],
  ['percent inside target', 'https://out.reddit.com/?url=https://example.com/a%20b'],
  ['pixiv raw with &', 'https://www.pixiv.net/jump.php?https://a.com/x&y=1'],
  ['bing ck base64', 'https://www.bing.com/ck/a?!&&p=abc&u=a1aHR0cHM6Ly9leGFtcGxlLmNvbQ'],
  ['duckduckgo uddg', 'https://duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2F&rut=abc'],
  ['relative target', 'https://www.youtube.com/redirect?q=/watch?v=abc'],
  ['non-http target', 'https://l.facebook.com/l.php?u=javascript:alert(1)'],
  ['SafeLinks NEVER', 'https://nam12.safelinks.protection.outlook.com/?url=https://example.com/doc&data=05'],
  ['Proofpoint v2 NEVER', 'https://urldefense.proofpoint.com/v2/url?u=https-3A__example.com&d=Dw'],
  ['Proofpoint v3 NEVER', 'https://urldefense.com/v3/__https://example.com__;!!abc!def$'],
  ['Barracuda NEVER', 'https://linkprotect.cudasvc.com/url?a=https://example.com&c=E,1,x'],
  ['google ad click NEVER', 'https://www.googleadservices.com/pagead/aclk?sa=L&adurl=https://store.example.com'],
  ['amp viewer NEVER (path surgery)', 'https://www.google.com/amp/s/example.com/story'],
  ['unrelated site with q=', 'https://search.example.com/url?q=https://example.com/'],
];
for (const [name, url] of NO_MATCH) {
  check('skip no-match - ' + name, skipRuleWouldMatch(url), false);
}

// Truncation parity: for ?param= families the capture stops at '&', exactly
// where the wrapper's own parser stops.
check('skip truncation matches wrapper parsing',
  skipRuleTarget('https://www.google.com/url?q=https://example.com/a&b=2'),
  'https://example.com/a');

// ---- buildPauseRules ---------------------------------------------------------
check('pause: empty -> no rules', buildPauseRules([]), []);
check('pause: null -> no rules', buildPauseRules(null), []);
const pr = buildPauseRules([5, 5, 9, -1, 'x']);
check('pause: one rule', pr.length, 1);
check('pause: id', pr[0].id, PAUSE_RULE_ID);
check('pause: allow action', pr[0].action.type, 'allow');
check('pause: priority beats redirects', pr[0].priority > 1, true);
check('pause: tabIds deduped and sanitized', pr[0].condition.tabIds, [5, 9]);
check('pause: main_frame only', pr[0].condition.resourceTypes, ['main_frame']);
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
