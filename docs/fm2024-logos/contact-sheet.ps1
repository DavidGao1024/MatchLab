param(
  [Parameter(Mandatory = $true)][string]$Files,
  [Parameter(Mandatory = $true)][string]$Out,
  [int]$Cell = 200,
  [int]$Cols = 5
)

Add-Type -AssemblyName System.Drawing

$list = @()
foreach ($f in ($Files -split ',')) { $f = $f.Trim(); if (Test-Path -LiteralPath $f) { $list += $f } else { Write-Host "missing: $f" } }
if ($list.Count -eq 0) { Write-Error 'no files'; exit 1 }

$rows = [math]::Ceiling($list.Count / $Cols)
$w = $Cell * $Cols
$h = $Cell * $rows
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(40, 40, 40))
$font = New-Object System.Drawing.Font('Consolas', 11)
$brush = [System.Drawing.Brushes]::White
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(90, 90, 90))

for ($i = 0; $i -lt $list.Count; $i++) {
  $cx = ($i % $Cols) * $Cell
  $cy = [math]::Floor($i / $Cols) * $Cell
  $g.DrawRectangle($pen, $cx, $cy, $Cell - 1, $Cell - 1)

  $label = [System.IO.Path]::GetFileName($list[$i])
  $g.DrawString($label, $font, $brush, ($cx + 4), ($cy + 2))

  $src = [System.Drawing.Image]::FromFile($list[$i])
  $box = $Cell - 30
  $scale = [math]::Min($box / $src.Width, $box / $src.Height)
  $dw = [int]($src.Width * $scale); $dh = [int]($src.Height * $scale)
  $dx = $cx + [int](($Cell - $dw) / 2)
  $dy = $cy + 22 + [int](($box - $dh) / 2)
  $g.DrawImage($src, $dx, $dy, $dw, $dh)
  $src.Dispose()
}

$g.Dispose()
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "saved: $Out  ($($list.Count) images)"