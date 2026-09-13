# package.ps1 — Windows-native build script for both Chrome and Firefox packages.
#
# Outputs:
#   dist/link-shortener-<version>.zip   — Chrome Web Store package
#   dist/link-shortener-<version>.xpi   — Firefox AMO package
#
# Equivalent to package.sh but uses PowerShell's built-in Compress-Archive,
# so you don't need to install zip or WSL. Run from PowerShell:
#
#   cd "C:\Users\tommy\Documents\Projects\Link Shortener\link-shortener"
#   .\package.ps1
#
# If PowerShell complains about execution policy, run once:
#   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

# ---------------------------------------------------------------------------
# Guardrail: every JS file must parse cleanly before we package. Catches
# mid-line truncation, unterminated strings, missing braces, etc. — bugs
# that would otherwise silently ship a broken extension. This is what the
# v1.6.3 build cycle wanted: a truncated src/content.js made it into the
# xpi and got the package rejected by AMO with "JavaScript syntax error".
# ---------------------------------------------------------------------------
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Error "'node' is required for the parse-check guardrail. Install Node.js from https://nodejs.org"
    exit 1
}
Write-Host "Parse-checking JS files..."
$parseFailed = $false
Get-ChildItem -Path 'src' -Filter '*.js' -File | ForEach-Object {
    $output = & node --check $_.FullName 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  PARSE FAIL: $($_.Name)"
        Write-Host $output
        $parseFailed = $true
    }
}
if ($parseFailed) {
    Write-Error "One or more source files failed to parse; aborting build."
    exit 1
}
$jsCount = (Get-ChildItem -Path 'src' -Filter '*.js' -File).Count
Write-Host "  OK ($jsCount files)"

# Read version from manifest.
$manifest = Get-Content -Raw -Path 'manifest.json' | ConvertFrom-Json
$version = $manifest.version
Write-Host "Building version: $version"

$distDir = Join-Path $ScriptDir 'dist'
if (-not (Test-Path $distDir)) { New-Item -ItemType Directory -Path $distDir | Out-Null }

$zipPath = Join-Path $distDir "link-shortener-$version.zip"
$xpiPath = Join-Path $distDir "link-shortener-$version.xpi"

Remove-Item -Force -ErrorAction SilentlyContinue $zipPath, $xpiPath

