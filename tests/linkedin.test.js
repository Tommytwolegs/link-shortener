const path = require('path');
const {
  shortenLinkedinUrl,
  needsShortening,
  isLinkedinHost,
  isPostUrl,
} = require(path.join('..', 'src', 'linkedin.js'));

const CASES = [
  // /jobs/search/ — functional search state kept, tracking stripped
  { name: 'jobs search: functional params kept, tracking stripped',
    input: 'https://www.linkedin.com/jobs/search/?currentJobId=3987654321&keywords=software%20engineer&geoId=103644278&refId=abc&trackingId=def&origin=JOB_SEARCH_PAGE',
    expected: 'https://www.linkedin.com/jobs/search/?currentJobId=3987654321&keywords=software+engineer&geoId=103644278' },
  { name: 'jobs search: f_TPR + distance kept',
    input: 'https://www.linkedin.com/jobs/search/?keywords=designer&f_TPR=r86400&distance=25&trk=jobs_jserp',
    expected: 'https://www.linkedin.com/jobs/search/?keywords=designer&f_TPR=r86400&distance=25' },
  { name: 'jobs search already clean',
    input: 'https://www.linkedin.com/jobs/search/?keywords=designer',
    expected: 'https://www.linkedin.com/jobs/search/?keywords=designer',
    expectedNeeds: false },
  // /posts/
  { name: 'posts: tracking stripped',
    input: 'https://www.linkedin.com/posts/jane-doe_some-title-activity-7187234567890123456-AbCd?utm_source=share&utm_medium=member_desktop',
    expected: 'https://www.linkedin.com/posts/jane-doe_some-title-activity-7187234567890123456-AbCd' },
  { name: 'posts: trackingId stripped',
    input: 'https://www.linkedin.com/posts/jane-doe_post-activity-7187234567890123456-AbCd?trackingId=foo&refId=bar',
    expected: 'https://www.linkedin.com/posts/jane-doe_post-activity-7187234567890123456-AbCd' },
  { name: 'posts: already clean',
    input: 'https://www.linkedin.com/posts/jane-doe_post-activity-7187234567890123456-AbCd',
    expected: 'https://www.linkedin.com/posts/jane-doe_post-activity-7187234567890123456-AbCd',
    expectedNeeds: false },
  { name: 'posts: hash preserved',
    input: 'https://www.linkedin.com/posts/jane-doe_post-activity-7187234567890123456-AbCd?trackingId=foo#comments',
    expected: 'https://www.linkedin.com/posts/jane-doe_post-activity-7187234567890123456-AbCd#comments' },

  // /feed/update/urn:li:...
  { name: 'feed/update activity URN',
    input: 'https://www.linkedin.com/feed/update/urn:li:activity:7187234567890123456/?lipi=urn%3Ali%3Apage%3A1',
    expected: 'https://www.linkedin.com/feed/update/urn:li:activity:7187234567890123456/' },
  { name: 'feed/update share URN',
    input: 'https://www.linkedin.com/feed/update/urn:li:share:7187234567890123456?trackingId=xyz',
    expected: 'https://www.linkedin.com/feed/update/urn:li:share:7187234567890123456' },

  // /pulse/
  { name: 'pulse article: tracking stripped',
    input: 'https://www.linkedin.com/pulse/some-article-title-jane-doe-abcde/?trackingId=foo&utm_source=share',
    expected: 'https://www.linkedin.com/pulse/some-article-title-jane-doe-abcde/' },

  // /jobs/view/
  { name: 'jobs/view: tracking stripped',
    input: 'https://www.linkedin.com/jobs/view/3987654321/?refId=abc&trackingId=xyz&trk=public_jobs_topcard-title',
    expected: 'https://www.linkedin.com/jobs/view/3987654321/' },

  // /events/
  { name: 'events: tracking stripped',
    input: 'https://www.linkedin.com/events/7187234567890123456/?lipi=urn%3Ali%3Apage%3Ad_flagship3_event',
    expected: 'https://www.linkedin.com/events/7187234567890123456/' },

  // News stories (the gap found in live smoke testing 2026-06-12)
  { name: 'news story: lipi stripped',
    input: 'https://www.linkedin.com/news/story/ai-leaders-are-suddenly-changing-their-tune-on-jobs-8366417/?lipi=urn%3Ali%3Apage%3Ad_flagship3_feed%3BQcWnBazjRH6xRISW1Uk6PQ%3D%3D',
    expected: 'https://www.linkedin.com/news/story/ai-leaders-are-suddenly-changing-their-tune-on-jobs-8366417/' },

  // Non-post pages — fallback denylist strips LinkedIn junk, keeps the rest
  { name: 'profile /in/: miniProfileUrn stripped via fallback',
    input: 'https://www.linkedin.com/in/janedoe/?miniProfileUrn=urn%3Ali%3Afsd_profile%3AABC',
    expected: 'https://www.linkedin.com/in/janedoe/' },
  { name: 'profile with lipi stripped via fallback',
    input: 'https://www.linkedin.com/in/janedoe/?lipi=urn%3Ali%3Apage%3Ad_flagship3_search',
    expected: 'https://www.linkedin.com/in/janedoe/' },
  { name: 'search results: keywords SURVIVE fallback, lipi dies',
    input: 'https://www.linkedin.com/search/results/all/?keywords=rust%20developer&lipi=urn%3Ali%3Apage',
    expected: 'https://www.linkedin.com/search/results/all/?keywords=rust+developer' },
  { name: 'company page passthrough (no junk)',
    input: 'https://www.linkedin.com/company/acmecorp/',
    expected: 'https://www.linkedin.com/company/acmecorp/',
    expectedNeeds: false },
  { name: 'school page passthrough',
    input: 'https://www.linkedin.com/school/some-university/',
    expected: 'https://www.linkedin.com/school/some-university/',
    expectedNeeds: false },
  { name: 'feed home passthrough',
    input: 'https://www.linkedin.com/feed/',
    expected: 'https://www.linkedin.com/feed/',
    expectedNeeds: false },
  { name: 'jobs search now recognized (keywords kept)',
    input: 'https://www.linkedin.com/jobs/search/?keywords=engineer',
    expected: 'https://www.linkedin.com/jobs/search/?keywords=engineer',
    expectedNeeds: false },
  { name: 'events directory passthrough (non-numeric id, no junk)',
    input: 'https://www.linkedin.com/events/upcoming',
    expected: 'https://www.linkedin.com/events/upcoming',
    expectedNeeds: false },
  { name: 'home passthrough',
    input: 'https://www.linkedin.com/',
    expected: 'https://www.linkedin.com/',
    expectedNeeds: false },
  { name: 'non-LinkedIn → null',
    input: 'https://www.google.com/?q=linkedin',
    expected: null },

  // v1.7.0+ commentUrn / replyUrn preservation on /feed/update/ deep-links
  { name: 'feed/update: commentUrn preserved',
    input: 'https://www.linkedin.com/feed/update/urn:li:activity:1234567890/?commentUrn=urn%3Ali%3Acomment%3A%28activity%3A1234%2C5678%29',
    expected: 'https://www.linkedin.com/feed/update/urn:li:activity:1234567890/?commentUrn=urn%3Ali%3Acomment%3A%28activity%3A1234%2C5678%29' },
  { name: 'feed/update: commentUrn preserved, trackingId stripped',
    input: 'https://www.linkedin.com/feed/update/urn:li:activity:1234/?commentUrn=urn%3Ali%3Acomment%3A%28activity%3A1234%2C5678%29&trackingId=abc',
    expected: 'https://www.linkedin.com/feed/update/urn:li:activity:1234/?commentUrn=urn%3Ali%3Acomment%3A%28activity%3A1234%2C5678%29' },
  { name: 'feed/update: replyUrn preserved',
    input: 'https://www.linkedin.com/feed/update/urn:li:activity:1234/?commentUrn=urn%3Aa&replyUrn=urn%3Ab',
    expected: 'https://www.linkedin.com/feed/update/urn:li:activity:1234/?commentUrn=urn%3Aa&replyUrn=urn%3Ab' },
  { name: '/posts/<slug>: commentUrn NOT preserved (only on feed/update)',
    input: 'https://www.linkedin.com/posts/some-user_some-slug-activity-1234?commentUrn=foo&trk=public',
    expected: 'https://www.linkedin.com/posts/some-user_some-slug-activity-1234' },
  { name: 'jobs/view/<id>: query stripped as before',
    input: 'https://www.linkedin.com/jobs/view/1234567/?trackingId=abc&refId=def',
    expected: 'https://www.linkedin.com/jobs/view/1234567/' },

];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenLinkedinUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isLinkedinHost: linkedin.com', isLinkedinHost('linkedin.com'), true);
check('isLinkedinHost: www.linkedin.com', isLinkedinHost('www.linkedin.com'), true);
check('isLinkedinHost: m.linkedin.com', isLinkedinHost('m.linkedin.com'), true);
check('isLinkedinHost: linkedin-clone.com', isLinkedinHost('linkedin-clone.com'), false);
check('isLinkedinHost: empty', isLinkedinHost(''), false);
check('isPostUrl: /posts/', isPostUrl('https://www.linkedin.com/posts/jane_post-activity-123-Ab'), true);
check('isPostUrl: profile', isPostUrl('https://www.linkedin.com/in/jane/'), false);
check('shorten on garbage', shortenLinkedinUrl('not a url'), null);
check('needs on garbage', needsShortening('not a url'), false);

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
