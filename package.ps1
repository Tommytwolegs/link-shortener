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
# Chrome zip — manifest.json shipped as-is.
# ---------------------------------------------------------------------------

$chromeStage = New-Item -ItemType Directory -Force -Path (Join-Path $env:TEMP "ls-chrome-$([guid]::NewGuid().Guid)")
Copy-Item -Path 'manifest.json' -Destination $chromeStage.FullName
Copy-Item -Path 'src' -Destination $chromeStage.FullName -Recurse
Copy-Item -Path 'icons' -Destination $chromeStage.FullName -Recurse
Compress-Archive -Path (Join-Path $chromeStage.FullName '*') -DestinationPath $zipPath -CompressionLevel Optimal
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
        strict_min_version = '121.0'
        data_collection_permissions = [pscustomobject]@{
            required = @('none')
        }
    }
}) -Force

# Mozilla's add-ons linter requires a `background.scripts` fallback alongside
# `service_worker`. Order matters — URL modules must precede background.js
# since background.js uses self.*LinkShortener globals at top level.
$serviceWorker = $firefoxManifest.background.service_worker
$firefoxManifest.background = [pscustomobject]@{
    service_worker = $serviceWorker
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
        'src/utm.js',
        'src/background.js'
    )
}

$firefoxStage = New-Item -ItemType Directory -Force -Path (Join-Path $env:TEMP "ls-firefox-$([guid]::NewGuid().Guid)")
$firefoxManifest | ConvertTo-Json -Depth 50 | Out-File -FilePath (Join-Path $firefoxStage.FullName 'manifest.json') -Encoding utf8 -NoNewline
Copy-Item -Path 'src' -Destination $firefoxStage.FullName -Recurse
Copy-Item -Path 'icons' -Destination $firefoxStage.FullName -Recurse
# Compress-Archive only accepts .zip extensions; build as .zip in a temp
# location (separate from the Chrome zip we just made — collision would
# clobber it), then rename to .xpi. An xpi is just a zip with a different
# extension — Mozilla's tooling and Firefox itself read either interchangeably.
$xpiTempZip = Join-Path $env:TEMP "ls-firefox-$([guid]::NewGuid().Guid).zip"
Compress-Archive -Path (Join-Path $firefoxStage.FullName '*') -DestinationPath $xpiTempZip -CompressionLevel Optimal
Remove-Item -Force -ErrorAction SilentlyContinue $xpiPath
Move-Item -Force $xpiTempZip $xpiPath
Remove-Item -Recurse -Force $firefoxStage.FullName
Write-Host "Built $xpiPath"

# ---------------------------------------------------------------------------
# Quick verification
# ---------------------------------------------------------------------------

# Guardrail: Windows PowerShell 5.1's Compress-Archive writes zip entry
# names with backslash separators, which Chrome Web Store / AMO can reject
# ("invalid file name"). PowerShell 7+ writes forward slashes. Ver