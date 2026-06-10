// Unit tests for src/utm.js — runnable with plain Node, no dependencies.
//
// Usage: node tests/utm.test.js

const path = require('path');
const {
  stripTrackingParams,
  needsStripping,
  isTrackingParam,
} = require(path.join('..', 'src', 'utm.js'));

const CASES = [
  // ----- utm_* family
  { name: 'utm_source stripped',
    input: 'https://example.com/article?utm_source=newsletter',
    expected: 'https://example.com/article' },
  { name: 'utm_source+medium+campaign stripped together',
    input: 'https://example.com/article?utm_source=newsletter&utm_medium=email&utm_campaign=spring2026',
    expected: 'https://example.com/article' },
  { name: 'utm_* prefix catches obscure variants',
    input: 'https://example.com/article?utm_brand=acme&utm_random_thing=xyz',
    expected: 'https://example.com/article' },
  { name: 'utm mixed with functional params: only utm stripped',
    input: 'https://example.com/article?page=2&utm_source=foo&id=123',
    expected: 'https://example.com/article?page=2&id=123' },
  { name: 'utm preserves hash',
    input: 'https://example.com/article?utm_source=foo#section',
    expected: 'https://example.com/article#section' },

  // ----- Google Ads
  { name: 'gclid stripped',
    input: 'https://example.com/buy?gclid=abc123',
    expected: 'https://example.com/buy' },
  { name: 'gbraid + wbraid (newer Google identifiers)',
    input: 'https://example.com/?gbraid=foo&wbraid=bar',
    expected: 'https://example.com/' },
  { name: 'dclid (DoubleClick)',
    input: 'https://example.com/?dclid=xyz',
    expected: 'https://example.com/' },

  // ----- Facebook
  { name: 'fbclid stripped',
    input: 'https://example.com/article?fbclid=IwAR_long_blob',
    expected: 'https://example.com/article' },
  { name: '_fbc and _fbp stripped',
    input: 'https://example.com/?_fbc=fb.1.123&_fbp=fb.1.456',
    expected: 'https://example.com/' },

  // ----- Instagram
  { name: 'igshid stripped',
    input: 'https://example.com/?igshid=MTc0NDU0NjE',
    expected: 'https://example.com/' },
  { name: 'igsh + ig_rid stripped',
    input: 'https://example.com/?igsh=ABC&ig_rid=12345',
    expected: 'https://example.com/' },

  // ----- Email service providers
  { name: 'MailChimp mc_cid + mc_eid',
    input: 'https://example.com/post?mc_cid=abc&mc_eid=xyz',
    expected: 'https://example.com/post' },
  { name: 'Marketo mkt_tok',
    input: 'https://example.com/?mkt_tok=eyJpIjoiTl',
    expected: 'https://example.com/' },
  { name: 'MailerLite ml_subscriber + hash',
    input: 'https://example.com/?ml_subscriber=12345&ml_subscriber_hash=abc',
    expected: 'https://example.com/' },
  { name: 'Klaviyo _kx',
    input: 'https://example.com/?_kx=abc.123',
    expected: 'https://example.com/' },

  // ----- HubSpot
  { name: 'HubSpot _hsenc + _hsmi',
    input: 'https://example.com/?_hsenc=p2ANqtz&_hsmi=12345',
    expected: 'https://example.com/' },
  { name: 'HubSpot tracking cookies __hssc + __hstc',
    input: 'https://example.com/?__hssc=abc&__hstc=def&__hsfp=ghi',
    expected: 'https://example.com/' },
  { name: 'HubSpot hsa_* ad-attribution prefix family',
    input: 'https://example.com/?hsa_acc=123&hsa_cam=456&hsa_grp=789&hsa_kw=foo',
    expected: 'https://example.com/' },

  // ----- Microsoft Ads, Yandex
  { name: 'msclkid (Microsoft Ads)',
    input: 'https://example.com/?msclkid=abc123',
    expected: 'https://example.com/' },
  { name: 'yclid + ymclid (Yandex)',
    input: 'https://example.com/?yclid=12345&ymclid=67890',
    expected: 'https://example.com/' },

  // ----- Piwik / Matomo
  { name: 'pk_campaign + pk_kwd prefix family',
    input: 'https://example.com/?pk_campaign=spring&pk_kwd=mug&pk_source=email',
    expected: 'https://example.com/' },
  { name: 'piwik_campaign + piwik_kwd prefix family',
    input: 'https://example.com/?piwik_campaign=spring&piwik_kwd=mug',
    expected: 'https://example.com/' },

  // ----- Adobe
  { name: 's_kwcid + ef_id',
    input: 'https://example.com/?s_kwcid=foo&ef_id=bar',
    expected: 'https://example.com/' },
  { name: 'at_medium + at_campaign (Adobe Target)',
    input: 'https://example.com/?at_medium=email&at_campaign=spring',
    expected: 'https://example.com/' },

  // ----- Vero, Wicked, Omeda, Impact, Webtrends
  { name: 'vero_id + vero_conv',
    input: 'https://example.com/?vero_id=abc&vero_conv=def',
    expected: 'https://example.com/' },
  { name: 'wicked* family',
    input: 'https://example.com/?wickedid=123&wickedsource=email&wickedlocation=top',
    expected: 'https://example.com/' },
  { name: 'oly_anon_id + oly_enc_id (Omeda)',
    input: 'https://example.com/?oly_anon_id=12345&oly_enc_id=67890',
    expected: 'https://example.com/' },
  { name: 'irclickid + irgwc (Impact)',
    input: 'https://example.com/?irclickid=abc&irgwc=1',
    expected: 'https://example.com/' },
  { name: 'WT.mc_id (Webtrends)',
    input: 'https://example.com/?WT.mc_id=email&WT.tsrc=newsletter',
    expected: 'https://example.com/' },

  // ----- Mixed messy real-world cases
  { name: 'real-world: news article with many trackers',
    input: 'https://www.example-news.com/2026/05/some-article?utm_source=newsletter&utm_medium=email&utm_campaign=morning&utm_content=lead&fbclid=IwAR_blob&mc_cid=abc',
    expected: 'https://www.example-news.com/2026/05/some-article' },
  { name: 'real-world: Google search result click with gclid + utm',
    input: 'https://shop.example.com/product?id=123&color=blue&utm_source=google&utm_medium=cpc&gclid=Cj0KCQ',
    expected: 'https://shop.example.com/product?id=123&color=blue' },
  { name: 'real-world: preserves order of remaining params',
    input: 'https://example.com/?a=1&utm_source=foo&b=2&utm_medium=bar&c=3',
    expected: 'https://example.com/?a=1&b=2&c=3' },

  // ----- Case-insensitive matching of param names
  { name: 'UPPERCASE UTM_SOURCE stripped',
    input: 'https://example.com/?UTM_SOURCE=foo',
    expected: 'https://example.com/' },
  { name: 'MixedCase Utm_Medium stripped',
    input: 'https://example.com/?Utm_Medium=email&id=123',
    expected: 'https://example.com/?id=123' },
  { name: 'UPPERCASE FBCLID stripped',
    input: 'https://example.com/?FBCLID=abc',
    expected: 'https://example.com/' },

  // ----- Non-tracking params left alone
  { name: 'no-op: only functional params',
    input: 'https://example.com/search?q=hello&page=2',
    expected: 'https://example.com/search?q=hello&page=2' },
  { name: 'no-op: no query string',
    input: 'https://example.com/about',
    expected: 'https://example.com/about' },
  { name: 'no-op: bare host',
    input: 'https://example.com/',
    expected: 'https://example.com/' },
  { name: 'no-op preserves hash',
    input: 'https://example.com/article#section',
    expected: 'https://example.com/article#section' },
  { name: 'no-op: generic params q/s/id/v/ref are kept (too generic)',
    input: 'https://example.com/?q=hello&s=blob&id=12&v=ABC&ref=share&t=42',
    expected: 'https://example.com/?q=hello&s=blob&id=12&v=ABC&ref=share&t=42' },

  // ----- Edge cases
  { name: 'empty utm_source value still stripped',
    input: 'https://example.com/?utm_source=&id=123',
    expected: 'https://example.com/?id=123' },
  { name: 'URL-encoded tracking value still stripped',
    input: 'https://example.com/?utm_source=hello%20world&id=1',
    expected: 'https://example.com/?id=1' },
  { name: 'multiple utm_source values both removed',
    input: 'https://example.com/?utm_source=a&utm_source=b&id=1',
    expected: 'https://example.com/?id=1' },
  { name: 'tracking-param ONLY: query string vanishes',
    input: 'https://example.com/article?utm_source=foo&fbclid=bar',
    expected: 'https://example.com/article' },
  { name: 'hash with no query',
    input: 'https://example.com/#section',
    expected: 'https://example.com/#section' },
  { name: 'tracking strips to bare URL plus hash',
    input: 'https://example.com/?utm_source=foo#section',
    expected: 'https://example.com/#section' },

  // ----- Protocols
  { name: 'http URLs work',
    input: 'http://example.com/?utm_source=foo',
    expected: 'http://example.com/' },
  { name: 'non-http protocols ignored (file://)',
    input: 'file:///tmp/foo.html?utm_source=x',
    expected: 'file:///tmp/foo.html?utm_source=x' },

  // ----- Polish-round additions: ports, IDN, hash-as-query, userinfo, subdomains
  { name: 'custom port preserved when stripping',
    input: 'https://example.com:8443/path?utm_source=foo&keep=1',
    expected: 'https://example.com:8443/path?keep=1' },
  { name: 'custom port preserved when stripping to bare',
    input: 'https://example.com:8443/path?utm_source=foo',
    expected: 'https://example.com:8443/path' },
  { name: 'IDN (punycode) host preserved',
    input: 'https://xn--bcher-kva.example/?utm_source=foo&id=1',
    expected: 'https://xn--bcher-kva.example/?id=1' },
  { name: 'IDN host no-op',
    input: 'https://xn--bcher-kva.example/?id=1',
    expected: 'https://xn--bcher-kva.example/?id=1' },
  // Hash-routed SPAs: tracking-shaped params INSIDE the hash are app state,
  // not URL query — we leave them alone. Real query trackers alongside a
  // hash route still get stripped.
  { name: 'hash route with tracking-shaped params left untouched',
    input: 'https://example.com/app#/page?utm_source=foo',
    expected: 'https://example.com/app#/page?utm_source=foo' },
  { name: 'real query tracker stripped, hash route preserved',
    input: 'https://example.com/app?utm_source=foo#/page?utm_source=bar',
    expected: 'https://example.com/app#/page?utm_source=bar' },
  // userinfo in URL — rare but URL parser handles it. We don't touch it.
  { name: 'userinfo preserved when stripping query',
    input: 'https://user:pass@example.com/?utm_source=foo&id=1',
    expected: 'https://user:pass@example.com/?id=1' },
  // Subdomains
  { name: 'arbitrary subdomain works',
    input: 'https://blog.example.com/post?utm_source=email',
    expected: 'https://blog.example.com/post' },

  // ----- v1.7.0 expanded tracker list
  // Google
  { name: 'gad_source + gad stripped',
    input: 'https://example.com/?gad_source=1&gad=abc&id=1',
    expected: 'https://example.com/?id=1' },
  // Facebook action params
  { name: 'fb_action_ids + fb_action_types + fb_ref + fb_source',
    input: 'https://example.com/?fb_action_ids=10&fb_action_types=share&fb_ref=top&fb_source=other',
    expected: 'https://example.com/' },
  // Microsoft Clarity
  { name: 'msockid (Bing Clarity) stripped',
    input: 'https://example.com/?msockid=abc&id=1',
    expected: 'https://example.com/?id=1' },
  // TikTok Ads
  { name: 'ttclid (TikTok Ads) stripped',
    input: 'https://example.com/buy?ttclid=abc123',
    expected: 'https://example.com/buy' },
  // LinkedIn
  { name: 'li_fat_id + trk + trkCampaign (LinkedIn)',
    input: 'https://example.com/?li_fat_id=abc&trk=public_post&trkCampaign=spring',
    expected: 'https://example.com/' },
  // Pinterest
  { name: 'epik (Pinterest) stripped',
    input: 'https://example.com/?epik=long_blob_token',
    expected: 'https://example.com/' },
  // Snapchat
  { name: 'ScCid (Snapchat) stripped',
    input: 'https://example.com/?ScCid=abc&id=1',
    expected: 'https://example.com/?id=1' },
  // Reddit Ads
  { name: 'rdt_cid (Reddit Ads) stripped',
    input: 'https://example.com/?rdt_cid=abc&id=1',
    expected: 'https://example.com/?id=1' },
  // Branch.io
  { name: '_branch_match_id + _branch_referrer',
    input: 'https://example.com/?_branch_match_id=12345&_branch_referrer=ABC',
    expected: 'https://example.com/' },
  // Klaviyo email open
  { name: '_ke (Klaviyo) stripped',
    input: 'https://example.com/?_ke=encrypted_email_blob&id=1',
    expected: 'https://example.com/?id=1' },
  // Bronto
  { name: '_bta_tid + _bta_c (Bronto)',
    input: 'https://example.com/?_bta_tid=123&_bta_c=abc',
    expected: 'https://example.com/' },
  // ConvertKit
  { name: 'ck_subscriber_id stripped',
    input: 'https://example.com/?ck_subscriber_id=12345',
    expected: 'https://example.com/' },
  // Drip
  { name: '__s (Drip) stripped',
    input: 'https://example.com/?__s=abc.def&id=1',
    expected: 'https://example.com/?id=1' },
  // ExactTarget / SFMC
  { name: 'et_cid + et_rid (ExactTarget)',
    input: 'https://example.com/?et_cid=123&et_rid=456&id=1',
    expected: 'https://example.com/?id=1' },
  // Affiliate networks
  { name: 'sscid (ShareASale) stripped',
    input: 'https://example.com/?sscid=abc123',
    expected: 'https://example.com/' },
  { name: 'awc (AWIN) stripped',
    input: 'https://example.com/?awc=12345_abc',
    expected: 'https://example.com/' },
  { name: 'rfsn (Refersion) stripped',
    input: 'https://example.com/?rfsn=abc.def',
    expected: 'https://example.com/' },
  { name: 'tduid (TradeDoubler) stripped',
    input: 'https://example.com/?tduid=abc',
    expected: 'https://example.com/' },
  { name: 'Rakuten ranEAID + ranMID + ranSiteID (case-insensitive)',
    input: 'https://example.com/?ranEAID=abc&ranMID=def&ranSiteID=ghi&id=1',
    expected: 'https://example.com/?id=1' },
  // Matomo modern
  { name: 'mtm_campaign + mtm_keyword (Matomo modern prefix)',
    input: 'https://example.com/?mtm_campaign=spring&mtm_keyword=mug&id=1',
    expected: 'https://example.com/?id=1' },
  { name: 'matomo_campaign + matomo_source (Matomo alt prefix)',
    input: 'https://example.com/?matomo_campaign=spring&matomo_source=email',
    expected: 'https://example.com/' },
  // Blueshift / SFMC
  { name: '_bsft_aaid + _bsft_eid prefix (Blueshift)',
    input: 'https://example.com/?_bsft_aaid=abc&_bsft_eid=def&_bsft_mid=ghi',
    expected: 'https://example.com/' },
  // Iterable
  { name: 'iterable_campaign + iterable_template_id prefix',
    input: 'https://example.com/?iterable_campaign=123&iterable_template_id=456',
    expected: 'https://example.com/' },
  // Mailgun
  { name: 'mailgun_eid + mailgun_url prefix',
    input: 'https://example.com/?mailgun_eid=abc&mailgun_url=def',
    expected: 'https://example.com/' },

  // Real-world combo from the new list
  { name: 'real-world: TikTok ad landing page',
    input: 'https://shop.example.com/product?id=42&ttclid=abc&utm_source=tiktok&utm_medium=cpc',
    expected: 'https://shop.example.com/product?id=42' },
  { name: 'real-world: LinkedIn share with tracking',
    input: 'https://example.com/blog/post?trk=public_post-feed-share&li_fat_id=abc&id=1',
    expected: 'https://example.com/blog/post?id=1' },
  { name: 'real-world: affiliate-network click-through',
    input: 'https://store.example.com/?rfsn=12345.abc&sscid=def&utm_source=affiliate&pid=99',
    expected: 'https://store.example.com/?pid=99' },
];

