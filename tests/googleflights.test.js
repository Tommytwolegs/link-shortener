// Google Flights support lives inside src/google.js (path-scope addition,
// v1.10). This file covers the flights surface; tests/google.test.js keeps
// covering /search. Critical invariant: tfs= (the protobuf that IS the
// itinerary) and tfu/hl/gl/curr must NEVER be stripped.
const path = require('path');
const {
  shortenGoogleUrl,
  needsShortening,
  isFlightsUrl,
  isPostUrl,
} = require(path.join('..', 'src', 'google.js'));

const TFS = 'CBwQAhopEgoyMDI2LTA4LTAxagwIAhIIL20vMGQ2bHByDQgCEgkvbS8wMmZ0dGpAAUgBcAGCAQsI____________AZgBAQ';

const CASES = [
  // The itinerary blob survives — the whole point
  { name: 'tfs= survives untouched',
    input: 'https://www.google.com/travel/flights/search?tfs=' + TFS,
    expected: 'https://www.google.com/travel/flights/search?tfs=' + TFS,
    expectedNeeds: false },
  { name: 'tfu/hl/gl/curr survive alongside tfs',
    input: 'https://www.google.com/travel/flights?tfs=' + TFS + '&tfu=EgQIABABIgA&hl=en&gl=US&curr=USD',
    expected: 'https://www.google.com/travel/flights?tfs=' + TFS + '&tfu=EgQIABABIgA&hl=en&gl=US&curr=USD',
    expectedNeeds: false },

  // Junk strip around the blob
  { name: 'ved/sa/source stripped, tfs kept',
    input: 'https://www.google.com/travel/flights/search?tfs=' + TFS + '&ved=1t:1234&sa=X&source=flun',
    expected: 'https://www.google.com/travel/flights/search?tfs=' + TFS },
  { name: 'sxsrf/ictx/ei/utm stripped on landing page',
    input: 'https://www.google.com/travel/flights?sxsrf=ABc123&ictx=1&ei=xYz&utm_source=share',
    expected: 'https://www.google.com/travel/flights' },

  // Scope guards — flights logic must not leak to other paths
  { name: '/travel/hotels untouched (out of scope)',
    input: 'https://www.google.com/travel/hotels?ved=123',
    expected: null },
  { name: '/maps untouched (out of scope)',
    input: 'https://www.google.com/maps?ved=123',
    expected: null },
  { name: '/search still works (regression)',
    input: 'https://www.google.com/search?q=flights+to+tokyo&ved=abc&ei=def',
    expected: 'https://www.google.com/search?q=flights+to+tokyo' },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenGoogleUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}

check('isFlightsUrl: /travel/flights', isFlightsUrl('https://www.google.com/travel/flights'), true);
check('isFlightsUrl: /travel/flights/search', isFlightsUrl('https://www.google.com/travel/flights/search?tfs=x'), true);
check('isFlightsUrl: /travel/flights/booking (out of scope)', isFlightsUrl('https://www.google.com/travel/flights/booking'), false);
check('isFlightsUrl: /search', isFlightsUrl('https://www.google.com/search?q=x'), false);
check('isFlightsUrl: regional TLD rejected', isFlightsUrl('https://www.google.de/travel/flights'), false);
check('isPostUrl unchanged: search with q', isPostUrl('https://www.google.com/search?q=x'), true);
check('isPostUrl unchanged: flights is NOT a post url', isPostUrl('https://www.google.com/travel/flights?tfs=x'), false);

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
