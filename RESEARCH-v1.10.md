# v1.10 research notes

Scoping doc for the next version. Nothing here is built; every URL shape
marked VERIFY needs the usual live check before a module ships (the
corpus-test pipeline stays: research -> module + tests -> wiring -> audit).

---

## 1. Flights (Tommy's headline idea)

Key finding from initial research: the big airlines are mostly the WRONG
target for itinerary links; the aggregators and trackers are the right one.

### Why airlines-direct is low value for itineraries

Delta, United, and American all run booking searches through session state:
the URL usually carries no complete itinerary, so there's nothing shareable
to clean. Manage-booking links carry PNR confirmation codes, which are
sensitive and should never be "cleaned and shared" anyway. Sources:
- https://skyscannerpartnersupport.zendesk.com/hc/en-us/articles/115005275369-Deeplinks
- https://developers.skyscanner.net/docs/referrals/flights-parameters
- delta.com/my-trips, united.com manageres, aa.com/booking/find-flights
  (all code+name lookup flows, not shareable URLs)

### What IS worth building

**Tier 1 — flight aggregators (path-carried itineraries, heavy junk):**
- Kayak (kayak.com/flights/SFO-JFK/2026-08-01/2026-08-05...): itinerary in
  the PATH. Junk to VERIFY: sort=, fs=, ucs=, attempt/session params.
  Momondo is the same family; check if shapes match.
- Skyscanner (skyscanner.com/transport/flights/sfo/jfk/260801/): path-based.
  Junk to VERIFY: rtn=, adultsv2=, ref=, previousCultureSource=,
  redirectedFrom=. Many ccTLDs (skyscanner.net/.de/.fr...).
- Kiwi.com: mixed path/query. VERIFY.
- Google Flights (google.com/travel/flights?tfs=...): tfs= is a protobuf
  blob that IS the itinerary — must be kept. Junk around it: VERIFY
  (hl/gl are locale-ish, tfu=, sa=, ved=). CAUTION: our google.js is
  deliberately scoped to /search only; flights means widening scope to
  /travel/flights. Do it as a separate module or a careful scope addition,
  never a blanket google.com match.

