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
check('redirector count', REDIRECTORS.length, 15);


// --- v1.9 unwrap pack ---
// Outlook SafeLinks (regional subdomains)
check('safelinks nam12 unwrapped',
  unwrapRedirects('https://nam12.safelinks.protection.outlook.com/?url=https%3A%2F%2Fexample.com%2Fdoc%3Fid%3D7&data=05%7C02%7Cuser%40corp.com&sdata=AbCd&reserved=0'),
  'https://example.com/doc?id=7');
check('safelinks gcc02 unwrapped',
  unwrapRedirects('https://gcc02.safelinks.protection.outlook.com/?url=https%3A%2F%2Fexample.com%2F'),
  'https://example.com/');
check('safelinks wrapping google /url (nested)',
  unwrapRedirects('https://eur04.safelinks.protection.outlook.com/?url=' + encodeURIComponent('https://www.google.com/url?q=https%3A%2F%2Fexample.com%2Ffinal')),
  'https://example.com/final');
check('lookalike safelinks host rejected',
  unwrapRedirects('https://safelinks.protection.outlook.com.evil.com/?url=https%3A%2F%2Fexample.com%2F'),
  'https://safelinks.protection.outlook.com.evil.com/?url=https%3A%2F%2Fexample.com%2F');

// Bing /ck/a (u= is "a1" + base64url of the target)
check('bing ck/a unwrapped',
  unwrapRedirects('https://www.bing.com/ck/a?!&&p=deadbeef&ptn=3&ver=2&hsh=4&u=a1aHR0cHM6Ly9leGFtcGxlLmNvbS9wYWdlP2lkPTU&ntb=1'),
  'https://example.com/page?id=5');
check('bing ck/a with bad base64 passes through',
  unwrapRedirects('https://www.bing.com/ck/a?u=a1%25%25garbage'),
  'https://www.bing.com/ck/a?u=a1%25%25garbage');
check('bing ck/a without a1 prefix passes through',
  unwrapRedirects('https://www.bing.com/ck/a?u=aHR0cHM6Ly9leGFtcGxlLmNvbQ'),
  'https://www.bing.com/ck/a?u=aHR0cHM6Ly9leGFtcGxlLmNvbQ');
check('bing ck/a javascript target rejected',
  unwrapRedirects('https://www.bing.com/ck/a?u=a1amF2YXNjcmlwdDphbGVydCgxKQ'),
  'https://www.bing.com/ck/a?u=a1amF2YXNjcmlwdDphbGVydCgxKQ');
check('bing normal search NOT treated as redirector',
  unwrapOnce('https://www.bing.com/search?q=hello'),
  null);

// Instagram / Messenger
check('l.instagram.com unwrapped',
  unwrapRedirects('https://l.instagram.com/?u=https%3A%2F%2Fexample.com%2Fshop&e=AT0xYz'),
  'https://example.com/shop');
check('l.messenger.com unwrapped',
  unwrapRedirects('https://l.messenger.com/l.php?u=https%3A%2F%2Fexample.com%2F&h=AT1a'),
  'https://example.com/');

// Steam linkfilter (u= current, url= legacy)
check('steam linkfilter u= unwrapped',
  unwrapRedirects('https://steamcommunity.com/linkfilter/?u=https%3A%2F%2Fexample.com%2Fmod'),
  'https://example.com/mod');
check('steam linkfilter legacy url= unwrapped',
  unwrapRedirects('https://steamcommunity.com/linkfilter/?url=https%3A%2F%2Fexample.com%2Fguide'),
  'https://example.com/guide');

// Tumblr
check('t.umblr.com unwrapped',
  unwrapRedirects('https://t.umblr.com/redirect?z=https%3A%2F%2Fexample.com%2Fpost&t=NzM2Mg'),
  'https://example.com/post');
check('href.li raw-query unwrapped',
  unwrapRedirects('https://href.li/?https://example.com/x?a=b'),
  'https://example.com/x?a=b');
check('href.li with non-http garbage passes through (input returned verbatim)',
  unwrapRedirects('https://href.li/?not a url'),
  'https://href.li/?not a url');


// --- de-AMP ---
check('google amp https form',
  unwrapRedirects('https://www.google.com/amp/s/www.example.com/article?id=5'),
  'https://www.example.com/article?id=5');
check('google amp http form (no s/)',
  unwrapRedirects('https://www.google.com/amp/example.com/story'),
  'http://example.com/story');
check('google amp transport junk stripped',
  unwrapRedirects('https://www.google.com/amp/s/www.example.com/article?id=5&amp_gsa=1&amp_js_v=a9&usqp=mq331AQIUAKwASCAAgM%3D'),
  'https://www.example.com/article?id=5');
