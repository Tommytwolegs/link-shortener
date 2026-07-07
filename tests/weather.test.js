const path = require('path');
const {
  shortenWeatherUrl,
  needsShortening,
  isWeatherHost,
  isPostUrl,
} = require(path.join('..', 'src', 'weather.js'));

const CASES = [
  // Canonical
  { name: 'tenday forecast already clean',
    input: 'https://weather.com/weather/tenday/l/8bb5e2e3f8bd1a19a9a4a2b6f9f18b52f27acf8e4c1e7c5c9a3d2b1a0f9e8d7c',
    expected: 'https://weather.com/weather/tenday/l/8bb5e2e3f8bd1a19a9a4a2b6f9f18b52f27acf8e4c1e7c5c9a3d2b1a0f9e8d7c',
    expectedNeeds: false },

  // Tracking strip
  { name: 'par partner attribution stripped',
    input: 'https://weather.com/weather/today/l/USNY0996?par=google',
    expected: 'https://weather.com/weather/today/l/USNY0996' },
  { name: 'Coremetrics campaign junk stripped',
    input: 'https://weather.com/weather/hourbyhour/l/USNY0996?cm_ven=dnt_social&cm_cat=twitter&cm_pla=forecast&cm_ite=share',
    expected: 'https://weather.com/weather/hourbyhour/l/USNY0996' },
  { name: 'traffic_source + utm stripped',
    input: 'https://weather.com/news/weather/some-article?traffic_source=Connatix&utm_source=fb',
    expected: 'https://weather.com/news/weather/some-article' },
  { name: 'locale path untouched',
    input: 'https://weather.com/es-US/tiempo/hoy/l/USNY0996?par=samsung_widget',
    expected: 'https://weather.com/es-US/tiempo/hoy/l/USNY0996' },

  // Denylist: unknown params survive
  { name: 'unknown params untouched',
    input: 'https://weather.com/weather/today/l/USNY0996?unit=m',
    expected: 'https://weather.com/weather/today/l/USNY0996?unit=m',
    expectedNeeds: false },

  // Hash preservation
  { name: 'hash preserved',
    input: 'https://weather.com/weather/today/l/USNY0996?par=google#humidity',
    expected: 'https://weather.com/weather/today/l/USNY0996#humidity' },

  // Non-weather
  { name: 'lookalike -> null',
    input: 'https://notweather.com/weather/today?par=google',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenWeatherUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isWeatherHost: weather.com', isWeatherHost('weather.com'), true);
check('isWeatherHost: www.weather.com', isWeatherHost('www.weather.com'), true);
check('isWeatherHost: lookalike', isWeatherHost('notweather.com'), false);
check('isPostUrl: has junk', isPostUrl('https://weather.com/weather/today/l/X?par=g'), true);
check('isPostUrl: clean', isPostUrl('https://weather.com/weather/today/l/X'), false);
check('shorten on garbage', shortenWeatherUrl('not a url'), null);
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
