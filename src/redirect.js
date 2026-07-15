// redirect.js
// ----------------------------------------------------------------------------
// Pure redirector-unwrapping for the "Copy clean URL" context menu.
//
// Email clients and social feeds wrap outbound links in tracking
// redirectors. Unwrapping them via the copy pipeline (context menu,
// keyboard shortcut, popup button) means a wrapped link anywhere —
// inside Gmail, Outlook, a Facebook feed, a Bing results page — copies
// the REAL destination, which then gets cleaned by whichever per-site
// module matches it.
//
// Covered wrappers (target embedded IN the URL — zero network needed):
//   google.com/url?q=            Gmail + Google Docs outbound links
//   l.facebook.com/l.php?u=      Facebook (+ lm. and l.messenger.com)
//   l.instagram.com/?u=          Instagram bio/DM links
//   out.reddit.com/?url=         Reddit outbound
//   youtube.com/redirect?q=      YouTube descriptions/comments
//   youtube.com/attribution_link?u=             YouTube attribution links
//   *.safelinks.protection.outlook.com/?url=   Outlook corporate email
//   bing.com/ck/a?u=a1<b64url>   Bing result click-wrappers (base64)
//   steamcommunity.com/linkfilter/?u=          Steam chat/profiles
//   t.umblr.com/redirect?z=      Tumblr outbound
//   href.li/?<raw target>        Tumblr-ecosystem wrapper (raw query)
//   go.redirectingat.com/?url=   Skimlinks affiliate wrapper
//   go.skimresources.com/?url=   Skimlinks affiliate wrapper (alt host)
//   slack-redir.net/link?url=    Slack outbound wrapper
//   exit.sc/?url=                SoundCloud outbound wrapper
//   duckduckgo.com/l/?uddg=      DuckDuckGo result click-redirect
//   vk.com/away.php?to=          VK outbound wrapper
//   disq.us/url?url=<t>:<hash>   Disqus comment links (hash suffix dropped)
//   t.me/iv?url=                 Telegram Instant View wrapper
//   urldefense.(proofpoint.)com|us /v2/url?u=   Proofpoint URL Defense v2
//   urldefense.com|us/v3/__t__;  Proofpoint URL Defense v3 (path-embedded)
//   linkprotect.cudasvc.com/url?a=              Barracuda LinkProtect
//   prf.hn/click/.../destination:<t>            Partnerize (path-embedded)
//   awin1.com/cread.php?ued=     Awin
//   anrdoezrs|dpbolvw|tkqlhce|kqzyfj|jdoqocy    CJ (?url= and /links/ forms)
//   click.linksynergy.com?murl=  Rakuten Advertising
//   googleadservices.com/pagead/aclk?adurl=     Google ad click (copy-only)
//   bing.com/aclick?u=           Bing ad click (copy-only)
//   pixiv.net/jump.php           pixiv outbound (url= or raw query)
//   deviantart.com/users/outgoing?<raw>         DeviantArt interstitial
//
// De-AMP (same pipeline; target embedded in the PATH):
//   google.com/amp/s/<host>/<path>          Google AMP viewer
//   bing.com/amp/s/<host>/<path>            Bing AMP viewer
//   <pub>.cdn.ampproject.org/c|v/s/<host>/  AMP CDN content/viewer
// The /s/ segment means https (without it, http). AMP transport junk
// (amp_*, usqp params; #amp_tf-style fragments) is stripped from the
// recovered URL.
//
// Publisher-side AMP markers are stripped ONLY where no guessing is
// involved: a trailing /amp path segment (the WordPress pattern),
// .amp / .amp.html filename suffixes, and amp / amp=1 / outputType=amp
// query params. MID-path /amp/ segments (nbcnews.com/news/amp/<id>)
// and amp. subdomains are left alone — canonical recovery for those
// varies by publisher and stripping risks a broken link, which is
// worse than an AMP one.
//
// NOT covered on purpose: t.co, bit.ly, a.co and other server-side
// shorteners — resolving those requires a network request, and this
// extension makes none.
//
// This is used ONLY by the background context menu (cleanAnyUrl); the
// address bar never sees these URLs (they redirect instantly), and no
// content script or host permission is involved.
//
// Safety: only http(s) targets are accepted; unwrapping is capped at 3
// hops to avoid loops; on any doubt the original URL is returned.
//
// Loaded as a service-worker importScripts target and a CommonJS module
// from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  // Decode base64url (Bing's u= carries "a1" + base64url(target)).
  // atob + TextDecoder exist in service workers, Firefox event pages,
  // and Node 18+ — every runtime this file loads in.
  function b64urlDecode(s) {
    try {
      let b = s.replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      const bin = atob(b);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder('utf-8').decode(bytes);
    } catch (_e) {
      return null;
    }
  }

  // -- Proofpoint URL Defense v3 ----------------------------------------------
  // Format: /v3/__<maimed>__;<b64url>!!<org>!<id>$ — characters the rewriter
  // deems special are replaced in the maimed URL with '*' (a single char)
  // or '**X' (a run, where X encodes the BYTE length of the run: A=2,
  // B=3, ... '_'=65), and the original characters are carried base64url
  // encoded after the ';'. Decoding walks the maimed URL and consumes
  // characters from the decoded pool by UTF-8 byte count. Mirrors
  // cardi/proofpoint-url-decoder (public-domain reference), including the
  // segment-boundary quirk where a multi-byte character straddles a
  // 65-byte run ("save bytes" carry-over). On ANY doubt returns null and
  // the wrapper URL passes through untouched.
  const PPV3_ALPHABET =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  function ppv3Decode(href) {
    const m = href.match(/\/v3\/__(.*)__;([A-Za-z0-9_=-]*)!!/);
    if (!m) return null;
    const maimed = m[1];
    if (!m[2]) return maimed;
    const pool = b64urlDecode(m[2].replace(/=+$/, ''));
    if (pool === null) return null;
    const chars = Array.from(pool);
    const enc = new TextEncoder();
    const out = [];
    let saveBytes = 0;
    for (let i = 0; i < maimed.length; ) {
      const ch = maimed[i];
      if (ch !== '*') { out.push(ch); i += 1; continue; }
      const runChar = maimed[i + 1] === '*' ? maimed[i + 2] : null;
      const runIdx = (runChar !== null && runChar !== undefined)
        ? PPV3_ALPHABET.indexOf(runChar) : -1;
      if (runIdx !== -1) {
        let numBytes = runIdx + 2 + saveBytes;
        saveBytes = 0;
        let taken = 0;
        while (taken < numBytes) {
          if (!chars.length) return null;
          const c = chars.shift();
          out.push(c);
          taken += enc.encode(c).length;
          if (chars.length && taken < numBytes
              && enc.encode(chars[0]).length > (numBytes - taken)) {
            saveBytes = numBytes - taken;
            taken = numBytes;
          }
        }
        i += 3;
      } else {
        if (!chars.length) return null;
        out.push(chars.shift());
        i += 1;
      }
    }
    return out.join('');
  }

  // { host, path, params } — first present param wins. Optional per-entry
  // hooks: `decode(value)` transforms the raw param before validation
  // (Bing's base64); `rawQuery: true` treats the entire query string as
  // the target (href.li has no param name at all).
  const REDIRECTORS = [
    { host: /^(?:www\.)?google\.com$/i, path: /^\/url\/?$/, params: ['q', 'url'] },
    { host: /^l\.facebook\.com$/i, path: /^\/l\.php\/?$/, params: ['u'] },
    { host: /^lm\.facebook\.com$/i, path: /^\/l\.php\/?$/, params: ['u'] },
    { host: /^l\.messenger\.com$/i, path: /^\/l\.php\/?$/, params: ['u'] },
    { host: /^l\.instagram\.com$/i, path: /^\/?$/, params: ['u'] },
    { host: /^out\.reddit\.com$/i, path: /^\/?$/, params: ['url'] },
    { host: /^(?:www\.|m\.)?youtube\.com$/i, path: /^\/redirect\/?$/, params: ['q'] },
    // YouTube attribution wrapper: u= is usually a RELATIVE path
    // ('/watch%3Fv%3D...'); absolutize it against youtube.com so the
    // sanitizer (http/https-only) can validate it. Absolute values pass
    // through unchanged and are validated the same way.
    { host: /^(?:www\.|m\.)?youtube\.com$/i, path: /^\/attribution_link\/?$/i, params: ['u'],
      decode: (v) => (v && v[0] === '/') ? 'https://www.youtube.com' + v : v },
    // Outlook SafeLinks: nam12./eur04./gcc02. etc. regional subdomains.
    { host: /(?:^|\.)safelinks\.protection\.outlook\.com$/i, path: /^\/?$/, params: ['url'] },
    // Bing result click-wrapper: /ck/a?...&u=a1<base64url(target)>.
    { host: /^(?:www\.|cn\.)?bing\.com$/i, path: /^\/ck\/a\/?$/i, params: ['u'],
      decode: (v) => (v && v.slice(0, 2) === 'a1') ? b64urlDecode(v.slice(2)) : null },
    { host: /^(?:www\.)?steamcommunity\.com$/i, path: /^\/linkfilter\/?$/i, params: ['u', 'url'] },
    { host: /^t\.umblr\.com$/i, path: /^\/redirect\/?$/i, params: ['z'] },
    { host: /^(?:www\.)?href\.li$/i, path: /^\/?$/, rawQuery: true },
    // Skimlinks affiliate wrappers (newsletter/blog outbound links carry
    // the destination in ?url=; id/sref/xs are the affiliate attribution).
    { host: /^go\.redirectingat\.com$/i, path: /^\/?$/, params: ['url'] },
    { host: /^go\.skimresources\.com$/i, path: /^\/?$/, params: ['url'] },
    // Slack wraps every external link a user clicks (referrer scrubbing +
    // click tracking); SoundCloud defers outbound links through exit.sc.
    { host: /^(?:www\.)?slack-redir\.net$/i, path: /^\/link\/?$/i, params: ['url'] },
    { host: /^(?:www\.)?exit\.sc$/i, path: /^\/?$/, params: ['url'] },
    // DuckDuckGo's own result click-redirect (html/lite modes and some
    // bang flows): /l/?uddg=<encoded target>&rut=<hash>.
    { host: /^(?:html\.|lite\.)?duckduckgo\.com$/i, path: /^\/l\/?$/i, params: ['uddg'] },
    // VK outbound wrapper.
    { host: /^(?:www\.|m\.)?vk\.com$/i, path: /^\/away(?:\.php)?\/?$/i, params: ['to'] },
    // Disqus comment links: disq.us/url?url=<encoded target>:<hash> — the
    // trailing :hash is Disqus's integrity suffix, not part of the target.
    { host: /^(?:www\.)?disq\.us$/i, path: /^\/url\/?$/i, params: ['url'],
      decode: (v) => {
        if (!v) return v;
        const i = v.lastIndexOf(':');
        // Strip only a plausible hash tail (alnum, no slashes) after the
        // scheme's colon — ':8080/path' style ports keep their tail.
        if (i > 8 && /^[A-Za-z0-9_-]+$/.test(v.slice(i + 1))) return v.slice(0, i);
        return v;
      } },
    // Telegram Instant View wrapper: t.me/iv?url=<target>&rhash=...
    { host: /^t\.me$/i, path: /^\/iv\/?$/i, params: ['url'] },
    // Proofpoint URL Defense v2: u= carries the target with '-'→'%' and
    // '_'→'/' substitutions, percent-encoded. Enterprise email protection:
    // unwrap on COPY only — never click-skipped (same policy as SafeLinks;
    // click-time scanning has real security value).
    { host: /^urldefense(?:\.proofpoint)?\.(?:com|us)$/i, path: /^\/v2\/url\/?$/i, params: ['u'],
      decode: (v) => {
        try { return decodeURIComponent(v.replace(/-/g, '%').replace(/_/g, '/')); }
        catch (_e) { return null; }
      } },
    // Proofpoint URL Defense v3: target embedded in the PATH — see
    // ppv3Decode above. Same copy-only policy as v2.
    { host: /^urldefense\.(?:com|us)$/i, path: /^\/v3\//i,
      fromPath: (url) => ppv3Decode(url.href) },
    // Barracuda LinkProtect: a= is the target, plain percent-encoding.
    // Same copy-only policy.
    { host: /^linkprotect\.cudasvc\.com$/i, path: /^\/url\/?$/i, params: ['a'] },
    // -- Affiliate networks (newsletter/deal-site wrappers, same class as
    // Skimlinks: pure trackers, click-skippable) ------------------------------
    // Partnerize: destination embedded in the PATH after '/destination:'.
    { host: /^(?:www\.)?prf\.hn$/i, path: /^\/click\//i,
      fromPath: (url) => {
        const i = url.href.indexOf('/destination:');
        if (i === -1) return null;
        const raw = url.href.slice(i + 13);
        if (/^https?:\/\//i.test(raw)) return raw;
        try { return decodeURIComponent(raw); } catch (_e) { return null; }
      } },
    // Awin: cread.php/awclick.php?...&ued=<encoded destination>.
    { host: /^(?:www\.)?awin1\.com$/i, path: /^\/(?:cread|awclick)\.php$/i, params: ['ued'] },
    // CJ (Commission Junction), classic five domains. Two link shapes:
    // /click-<pid>-<aid>?url=<encoded> and /links/<id>/type/dlg/<raw url>.
    { host: /^(?:www\.)?(?:anrdoezrs\.net|dpbolvw\.net|tkqlhce\.com|kqzyfj\.com|jdoqocy\.com)$/i,
      path: /^\/click-\d+/i, params: ['url'] },
    { host: /^(?:www\.)?(?:anrdoezrs\.net|dpbolvw\.net|tkqlhce\.com|kqzyfj\.com|jdoqocy\.com)$/i,
      path: /^\/links\//i,
      fromPath: (url) => {
        const i = url.href.indexOf('/http');
        if (i === -1) return null;
        return url.href.slice(i + 1);
      } },
    // Rakuten Advertising (LinkSynergy): murl= is the destination.
    { host: /^click\.linksynergy\.com$/i, path: /^\/(?:deeplink|link)\/?$/i, params: ['murl'] },
    // -- Ad-click wrappers: COPY-ONLY by policy -------------------------------
    // Unwrapping on copy gives the clean destination; these are deliberately
    // NOT in the click-skip filters — skipping would break advertiser click
    // accounting, which is neither our fight nor good store-review optics.
    { host: /^(?:www\.)?googleadservices\.com$/i, path: /^\/pagead\/aclk\/?$/i, params: ['adurl'] },
    { host: /^(?:www\.)?bing\.com$/i, path: /^\/aclick\/?$/i, params: ['u'] },
    // pixiv outbound wrapper: /jump.php?url=<enc> (modern) or the entire
    // query IS the percent-encoded target (legacy form).
    { host: /^(?:www\.)?pixiv\.net$/i, path: /^\/jump\.php$/i,
      fromPath: (url) => {
        const u = url.searchParams.get('url');
        if (u) return u;
        const q = url.search.slice(1);
        if (!q) return null;
        try { return decodeURIComponent(q); } catch (_e) { return null; }
      } },
    // DeviantArt outbound interstitial: raw target is the whole query.
    { host: /^(?:www\.)?deviantart\.com$/i, path: /^\/users\/outgoing$/i, rawQuery: true },
    // AMP viewers: target lives in the PATH. fromPath returns the
    // recovered URL (or null), replacing the params machinery.
    { host: /^(?:www\.)?google\.com$/i, path: /^\/amp\/.+/,
      fromPath: (url) => fromAmpRemainder(url.pathname.slice(5) + url.search + url.hash) },
    { host: /^(?:www\.)?bing\.com$/i, path: /^\/amp\/.+/i,
      fromPath: (url) => fromAmpRemainder(url.pathname.slice(5) + url.search + url.hash) },
    { host: /(?:^|\.)cdn\.ampproject\.org$/i, path: /^\/[cv]\/.+/i,
      fromPath: (url) => fromAmpRemainder(url.pathname.slice(3) + url.search + url.hash) },
  ];

  // Recover the real URL from an AMP viewer path remainder like
  // "s/www.example.com/article?x=1" (or without the leading "s/" for
  // plain http). Strips AMP transport params and fragments.
  const AMP_JUNK_PARAM = /^(?:amp_|usqp$|aoh$|amp$)/i;
  const AMP_JUNK_HASH = /^#(?:amp_|aoh=|csi=)/i;
  function fromAmpRemainder(remainder) {
    if (!remainder) return null;
    let rest = remainder;
    let scheme = 'http://';
    if (/^s\//i.test(rest)) { scheme = 'https://'; rest = rest.slice(2); }
    // Reject an empty host segment: 'amp/s//evil.com/x' would otherwise
    // normalize the path's first segment INTO the hostname.
    if (!rest || rest[0] === '/') return null;
    // AMP cache links often carry the target's query percent-encoded in
    // the path ('article%3fid%3d5'). If there's no literal '?', decode
    // the section after the first %3f so the query works again. On any
    // decode error the remainder is left exactly as it was.
    if (rest.indexOf('?') === -1) {
      const qIdx = rest.search(/%3f/i);
      if (qIdx !== -1) {
        try {
          rest = rest.slice(0, qIdx) + '?' + decodeURIComponent(rest.slice(qIdx + 3));
        } catch (_e) { /* keep rest unchanged */ }
      }
    }
    let t;
    try { t = new URL(scheme + rest); } catch (_e) { return null; }
    for (const name of Array.from(t.searchParams.keys())) {
      if (AMP_JUNK_PARAM.test(name)) t.searchParams.delete(name);
    }
    if (t.hash && AMP_JUNK_HASH.test(t.hash)) t.hash = '';
    return t.href;
  }

  // Strip publisher-side AMP markers that are safe without guessing.
  // Runs on the final unwrapped URL (and on directly-copied publisher
  // links that never had a wrapper). Idempotent; returns input on doubt.
  function stripPublisherAmp(input) {
    let url;
    try { url = new URL(input); } catch (_e) { return input; }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return input;
    let changed = false;
    // trailing /amp or /amp/ — only with at least one other segment
    const m = url.pathname.match(/^(\/.+?)\/amp\/?$/i);
    if (m && m[1] !== '') { url.pathname = m[1]; changed = true; }
    // .amp.html / .amp filename suffixes
    if (/\.amp\.html$/i.test(url.pathname)) { url.pathname = url.pathname.replace(/\.amp\.html$/i, '.html'); changed = true; }
    else if (/\.amp$/i.test(url.pathname)) { url.pathname = url.pathname.replace(/\.amp$/i, ''); changed = true; }
    // amp-marker query params (value-checked where the name is generic)
    for (const name of Array.from(url.searchParams.keys())) {
      const v = (url.searchParams.get(name) || '').toLowerCase();
      const n = name.toLowerCase();
      if ((n === 'amp' && (v === '' || v === '1' || v === 'true'))
          || ((n === 'outputtype' || n === 'output') && v === 'amp')) {
        url.searchParams.delete(name);
        changed = true;
      }
    }
    if (!changed) return input;
    const q = url.search;
    return `${url.protocol}//${url.host}${url.pathname}${q}${url.hash || ''}`;
  }

  // Validate a candidate target: must parse, must be http(s).
  function sanitizeTarget(target) {
    let t;
    try { t = new URL(target); } catch (_e) { return null; }
    if (t.protocol !== 'http:' && t.protocol !== 'https:') return null;
    return t.href;
  }

  // Unwrap ONE layer. Returns the target URL string, or null if `input`
  // isn't a recognized redirector (or the target isn't a sane http(s) URL).
  function unwrapOnce(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    for (const r of REDIRECTORS) {
      if (!r.host.test(url.hostname)) continue;
      if (!r.path.test(url.pathname)) continue;
      if (r.rawQuery) {
        const t = sanitizeTarget(url.search.slice(1));
        if (t) return t;
        continue;
      }
      if (r.fromPath) {
        const candidate = r.fromPath(url);
        if (candidate) {
          const t = sanitizeTarget(candidate);
          if (t) return t;
        }
        continue;
      }
      for (const p of r.params) {
        let target = url.searchParams.get(p);
        if (!target) continue;
        if (r.decode) {
          target = r.decode(target);
          if (!target) continue;
        }
        const t = sanitizeTarget(target);
        if (t) return t;
      }
    }
    return null;
  }

  // Unwrap up to 3 nested layers, then strip safe publisher-AMP markers
  // from whatever emerged. Returns the input unchanged when it isn't a
  // redirector and carries no AMP markers.
  function unwrapRedirects(input) {
    let current = typeof input === 'string' ? input : input.href;
    for (let i = 0; i < 3; i++) {
      const next = unwrapOnce(current);
      if (next === null) break;
      current = next;
    }
    return stripPublisherAmp(current);
  }

  const api = {
    unwrapOnce,
    unwrapRedirects,
    stripPublisherAmp,
    REDIRECTORS,
  };
  global.RedirectUnwrapper = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
