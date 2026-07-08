# make-store-screenshot.ps1
#
# Turns any screenshot into a Chrome Web Store / AMO compliant image:
#   - exactly 1280x800
#   - 24-bit PNG with NO alpha channel (the store rejects alpha)
#   - source image centered on a dark canvas matching the popup theme
#
# Usage (any directory, any PowerShell window):
#   & "C:\Users\tommy\Documents\Projects\Link Shortener\link-shortener\scripts\make-store-screenshot.ps1" "C:\path\to\your\screenshot.png"
#
# Output lands next to the input as <name>-1280x800.png

param(
  [Parameter(Mandatory = $true)][string]$Path
)

Add-Type -AssemblyName System.Drawing

$resolved = (Resolve-Path $Path).Path
$src = [System.Drawing.Image]::FromFile($resolved)

$W = 1280; $H = 800; $margin = 30
$bmp = New-Object System.Drawing.Bitmap($W, $H, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

# Dark canvas matching the popup's dark-mode background.
$g.Clear([System.Drawing.ColorTranslator]::FromHtml('#0F1419'))

# Fit the source inside the canvas, but cap upscaling so small popup
# captures don't get blurry.
$scale = [Math]::Min(($W - 2 * $margin) / $src.Width, ($H - 2 * $margin) / $src.Height)
if ($scale -gt 1.35) { $scale = 1.35 }
$dw = [int]($src.Width * $scale)
$dh = [int]($src.Height * $scale)
$dx = [int](($W - $dw) / 2)
$dy = [int](($H - $dh) / 2)
$g.DrawImage($src, $dx, $dy, $dw, $dh)

$g.Dispose()
$src.Dispose()

$dir = Split-Path $resolved -Parent
$name = [System.IO.Path]::GetFileNameWithoutExtension($resolved)
$out = Join-Path $dir ($name + '-1280x800.png')
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Write-Host "Wrote $out  (1280x800, 24-bit PNG, no alpha)"