let passed = 0;
let failed = 0;
const failures = [];

function check(label, actual, expected) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    failures.push({ label, actual, expected });
  }
}

for (const c of CASES) {
  const got = stripTrackingParams(c.input);
  check('strip - ' + c.name, got, c.expected);
  const expectedNeeds = c.input !== c.expected;
  check('needs - ' + c.name, needsStripping(c.input), expectedNeeds);
}

// isTrackingParam unit checks
check('isTrackingParam: utm_source true', isTrackingParam('utm_source'), true);
check('isTrackingParam: UTM_SOURCE true (case-insensitive)', isTrackingParam('UTM_SOURCE'), true);
check('isTrackingParam: gclid true', isTrackingParam('gclid'), true);
check('isTrackingParam: pk_campaign true (prefix)', isTrackingParam('pk_campaign'), true);
check('isTrackingParam: hsa_acc true (prefix)', isTrackingParam('hsa_acc'), true);
check('isTrackingParam: mtm_kwd true (Matomo modern prefix)', isTrackingParam('mtm_kwd'), true);
check('isTrackingParam: _bsft_eid true (Blueshift prefix)', isTrackingParam('_bsft_eid'), true);
check('isTrackingParam: iterable_campaign true (Iterable prefix)', isTrackingParam('iterable_campaign'), true);
check('isTrackingParam: ttclid true', isTrackingParam('ttclid'), true);
check('isTrackingParam: li_fat_id true', isTrackingParam('li_fat_id'), true);
check('isTrackingParam: epik true', isTrackingParam('epik'), true);
check('isTrackingParam: id false', isTrackingParam('id'), false);
check('isTrackingParam: q false', isTrackingParam('q'), false);
check('isTrackingParam: ref false', isTrackingParam('ref'), false);
check('isTrackingParam: empty false', isTrackingParam(''), false);
check('isTrackingParam: null false', isTrackingParam(null), false);


