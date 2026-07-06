const path = require('path');
const {
  shortenMercadolibreUrl,
  needsShortening,
  isMercadolibreHost,
  isPostUrl,
} = require(path.join('..', 'src', 'mercadolibre.js'));

const CASES = [

  { name: 'item page already clean',
    input: 'https://articulo.mercadolibre.com.mx/MLM-1234567890-producto-increible-_JM',
    expected: 'https://articulo.mercadolibre.com.mx/MLM-1234567890-producto-increible-_JM',
    expectedNeeds: false },
  { name: 'tracking hash STRIPPED (documented exception)',
    input: 'https://articulo.mercadolibre.com.mx/MLM-1234567890-producto-increible-_JM#polycard_client=search-nordic&position=3&search_layout=stack&type=item&tracking_id=abc-123',
    expected: 'https://articulo.mercadolibre.com.mx/MLM-1234567890-producto-increible-_JM' },
  { name: 'query junk stripped',
    input: 'https://articulo.mercadolibre.com.ar/MLA-987654321-cosa-buena-_JM?pdp_filters=condition%3Anew&deal_print_id=abc&tracking_id=def',
    expected: 'https://articulo.mercadolibre.com.ar/MLA-987654321-cosa-buena-_JM' },
  { name: 'searchVariation (variant selector) PRESERVED',
    input: 'https://articulo.mercadolibre.com.mx/MLM-1234567890-producto-_JM?searchVariation=987654&tracking_id=x#polycard_client=search',
    expected: 'https://articulo.mercadolibre.com.mx/MLM-1234567890-producto-_JM?searchVariation=987654' },
  { name: 'catalog /p/ form cleaned',
    input: 'https://www.mercadolibre.com.mx/p/MLM12345678?pdp_filters=x#reco_item_pos=1',
    expected: 'https://www.mercadolibre.com.mx/p/MLM12345678' },
  { name: 'Brazil (mercadolivre, MLB) cleaned',
    input: 'https://produto.mercadolivre.com.br/MLB-1122334455-produto-otimo-_JM?tracking_id=abc',
    expected: 'https://produto.mercadolivre.com.br/MLB-1122334455-produto-otimo-_JM' },
  { name: 'Chile TLD already clean',
    input: 'https://articulo.mercadolibre.cl/MLC-555-cosa-_JM',
    expected: 'https://articulo.mercadolibre.cl/MLC-555-cosa-_JM',
    expectedNeeds: false },
  { name: 'search page → null',
    input: 'https://listado.mercadolibre.com.mx/mouse-inalambrico',
    expected: null },
  { name: 'home → null',
    input: 'https://www.mercadolibre.com.mx/',
    expected: null },
  { name: 'lookalike → null',
    input: 'https://mercadolibre.evil.com/MLM-1-x-_JM',
    expected: null },
];

let passed = 0, failed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, actual, expected }); }
}
for (const c of CASES) {
  const got = shortenMercadolibreUrl(c.input);
  check('shorten - ' + c.name, got, c.expected);
  let expectedNeeds;
  if ('expectedNeeds' in c) expectedNeeds = c.expectedNeeds;
  else if (c.expected === null) expectedNeeds = false;
  else expectedNeeds = c.input !== c.expected;
  check('needs   - ' + c.name, needsShortening(c.input), expectedNeeds);
}
check('isMercadolibreHost: mercadolibre.com.mx', isMercadolibreHost('mercadolibre.com.mx'), true);
check('isMercadolibreHost: articulo.mercadolibre.com.ar', isMercadolibreHost('articulo.mercadolibre.com.ar'), true);
check('isMercadolibreHost: produto.mercadolivre.com.br', isMercadolibreHost('produto.mercadolivre.com.br'), true);
check('isMercadolibreHost: mercadolibre.evil.com', isMercadolibreHost('mercadolibre.evil.com'), false);
check('isPostUrl: item', isPostUrl('https://articulo.mercadolibre.com.mx/MLM-1-x-_JM'), true);
check('isPostUrl: search', isPostUrl('https://listado.mercadolibre.com.mx/mouse'), false);
check('shorten on garbage', shortenMercadolibreUrl('not a url'), null);
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
