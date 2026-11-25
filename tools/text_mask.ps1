# 글자 모양(알파 마스크)을 그려 주는 도우미 (tools/ui_text.js 가 부름)
#   powershell -NoProfile -File tools/text_mask.ps1 <요청.json> <출력 폴더>
# 요청.json: [{"id":"a","text":"처음부터 시작","font":"Malgun Gothic","size":17,"bold":true,"w":136,"h":40,"maxWidth":124}, ...]
# 출력: <id>.mask (w*h 바이트, 0~255) 와 <id>.json ({"width": 실제 글자 폭, "size": 쓴 크기}).
# 글자는 상자 가운데에 놓는다. maxWidth 를 넘으면 글자 크기를 0.5씩 줄여 맞춘다.
param([Parameter(Mandatory)] [string]$Request, [Parameter(Mandatory)] [string]$OutDir)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$items = Get-Content -Raw -Encoding UTF8 $Request | ConvertFrom-Json
foreach ($it in $items) {
  $style = if ($it.bold) { [Drawing.FontStyle]::Bold } else { [Drawing.FontStyle]::Regular }
  $size = [double]$it.size
  $fmt = [Drawing.StringFormat]::GenericTypographic
  $fmt.FormatFlags = $fmt.FormatFlags -bor [Drawing.StringFormatFlags]::MeasureTrailingSpaces
  while ($true) {
    $font = New-Object Drawing.Font($it.font, [single]$size, $style, [Drawing.GraphicsUnit]::Pixel)
    $tmp = New-Object Drawing.Bitmap 8, 8
    $g = [Drawing.Graphics]::FromImage($tmp)
    $sz = $g.MeasureString([string]$it.text, $font, 4096, $fmt)
    $g.Dispose(); $tmp.Dispose()
    if (-not $it.maxWidth -or $sz.Width -le $it.maxWidth -or $size -le 8) { break }
    $font.Dispose(); $size -= 0.5
  }
  $bmp = New-Object Drawing.Bitmap ([int]$it.w), ([int]$it.h), ([Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [Drawing.Graphics]::FromImage($bmp)
  $g.Clear([Drawing.Color]::FromArgb(0, 0, 0, 0))
  $g.TextRenderingHint = [Drawing.Text.TextRenderingHint]::AntiAlias
  $g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
  # 세로 위치: 글꼴의 위·아래 여백을 빼고 실제 글자 높이(em) 기준으로 가운데
  $fam = $font.FontFamily
  $ascent = $size * $fam.GetCellAscent($style) / $fam.GetEmHeight($style)
  $x = ([double]$it.w - $sz.Width) / 2
  $cy = if ($null -ne $it.cy) { [double]$it.cy } else { [double]$it.h / 2 }
  $y = $cy - $ascent + $size * 0.42   # 글자 몸통 가운데가 cy 에 오도록 (한글·일본어 대략 0.42em)
  $g.DrawString([string]$it.text, $font, [Drawing.Brushes]::White, [single]$x, [single]$y, $fmt)
  $g.Dispose()
  $mask = New-Object byte[] ([int]$it.w * [int]$it.h)
  $rect = New-Object Drawing.Rectangle 0, 0, $bmp.Width, $bmp.Height
  $data = $bmp.LockBits($rect, [Drawing.Imaging.ImageLockMode]::ReadOnly, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $raw = New-Object byte[] ($data.Stride * $bmp.Height)
  [Runtime.InteropServices.Marshal]::Copy($data.Scan0, $raw, 0, $raw.Length)
  $bmp.UnlockBits($data)
  for ($yy = 0; $yy -lt $bmp.Height; $yy++) { for ($xx = 0; $xx -lt $bmp.Width; $xx++) { $mask[$yy * $bmp.Width + $xx] = $raw[$yy * $data.Stride + $xx * 4 + 3] } }
  [IO.File]::WriteAllBytes((Join-Path $OutDir "$($it.id).mask"), $mask)
  ('{"width":' + [math]::Round($sz.Width, 1) + ',"size":' + $size + '}') | Set-Content -Encoding ASCII (Join-Path $OutDir "$($it.id).json")
  $bmp.Dispose(); $font.Dispose()
}
Write-Output "masks: $($items.Count)"