// ---------- keepParams option tests
check('keepParams: utm_source kept when in keep list',
  stripTrackingParams('https://example.com/?utm_source=foo&id=1', { keepParams: ['utm_source'] }),
  'https://example.com/?utm_source=foo&id=1');
check('keepParams: case-insensitive keep',
  stripTrackingParams('https://example.com/?UTM_SOURCE=foo&id=1', { keepParams: ['utm_source'] }),
  'https://example.com/?UTM_SOURCE=foo&id=1');
check('keepParams: keep one, strip others',
  stripTrackingParams('https://example.com/?utm_source=foo&utm_medium=email&id=1', { keepParams: ['utm_source'] }),
  'https://example.com/?utm_source=foo&id=1');
check('keepParams: empty list = default behavior',
  stripTrackingParams('https://example.com/?utm_source=foo&id=1', { keepParams: [] }),
  'https://example.com/?id=1');
check('keepParams: undefined options = default behavior',
  stripTrackingParams('https://example.com/?utm_source=foo&id=1'),
  'https://example.com/?id=1');
check('keepParams: needsStripping respects keep list (returns false)',
  needsStripping('https://example.com/?utm_source=foo', { keepParams: ['utm_source'] }),
  false);
check('keepParams: needsStripping with partial keep (returns true for the unkept one)',
  needsStripping('https://example.com/?utm_source=foo&utm_medium=email', { keepParams: ['utm_source'] }),
  true);
check('isTrackingParam: utm_source false when in keep set',
  isTrackingParam('utm_source', new Set(['utm_source'])),
  false);
check('isTrackingParam: utm_medium true when only utm_source in keep set',
  isTrackingParam('utm_medium', new Set(['utm_source'])),
  true);

// Garbage inputs
check('strip on garbage string returns input unchanged', stripTrackingParams('not a url'), 'not a url');
check('needs on garbage string', needsStripping('not a url'), false);

console.log('\n' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
if (failed > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log('  - ' + f.label);
    console.log('      expected: ' + JSON.stringify(f.expected));
    console.log('      actual:   ' + JSON.stringify(f.actual));
  }
  process.exit(1);
}
