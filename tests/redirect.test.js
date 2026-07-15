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
check('redirector count', REDIRECTORS.length, 36);

// --- v1.10: Skimlinks affiliate wrappers ---
check('go.redirectingat.com unwrapped',
  unwrapRedirects('https://go.redirectingat.com/?id=12345X67890&url=https%3A%2F%2Fexample.com%2Fproduct%3Fcolor%3Dred&sref=https%3A%2F%2Fblog.example%2Fpost'),
  'https://example.com/product?color=red');
check('go.skimresources.com unwrapped',
  unwrapRedirects('https://go.skimresources.com/?id=98765X43210&url=https%3A%2F%2Fexample.com%2Fdeal&xs=1'),
  'https://example.com/deal');
check('skimlinks without url= passes through',
  unwrapOnce('https://go.redirectingat.com/?id=12345X67890'),
  null);
check('skimlinks lookalike rejected',
  unwrapOnce('https://go.redirectingat.com.evil.example/?url=https%3A%2F%2Fexample.com'),
  null);

// --- v1.10: pixiv + DeviantArt interstitials ---
check('pixiv jump.php url= unwrapped',
  unwrapRedirects('https://www.pixiv.net/jump.php?url=https%3A%2F%2Fexample.com%2Fgallery'),
  'https://example.com/gallery');
check('pixiv jump.php legacy raw-query unwrapped',
  unwrapRedirects('https://www.pixiv.net/jump.php?https%3A%2F%2Fexample.com%2Fart%3Fid%3D9'),
  'https://example.com/art?id=9');
check('deviantart outgoing unwrapped',
  unwrapRedirects('https://www.deviantart.com/users/outgoing?https://example.com/portfolio'),
  'https://example.com/portfolio');
check('deviantart profile NOT a redirector',
  unwrapOnce('https://www.deviantart.com/users/someartist'),
  null);

// --- v1.10: affiliate networks + ad clicks ---
check('partnerize destination (raw) unwrapped',
  unwrapRedirects('https://prf.hn/click/camref:1101abc/pubref:news/destination:https://www.example.com/deal?id=5'),
  'https://www.example.com/deal?id=5');
check('partnerize destination (encoded) unwrapped',
  unwrapRedirects('https://prf.hn/click/camref:1101abc/destination:https%3A%2F%2Fwww.example.com%2Fdeal'),
  'https://www.example.com/deal');
check('partnerize without destination passes through',
  unwrapOnce('https://prf.hn/click/camref:1101abc'),
  null);
check('awin ued unwrapped',
  unwrapRedirects('https://www.awin1.com/cread.php?awinmid=17961&awinaffid=1104681&platform=sl&ued=https%3A%2F%2Fwww.example.com%2Fproduct'),
  'https://www.example.com/product');
check('cj click-form url= unwrapped',
  unwrapRedirects('https://www.anrdoezrs.net/click-1234567-87654321?sid=abc&url=https%3A%2F%2Fwww.example.com%2Fbook'),
  'https://www.example.com/book');
check('cj links-form path-embedded unwrapped',
  unwrapRedirects('https://www.dpbolvw.net/links/8765432/type/dlg/https://www.example.com/sale?x=1'),
  'https://www.example.com/sale?x=1');
check('linksynergy murl unwrapped',
  unwrapRedirects('https://click.linksynergy.com/deeplink?id=AbCdEf&mid=2025&murl=https%3A%2F%2Fwww.example.com%2Fshoes'),
  'https://www.example.com/shoes');
check('googleadservices adurl unwrapped (copy pipeline)',
  unwrapRedirects('https://www.googleadservices.com/pagead/aclk?sa=L&ai=XYZ&adurl=https%3A%2F%2Fwww.example.com%2Flanding'),
  'https://www.example.com/landing');
check('bing aclick u= unwrapped when plainly encoded',
  unwrapRedirects('https://www.bing.com/aclick?ld=e8abc&u=https%3A%2F%2Fwww.example.com%2Foffer&rlid=xyz'),
  'https://www.example.com/offer');
check('bing search still not a redirector',
  unwrapOnce('https://www.bing.com/search?q=aclick'),
  null);

// --- v1.10: enterprise email protection (COPY-only unwrap) ---
check('proofpoint v2 unwrapped',
  unwrapRedirects('https://urldefense.proofpoint.com/v2/url?u=https-3A__example.com_page-3Fid-3D5&d=DwMFaQ&c=abc&r=def&m=ghi&s=jkl&e='),
  'https://example.com/page?id=5');
check('proofpoint v2 on urldefense.com host',
  unwrapOnce('https://urldefense.com/v2/url?u=https-3A__example.com_&d=DwMF'),
  'https://example.com/');
check('proofpoint v2 bad encoding passes through',
  unwrapOnce('https://urldefense.proofpoint.com/v2/url?u=https-3A__example.com_x-ZZ&d=1'),
  null);