check('ampproject cdn content form',
  unwrapRedirects('https://www-example-com.cdn.ampproject.org/c/s/www.example.com/article?x=1'),
  'https://www.example.com/article?x=1');
check('ampproject cdn viewer form',
  unwrapRedirects('https://cdn.ampproject.org/v/s/example.com/page'),
  'https://example.com/page');
check('bing amp form',
  unwrapRedirects('https://www.bing.com/amp/s/example.com/news/item'),
  'https://example.com/news/item');
check('amp sharing fragment stripped',
  unwrapRedirects('https://www.google.com/amp/s/example.com/a#amp_tf=From%20%251%24s&aoh=1234'),
  'https://example.com/a');
check('normal google search untouched by amp entry',
  unwrapOnce('https://www.google.com/search?q=amp'),
  null);
check('publisher-side amp path untouched',
  unwrapRedirects('https://www.example.com/amp/article'),
  'https://www.example.com/amp/article');
check('lookalike ampproject host rejected',
  unwrapRedirects('https://cdn.ampproject.org.evil.com/c/s/example.com/x'),
  'https://cdn.ampproject.org.evil.com/c/s/example.com/x');
check('google /amp/ with empty remainder untouched',
  unwrapRedirects('https://www.google.com/amp/'),
  'https://www.google.com/amp/');
check('safelinks wrapping google amp (nested)',
  unwrapRedirects('https://nam12.safelinks.protection.outlook.com/?url=' + encodeURIComponent('https://www.google.com/amp/s/www.example.com/article')),
  'https://www.example.com/article');


// --- review fixes ---
check('amp percent-encoded query decoded',
  unwrapRedirects('https://www.google.com/amp/s/example.com/article%3fid%3d5'),
  'https://example.com/article?id=5');
check('amp encoded query with multiple params',
  unwrapRedirects('https://www-example-com.cdn.ampproject.org/c/s/www.example.com/story%3Fpage%3D2%26x%3D1'),
  'https://www.example.com/story?page=2&x=1');
check('amp encoded query with bad percent kept encoded (no throw)',
  unwrapRedirects('https://www.google.com/amp/s/example.com/a%3fb%ZZ'),
  'https://example.com/a%3fb%ZZ');
check('amp empty host segment rejected',
  unwrapRedirects('https://www.google.com/amp/s//evil.com/x'),
  'https://www.google.com/amp/s//evil.com/x');
check('amp literal query wins over encoded (mixed form unchanged path)',
  unwrapRedirects('https://www.google.com/amp/s/example.com/a%3fx%3d1?usqp=mq331'),
  'https://example.com/a%3fx%3d1');


// --- publisher-side AMP markers (safe subset) ---
check('trailing /amp/ trimmed (WordPress)',
  unwrapRedirects('https://someblog.com/2024/01/my-post/amp/'),
  'https://someblog.com/2024/01/my-post');
check('trailing /amp trimmed',
  unwrapRedirects('https://someblog.com/2024/01/my-post/amp'),
  'https://someblog.com/2024/01/my-post');
check('.amp suffix trimmed',
  unwrapRedirects('https://www.bbc.com/news/world-us-canada-123456.amp'),
  'https://www.bbc.com/news/world-us-canada-123456');
check('.amp.html suffix -> .html',
  unwrapRedirects('https://example.com/story.amp.html'),
  'https://example.com/story.html');
check('amp=1 param stripped, others kept',
  unwrapRedirects('https://example.com/article?amp=1&id=5'),
  'https://example.com/article?id=5');
check('outputType=amp stripped',
  unwrapRedirects('https://www.washingtonpost.com/politics/2026/story/?outputType=amp'),
  'https://www.washingtonpost.com/politics/2026/story/');
check('outputType=json NOT stripped',
  unwrapRedirects('https://example.com/api?outputType=json'),
  'https://example.com/api?outputType=json');
check('bare /amp path untouched',
  unwrapRedirects('https://amp.dev/amp'),
  'https://amp.dev/amp');
check('mid-path /amp/ untouched by design',
  unwrapRedirects('https://www.nbcnews.com/news/amp/rcna12345'),
  'https://www.nbcnews.com/news/amp/rcna12345');
check('amp inside words untouched',
  unwrapRedirects('https://example.com/lampshade/campfire?champ=1'),
  'https://example.com/lampshade/campfire?champ=1');
check('viewer wrapper + publisher amp trimmed together',
  unwrapRedirects('https://www.google.com/amp/s/someblog.com/2024/01/my-post/amp/'),
  'https://someblog.com/2024/01/my-post');

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