**Tier 2 — flight-status trackers (extremely shareable "which flight are
you on" links):**
- FlightAware (flightaware.com/live/flight/UAL123): clean paths already;
  VERIFY what junk shared links carry.
- Flightradar24 (flightradar24.com/UAL123/<id>): VERIFY.

**Tier 3 — extend the EXISTING travel modules to flight paths:**
- Expedia /Flights-Search: leg1/leg2/trip/passengers are functional (keep),
  semdtl= and friends are junk (VERIFY list). Booking.com/flights (it's a
  Kayak white-label? VERIFY). Trip.com flights paths.
- These modules are currently property-page focused; flight search paths
  probably fall through to null today. Denylist additions, same pattern as
  the v1.8 fallback work.

**Tier 4 — airlines as marketing-junk denylists (NOT itineraries):**
Links from airline emails/promos carry cid=, cmp=, WT.mc_id=, mkwid=, utm_*.
A samsung.js-style host-wide denylist per carrier is safe (functional params
untouched by construction; the Samsung OAuth test precedent applies — check
check-in/auth flows in the battery). Candidates by traffic: Delta, United,
American, Southwest, Ryanair, easyJet, Lufthansa, Air France/KLM, British
Airways, Emirates, Qatar, Turkish, IndiGo, LATAM. NOTE: Ryanair/easyJet/Wizz
actually have query-functional deep-linkable searches (dateOut=,
originIata=...) — denylist keeps those working automatically.

Suggested v1.10 scope: Kayak, Skyscanner, Google Flights, FlightAware,
Flightradar24 + Expedia/Trip flight-path extensions + 6-10 airline
denylists. Popup: new "Travel" subhead or "Flights" subhead.

---

## 2. Other candidate packs (unranked ideas, pick per session)

**Local & food (very high share volume):**
- Yelp: /biz/<slug>?osq=&hrid=&utm_* — heavy junk. Easy denylist.
- OpenTable + Resy: reservation/restaurant shares. VERIFY shapes.
- DoorDash, UberEats, Grubhub, Deliveroo, Just Eat, Instacart: store links
  shared in group chats constantly. VERIFY (some may be app-first).
- Google Maps: THE most-wanted, and the hardest. Place URLs carry
  !data= blobs that are partly functional; maps.app.goo.gl short links are
  server-side (can't unwrap without network — out of scope). Research
  carefully before promising anything.

**Real estate (couples share these all day):**
- Zillow (/homedetails/<slug>/<zpid>_zpid/), Redfin, Realtor.com,
  Rightmove + Zoopla (UK), Idealista (ES/IT), ImmobilienScout24 (DE),
  SeLoger (FR). All VERIFY.

**Jobs:** Indeed (jk= is the job id — functional; tons of junk around it),
Glassdoor, LinkedIn /jobs deeper forms.

**Tickets & events:** Ticketmaster (camefrom=, affiliate junk), StubHub,
SeatGeek, Eventbrite (CAREFUL: aff= is affiliate but discount/promo codes
are functional).

**Streaming leftovers:** Prime Video (primevideo.com /detail/<id>?ref_= —
Amazon-family junk, easy win), Disney+, Max, Hulu, Crunchyroll. VERIFY how
much junk their share buttons actually add.

**More unwrappers (zero-network rule holds):**
- youtube.com/attribution_link?u= (URL-embedded, fits redirect.js today)
- Skimlinks: go.redirectingat.com?url= ; shop-links.co — VERIFY param names
- NOT possible (server-side, would need network): t.co, bit.ly, amzn.to,
  maps.app.goo.gl, lnkd.in, news.google.com/articles

**Product/infra carryovers:**
- Badge counter (params stripped on current page) — user deferred, still open
- i18n (_locales) — popup + store listings; helps KR/JP/DE/FR/BR conversion
- Per-outlet mid-path /amp/ handling via news.js outlet data (nbcnews,
  dailymail style) — only with per-outlet verification
- Sites-registry phase 2: flip check-wiring.js into a generator
- Edge Add-ons submission (same zip, STORE_LISTING section ready)
- Firefox for Android: enable on AMO listing, phone smoke test
- homepage_url -> https://jimothylinks.com + privacy URL swap on all
  listings once the site is live

---

## 3. Second batch of ideas (added after first pass)

**Live "try it" demo on jimothylinks.com.** The URL modules are
dependency-free IIFEs, so the landing page can load the REAL cleaning code
and offer a "paste your ugliest link" box that cleans it live in the
visitor's browser. Try-before-install, zero backend, and it doubles as a
shareable web tool. Same trick enables a batch cleaner page: paste a whole
newsletter draft, every URL inside gets cleaned. Probably the highest
marketing value per hour of work on this list.

**"This link didn't clean right" reporter.** A context-menu item that opens
a prefilled GitHub issue (URL + expected vs got) in a new tab. User-initiated,
so the zero-network rule holds. Turns users into the coverage-gap radar and
feeds the site pipeline forever.

**Local stats + brag card.** Count links cleaned and characters removed
(stored locally, never transmitted). Popup shows "12,483 characters of junk
removed this month" and can render a shareable image card via canvas.
This resurrects the declined badge-counter idea in a form that markets
itself.

**Safari / iOS port.** Safari supports web extensions on Mac AND iPhone, and
iMessage is where junk links circulate most. Cost: Xcode conversion, a Mac
build step, Apple developer account (USD 99/yr), some API differences to
audit (event page model, storage.sync limits). Biggest reach unlock left.

**Privacy-search + academic packs.** Ecosia, Startpage, Brave Search, Kagi:
tiny modules, and their users are exactly this extension's audience. Academic:
PubMed (heavy junk), Google Scholar, ResearchGate; arXiv and doi.org are
already clean. Niche but very sticky users who write blog posts.

**Optional text-fragment stripping.** #:~:text= highlight fragments are kept
today (functional), but they reveal what the sharer highlighted, which some
consider a privacy leak. An off-by-default toggle "strip highlight
fragments" serves the privacy-maximalist crowd cheaply.

**Enterprise angle riding SafeLinks.** The Outlook SafeLinks fixer is an IT
department feature. Adding a managed-storage schema (storage.managed) lets
admins pre-configure toggles by policy and deploy via Chrome Enterprise /
group policy. Small code, opens a distribution channel no competitor here
occupies.

**AMO "Recommended" application.** Firefox's curated program is a major
install driver and this extension's profile (zero permissions creep, zero
data, readable source, big test suite) is exactly what their curators want.
Process work, not code. Research the current application path.

## 4. Work tools pack (Tommy's NetSuite find)

Tommy's example, from his own browser:

    https://3356652.app.netsuite.com/app/common/item/item.nl?id=86757
      &siaT=1783620245509&siaWhc=%2Fapp%2F...&siaPs=0&siaPfx=&siaQ=23005MAL&siaNv=gs

Dissection: id= is the record and must stay. The sia* family is
"search in app" breadcrumb state (siaT timestamp, siaQ the search query
the user typed, siaWhc where-came-from, siaPs/siaPfx/siaNv nav state);
the record loads fine with just id=. whence= is another back-navigation
breadcrumb, also strippable. So the clean form is:

    https://3356652.app.netsuite.com/app/common/item/item.nl?id=86757

Module shape: host /(?:^|\.)app\.netsuite\.com$/ (accounts are
subdomains, wildcard host permission *://*.app.netsuite.com/*),
denylist = sia prefix + whence. KEEP e=T (edit mode is functional) and
everything else. VERIFY sia is exclusively the search-breadcrumb prefix,
and run the auth-flow battery (login/SSO pages on the same host).

Note the audience shift: these are logged-in tools, so cleaned links only
work for colleagues with access. That is exactly who they get shared with
(Slack, Teams, tickets), so the value is real. It also feeds the
enterprise angle from section 3.

Other B2B systems with the same disease, all VERIFY:
- Jira + Confluence: atlOrigin= on every shared link is pure share
  tracking. Huge volume. jira.atlassian.net wildcard would be
  *://*.atlassian.net/*.
- Notion: ?pvs= on shared pages is junk; the page id in the path is
  functional.
- Loom: loom.com/share/<id>?sid= where sid is share tracking.
- Figma: file key + node-id are functional; check t= and other extras.
- Salesforce Lightning: /lightning/r/<obj>/<id>/view paths are already
  clean; check what their share buttons append.
- ServiceNow, Zendesk agent links, HubSpot, Airtable, Miro: unresearched.
- DO NOT touch: Zoom/Teams meeting links (pwd= and context params are
  functional), SharePoint/OneDrive share links (the token IS the access).

## Open questions for Tommy

1. Flights: aggregators-first scope OK? Airlines-direct only as marketing
   denylists?
2. Google Maps: worth the research spike knowing it may land as "partial"?
3. Which second pack after flights: local/food, real estate, or tickets?
