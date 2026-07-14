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

## Open questions for Tommy

1. Flights: aggregators-first scope OK? Airlines-direct only as marketing
   denylists?
2. Google Maps: worth the research spike knowing it may land as "partial"?
3. Which second pack after flights: local/food, real estate, or tickets?