# ---------------------------------------------------------------------------
# Zip helper. Windows PowerShell 5.1's Compress-Archive writes zip entry
# names with BACKSLASH separators, which AMO rejects ("Invalid file name in
# archive: icons\icon.svg") and which would break the extension on
# Mac/Linux if a store ever shipped it as-is. This helper zips via .NET and
# forces forward slashes in every entry name, on every PowerShell version.
# ---------------------------------------------------------------------------
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
function New-StoreZip([string]$SourceDir, [string]$DestPath) {
    if (Test-Path $DestPath) { Remove-Item -Force $DestPath }
    $src = (Get-Item $SourceDir).FullName
    $zip = [System.IO.Compression.ZipFile]::Open($DestPath, 'Create')
    try {
        Get-ChildItem -Path $src -Recurse -File | ForEach-Object {
            $rel = $_.FullName.Substring($src.Length + 1).Replace('\', '/')
            [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $zip, $_.FullName, $rel,
                [System.IO.Compression.CompressionLevel]::Optimal)
        }
    } finally {
        $zip.Dispose()
    }
}

# ---------------------------------------------------------------------------
# Chrome zip — manifest.json shipped as-is.
# ---------------------------------------------------------------------------

$chromeStage = New-Item -ItemType Directory -Force -Path (Join-Path $env:TEMP "ls-chrome-$([guid]::NewGuid().Guid)")
Copy-Item -Path 'manifest.json' -Destination $chromeStage.FullName
Copy-Item -Path 'src' -Destination $chromeStage.FullName -Recurse
Copy-Item -Path 'icons' -Destination $chromeStage.FullName -Recurse
Copy-Item -Path '_locales' -Destination $chromeStage.FullName -Recurse
New-StoreZip $chromeStage.FullName $zipPath
Remove-Item -Recurse -Force $chromeStage.FullName
Write-Host "Built $zipPath"

# ---------------------------------------------------------------------------
# Firefox xpi — manifest.json gets browser_specific_settings.gecko +
# background.scripts injected. Mirrors what package.sh does.
# ---------------------------------------------------------------------------

# Build the modified manifest via JSON manipulation. PowerShell's
# ConvertFrom-Json/ConvertTo-Json round-trip preserves field order well
# enough for review purposes.
$firefoxManifest = Get-Content -Raw -Path 'manifest.json' | ConvertFrom-Json

# Mozilla requires every add-on to declare data collection. We collect
# nothing — the extension makes zero network requests — so "none".
$firefoxManifest | Add-Member -NotePropertyName 'browser_specific_settings' -NotePropertyValue ([pscustomobject]@{
    gecko = [pscustomobject]@{
        id = 'link-shortener@tommytwolegs.github.io'
        strict_min_version = '140.0'
        data_collection_permissions = [pscustomobject]@{
            required = @('none')
        }
    }
    gecko_android = [pscustomobject]@{
        strict_min_version = '142.0'
    }
}) -Force

# Firefox ignores background.service_worker (and AMO warns about it), so
# the Firefox manifest ships ONLY background.scripts. Order matters — URL
# modules must precede background.js since background.js uses
# self.*LinkShortener globals at top level.
$firefoxManifest.background = [pscustomobject]@{
    scripts = @(
        'src/asin.js',
        'src/agoda.js',
        'src/booking.js',
        'src/expedia.js',
        'src/airbnb.js',
        'src/facebook.js',
        'src/instagram.js',
        'src/youtube.js',
        'src/twitter.js',
        'src/tiktok.js',
        'src/reddit.js',
        'src/spotify.js',
        'src/linkedin.js',
        'src/ebay.js',
        'src/etsy.js',
        'src/threads.js',
        'src/pinterest.js',
        'src/walmart.js',
        'src/target.js',
        'src/substack.js',
        'src/bluesky.js',
        'src/github.js',
        'src/medium.js',
        'src/quora.js',
        'src/shopee.js',
        'src/lazada.js',
        'src/aliexpress.js',
        'src/temu.js',
        'src/mercadolibre.js',
        'src/rakuten.js',
        'src/trip.js',
        'src/hotelscom.js',
        'src/coupang.js',
        'src/flipkart.js',
        'src/tokopedia.js',
        'src/mercari.js',
        'src/vinted.js',
        'src/allegro.js',
        'src/vrbo.js',
        'src/steam.js',
        'src/imdb.js',
        'src/stackoverflow.js',
        'src/wikipedia.js',
        'src/goodreads.js',
        'src/soundcloud.js',
        'src/applemusic.js',
        'src/twitch.js',
        'src/wayfair.js',
        'src/bestbuy.js',
        'src/bandcamp.js',
        'src/letterboxd.js',
        'src/tripadvisor.js',
        'src/meesho.js',
        'src/carousell.js',
        'src/taobao.js',
        'src/jd.js',
        'src/leboncoin.js',
        'src/olx.js',
        'src/wallapop.js',
        'src/marktplaats.js',
        'src/kleinanzeigen.js',
        'src/zalando.js',
        'src/netflix.js',
        'src/vimeo.js',
        'src/dailymotion.js',
        'src/waze.js',
        'src/zillow.js',
        'src/redfin.js',
        'src/realtor.js',
        'src/indeed.js',
        'src/glassdoor.js',
        'src/poshmark.js',
        'src/depop.js',
        'src/stockx.js',
        'src/goat.js',
        'src/grailed.js',
        'src/rottentomatoes.js',
        'src/metacritic.js',
        'src/genius.js',
        'src/discogs.js',
        'src/deezer.js',
        'src/tidal.js',
        'src/pandora.js',
        'src/gitlab.js',
        'src/bitbucket.js',
        'src/npm.js',
        'src/pypi.js',
        'src/dockerhub.js',
        'src/huggingface.js',
        'src/kaggle.js',
        'src/dropbox.js',
        'src/box.js',
        'src/wetransfer.js',
        'src/mediafire.js',
        'src/behance.js',
        'src/dribbble.js',
        'src/artstation.js',
        'src/flickr.js',
        'src/unsplash.js',
        'src/pexels.js',
        'src/deviantart.js',
        'src/pixiv.js',
        'src/pixabay.js',
        'src/shutterstock.js',
        'src/gettyimages.js',
        'src/freepik.js',
        'src/giphy.js',
        'src/tenor.js',
        'src/vsco.js',
        'src/smugmug.js',
        'src/adobestock.js',
        'src/alamy.js',
        'src/vecteezy.js',
        'src/istock.js',
        'src/dreamstime.js',
        'src/imgur.js',
        'src/rumble.js',
        'src/kick.js',
        'src/crunchyroll.js',
        'src/odysee.js',
        'src/myanimelist.js',
        'src/bitchute.js',
        'src/newgrounds.js',
        'src/coursera.js',
        'src/udemy.js',
        'src/khanacademy.js',
        'src/edx.js',
        'src/skillshare.js',
        'src/brilliant.js',
        'src/roblox.js',
        'src/fandom.js',
        'src/bilibili.js',
        'src/shein.js',
        'src/news.js',
        'src/google.js',
        'src/gdrive.js',
        'src/bing.js',
        'src/duckduckgo.js',
        'src/naver.js',
        'src/weather.js',
        'src/samsung.js',
        'src/kayak.js',
        'src/skyscanner.js',
        'src/flightaware.js',
        'src/flightradar24.js',
        'src/airlines.js',
        'src/netsuite.js',
        'src/atlassian.js',
        'src/notion.js',
        'src/loom.js',
        'src/figma.js',
        'src/primevideo.js',
        'src/ecosia.js',
        'src/startpage.js',
        'src/bravesearch.js',
        'src/kagi.js',
        'src/pubmed.js',
        'src/scholar.js',
        'src/researchgate.js',
        'src/yelp.js',
        'src/playstore.js',
        'src/appstore.js',
        'src/parcels.js',
        'src/kickstarter.js',
        'src/gofundme.js',
        'src/patreon.js',
        'src/meetup.js',
        'src/allrecipes.js',
        'src/seriouseats.js',
        'src/foodnetwork.js',
        'src/bbcgoodfood.js',
        'src/costco.js',
        'src/homedepot.js',
        'src/lowes.js',
        'src/ikea.js',
        'src/nike.js',
        'src/adidas.js',
        'src/epic.js',
        'src/gog.js',
        'src/humble.js',
        'src/itchio.js',
        'src/accuweather.js',
        'src/wunderground.js',
        'src/espn.js',
        'src/flashscore.js',
        'src/sofascore.js',
        'src/zhihu.js',
        'src/weibo.js',
        'src/shopify.js',
        'src/godaddy.js',
        'src/producthunt.js',
        'src/changeorg.js',
        'src/eventbrite.js',
        'src/yahoojp.js',
        'src/niconico.js',
        'src/daum.js',
        'src/gmarket.js',
        'src/elevenst.js',
        'src/myntra.js',
        'src/zomato.js',
        'src/swiggy.js',
        'src/bol.js',
        'src/otto.js',
        'src/mediamarkt.js',
        'src/cdiscount.js',
        'src/fnac.js',
        'src/trendyol.js',
        'src/hepsiburada.js',
        'src/noon.js',
        'src/jumia.js',
        'src/daraz.js',
        'src/americanas.js',
        'src/magalu.js',
        'src/wildberries.js',
        'src/ozon.js',
        'src/avito.js',
        'src/redirect.js',
        'src/texturl.js',
        'src/utm.js',
        'src/dnr.js',
        'src/siteopts.js',
        'src/background.js'
    )
}

$firefoxStage = New-Item -ItemType Directory -Force -Path (Join-Path $env:TEMP "ls-firefox-$([guid]::NewGuid().Guid)")
$firefoxManifest | ConvertTo-Json -Depth 50 | Out-File -FilePath (Join-Path $firefoxStage.FullName 'manifest.json') -Encoding utf8 -NoNewline
Copy-Item -Path 'src' -Destination $firefoxStage.FullName -Recurse
Copy-Item -Path 'icons' -Destination $firefoxStage.FullName -Recurse
Copy-Item -Path '_locales' -Destination $firefoxStage.FullName -Recurse
# An xpi is just a zip with a different extension — Mozilla's tooling and
# Firefox itself read either interchangeably, and New-StoreZip doesn't care
# about the extension.
New-StoreZip $firefoxStage.FullName $xpiPath
Remove-Item -Recurse -Force $firefoxStage.FullName
Write-Host "Built $xpiPath"

# ---------------------------------------------------------------------------
# Quick verification: no backslash entry names (AMO hard-rejects them and
# they break extraction on Mac/Linux), and each package's manifest version
# matches the source manifest.
# ---------------------------------------------------------------------------
$verifyFailed = $false
foreach ($pkg in @($zipPath, $xpiPath)) {
    $archive = [System.IO.Compression.ZipFile]::OpenRead($pkg)
    try {
        $bad = @($archive.Entries | Where-Object { $_.FullName.Contains('\') })
        if ($bad.Count -gt 0) {
            Write-Host "  VERIFY FAIL: $(Split-Path -Leaf $pkg) has backslash entry names, e.g. $($bad[0].FullName)"
            $verifyFailed = $true
        }
        $manifestEntry = $archive.Entries | Where-Object { $_.FullName -eq 'manifest.json' }
        $reader = New-Object System.IO.StreamReader($manifestEntry.Open())
        $pkgVersion = ($reader.ReadToEnd() | ConvertFrom-Json).version
        $reader.Dispose()
        if ($pkgVersion -ne $version) {
            Write-Host "  VERIFY FAIL: $(Split-Path -Leaf $pkg) manifest version is $pkgVersion, expected $version"
            $verifyFailed = $true
        }
    } finally {
        $archive.Dispose()
    }
}
if ($verifyFailed) {
    Write-Error "Package verification failed; do not upload these files."
    exit 1
}
Write-Host "Verified: forward-slash entry names, manifest version $version in both packages."