check('proofpoint v3 no replacements',
  unwrapRedirects('https://urldefense.com/v3/__https://example.com/plain__;!!AbCdEf!xYz123$'),
  'https://example.com/plain');
check('proofpoint v3 single star (reference-doc example shape)',
  unwrapRedirects('https://urldefense.com/v3/__https://example.com/path*a=1&b=2__;Pw!!Org!uid$'),
  'https://example.com/path?a=1&b=2');
check('proofpoint v3 run of two',
  unwrapRedirects('https://urldefense.com/v3/__https://example.com/x**Aab__;Pz8!!Org!uid$'),
  'https://example.com/x??ab');
check('proofpoint v3 utf-8 replacement',
  unwrapRedirects('https://urldefense.com/v3/__https://example.com/p*ge__;w6Q!!Org!uid$'),
  'https://example.com/p%C3%A4ge');
check('proofpoint v3 pool exhaustion passes through',
  unwrapOnce('https://urldefense.com/v3/__https://example.com/*a*b__;Iw!!Org!uid$'),
  null);
check('barracuda linkprotect unwrapped',
  unwrapRedirects('https://linkprotect.cudasvc.com/url?a=https%3A%2F%2Fexample.com%2Fdoc%3Fid%3D7&c=E,1,AbCdEf&typo=1'),
  'https://example.com/doc?id=7');
check('barracuda javascript target rejected',
  unwrapOnce('https://linkprotect.cudasvc.com/url?a=javascript%3Aalert(1)'),
  null);
check('urldefense lookalike rejected',
  unwrapOnce('https://urldefense.com.evil.example/v2/url?u=https-3A__example.com_'),
  null);

// --- v1.10: DDG /l, VK away, Disqus, Telegram IV ---
check('duckduckgo /l uddg unwrapped',
  unwrapRedirects('https://duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fpage%3Fid%3D7&rut=abc123def456'),
  'https://example.com/page?id=7');
check('html.duckduckgo.com covered',
  unwrapOnce('https://html.duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2F'),
  'https://example.com/');
check('ddg search page NOT a redirector',
  unwrapOnce('https://duckduckgo.com/?q=test'),
  null);
check('vk away.php unwrapped',
  unwrapRedirects('https://vk.com/away.php?to=https%3A%2F%2Fexample.com%2Fpost&cc_key=abc'),
  'https://example.com/post');
check('disq.us hash suffix dropped',
  unwrapRedirects('https://disq.us/url?url=https%3A%2F%2Fexample.com%2Farticle%3AAbC123xYz9'),
  'https://example.com/article');
check('disq.us target with port keeps the port',
  unwrapOnce('https://disq.us/url?url=https%3A%2F%2Fexample.com%3A8080%2Fpage'),
  'https://example.com:8080/page');
check('t.me/iv unwrapped',
  unwrapRedirects('https://t.me/iv?url=https%3A%2F%2Fexample.com%2Fstory&rhash=abcdef123456'),
  'https://example.com/story');
check('t.me channel link NOT a redirector',
  unwrapOnce('https://t.me/somechannel/123'),
  null);

// --- v1.10: Slack + SoundCloud outbound wrappers ---
check('slack-redir.net unwrapped',
  unwrapRedirects('https://slack-redir.net/link?url=https%3A%2F%2Fexample.com%2Fdoc%3Fid%3D9'),
  'https://example.com/doc?id=9');
check('slack-redir wrong path passes through',
  unwrapOnce('https://slack-redir.net/other?url=https%3A%2F%2Fexample.com'),
  null);
check('exit.sc unwrapped',
  unwrapRedirects('https://exit.sc/?url=https%3A%2F%2Fbandcamp.example%2Falbum%2Fx'),
  'https://bandcamp.example/album/x');
check('exit.sc javascript target rejected',
  unwrapOnce('https://exit.sc/?url=javascript%3Aalert(1)'),
  null);

// --- v1.10: YouTube attribution_link (u= is usually RELATIVE) ---
check('attribution_link relative u= absolutized + unwrapped',
  unwrapRedirects('https://www.youtube.com/attribution_link?a=AbC123xYz&u=%2Fwatch%3Fv%3DdQw4w9WgXcQ%26feature%3Dshare'),
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share');
check('attribution_link absolute u= unwrapped',
  unwrapRedirects('https://www.youtube.com/attribution_link?u=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ'),
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
check('attribution_link m. subdomain covered',
  unwrapOnce('https://m.youtube.com/attribution_link?u=%2Fwatch%3Fv%3Dabc123DEF45'),
  'https://www.youtube.com/watch?v=abc123DEF45');
check('attribution_link without u= passes through',
  unwrapOnce('https://www.youtube.com/attribution_link?a=onlyattribution'),
  null);
check('attribution_link javascript u= rejected',
  unwrapOnce('https://www.youtube.com/attribution_link?u=javascript%3Aalert(1)'),
  null);


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
