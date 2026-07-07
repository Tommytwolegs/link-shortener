const path = require('path');
const {
  unwrapOnce,
  unwrapRedirects,
  REDIRECTORS,
} = require(path.join('..', 'src', 'redirect.js'));

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}

// Google/Gmail wrapper
check('google /url unwrapped',
  unwrapRedirects('https://www.google.com/url?q=https%3A%2F%2Fexample.com%2Fpage%3Fid%3D5&sa=D&source=editors&ust=1700000&usg=AOvVaw'),
  'https://example.com/page?id=5');
check('google /url with url= param',
  unwrapRedirects('https://google.com/url?url=https%3A%2F%2Fexample.com%2F'),
  'https://example.com/');
// Facebook
check('l.facebook.com unwrapped',
  unwrapRedirects('https://l.facebook.com/l.php?u=https%3A%2F%2Fexample.com%2Farticle&h=AT0abc&__tn__=-UK-R'),
  'https://example.com/article');
check('lm.facebook.com unwrapped',
  unwrapRedirects('https://lm.facebook.com/l.php?u=https%3A%2F%2Fexample.com%2F'),
  'https://example.com/');
// Reddit
check('out.reddit.com unwrapped',
  unwrapRedirects('https://out.reddit.com/?url=https%3A%2F%2Fexample.com%2Fpost&token=abc'),
  'https://example.com/post');
// YouTube description links
check('youtube /redirect unwrapped',
  unwrapRedirects('https://www.youtube.com/redirect?event=video_description&redir_token=xyz&q=https%3A%2F%2Fexample.com%2F'),
  'https://example.com/');
// Nesting (google wrapping facebook wrapping target)
check('nested unwrap (2 hops)',
  unwrapRedirects('https://www.google.com/url?q=' + encodeURIComponent('https://l.facebook.com/l.php?u=' + encodeURIComponent('https://example.com/deep'))),
  'https://example.com/deep');
// Safety
check('non-http target rejected (javascript:)',
  unwrapRedirects('https://www.google.com/url?q=javascript%3Aalert(1)'),
  'https://www.google.com/url?q=javascript%3Aalert(1)');
check('relative target rejected',
  unwrapOnce('https://www.google.com/url?q=%2Flocal%2Fpath'),
  null);
check('non-redirector passthrough',
  unwrapRedirects('https://example.com/url?q=https%3A%2F%2Fother.com'),
  'https://example.com/url?q=https%3A%2F%2Fother.com');
check('google search NOT a redirector',
  unwrapOnce('https://www.google.com/search?q=test'),
  null);
check('garbage passthrough', unwrapRedirects('not a url'), 'not a url'.replace('not a url','not a url'));
check('unwrapOnce on garbage', unwrapOnce('not a url'), null);
check('redirector count', REDIRECTORS.length, 5);

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
