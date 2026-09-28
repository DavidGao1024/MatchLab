param(
  [Parameter(Mandatory = $true)][string]$Files,
  [Parameter(Mandatory = $true)][string]$OutDir,
  [int]$R = 64, [int]$G = 64, [int]$B = 64
)

Add-Type -AssemblyName System.Drawing
if (-not (Test-Path -LiteralPath $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

$bg = [System.Drawing.Color]::FromArgb($R, $G, $B)
foreach ($f in ($Files -split ',')) {
  $f = $f.Trim()
  if (-not (Test-Path -LiteralPath $f)) { Write-Host "skip (missing): $f"; continue }
  $src = [System.Drawing.Image]::FromFile($f)
  $bmp = New-Object System.Drawing.Bitmap($src.Width, $src.Height)
  $g2 = [System.Drawing.Graphics]::FromImage($bmp)
  $g2.Clear($bg)
  $g2.DrawImage($src, 0, 0, $src.Width, $src.Height)
  $g2.Dispose()
  $name = [System.IO.Path]::GetFileNameWithoutExtension($f)
  $dest = Join-Path $OutDir ($name + '.png')
  $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $src.Dispose()
  Write-Host "ok: $dest"
}