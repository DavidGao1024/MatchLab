param(
  [string]$Dir  = 'F:\FM2024_LOGOS\FMG Standard Logos\Competitions\Normal\Normal',
  [string]$Out  = 'E:\GitHub\MatchLab\tmp\competitions-ocr.tsv',
  [string]$Lang = 'en-US'
)

Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]

function Await($WinRtTask, $ResultType) {
  $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
  $netTask = $asTask.Invoke($null, @($WinRtTask))
  $netTask.Wait(-1) | Out-Null
  $netTask.Result
}

[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime] | Out-Null
[Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime] | Out-Null

$engine = $null
try {
  $language = New-Object Windows.Globalization.Language($Lang)
  $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($language)
} catch { }
if ($null -eq $engine) { $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages() }
if ($null -eq $engine) { Write-Error 'no OCR engine available'; exit 2 }

$files = Get-ChildItem -LiteralPath $Dir -Filter '*.png' -File
$writer = New-Object System.IO.StreamWriter($Out, $false, [System.Text.Encoding]::UTF8)
$n = 0
foreach ($f in $files) {
  $n++
  try {
    $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($f.FullName)) ([Windows.Storage.StorageFile])
    $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    $result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
    $text = ($result.Text -replace '\s+', ' ').Trim()
    $stream.Dispose()
    if ($text.Length -gt 0) {
      $writer.WriteLine("$($f.BaseName)`t$text")
      $writer.Flush()
    }
  } catch { }
  if ($n % 500 -eq 0) { Write-Host "progress $n / $($files.Count)" }
}
$writer.Close()
Write-Host "done $n files"