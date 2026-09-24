# Genera los íconos de TurnosApp para Android (launcher + adaptativos + notificación) y PWA.
# Uso: pwsh -File scripts/gen-icons.ps1
#
# Si existe la carpeta scripts/launcher_icons/ con el pack (ic_launcher_mdpi.png ...
# ic_launcher_play.png), se copia ESE pack tal cual (diseño del usuario). En caso
# contrario se genera el diseño por código (glifo "T").
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$resDir = Join-Path $root 'android\app\src\main\res'
$packDir = Join-Path $PSScriptRoot 'launcher_icons'
$usePack = Test-Path (Join-Path $packDir 'ic_launcher_play.png')

function New-PathRoundedRect([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

# Dibuja el glifo: "T" blanca + sol (amarillo) + luna (azul oscuro con anillo claro)
function Draw-Glyph($g, [float]$s, [float]$cyPos) {
  $font = New-Object System.Drawing.Font('Arial Black', [float]($s * 0.30), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $brushWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
  $g.DrawString('T', $font, $brushWhite, [System.Drawing.RectangleF]::new(0, ($s * $cyPos - 0.12) * $s, $s, $s * 0.55), $sf)
  $brushWhite.Dispose(); $sf.Dispose(); $font.Dispose()

  $rSun = $s * 0.055
  $sun = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 251, 191, 36))
  $g.FillEllipse($sun, [System.Drawing.RectangleF]::new($s * 0.34, $s * 0.72, $rSun * 2, $rSun * 2))
  $sun.Dispose()

  $rMoon = $s * 0.05
  $moon = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 30, 58, 138))
  $g.FillEllipse($moon, [System.Drawing.RectangleF]::new($s * 0.61, $s * 0.72, $rMoon * 2, $rMoon * 2))
  $moon.Dispose()
  $ring = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 191, 219, 254), [float]($s * 0.012))
  $g.DrawEllipse($ring, [System.Drawing.RectangleF]::new($s * 0.61, $s * 0.72, $rMoon * 2, $rMoon * 2))
  $ring.Dispose()
}

# Aplica esquinas redondeadas a un PNG cuadrado (para la variante round)
function New-RoundedIcon([System.Drawing.Image]$src, [int]$size) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
  $r = [int]($size * 0.18)
  $path = New-PathRoundedRect 0 0 $size $size $r
  $g.SetClip($path)
  $srcRect = New-Object System.Drawing.Rectangle(0, 0, $src.Width, $src.Height)
  $dstRect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
  $g.DrawImage($src, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.ResetClip()
  $g.Dispose()
  $path.Dispose()
  return $bmp
}

# Ícono legado: fondo azul con esquinas redondeadas + glifo
function New-LauncherIcon([int]$size, [bool]$round) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))

  $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    [System.Drawing.PointF]::new(0, 0),
    [System.Drawing.PointF]::new(0, $size),
    [System.Drawing.Color]::FromArgb(255, 37, 99, 235),
    [System.Drawing.Color]::FromArgb(255, 67, 56, 202))

  if ($round) {
    $g.FillEllipse($grad, 0, 0, $size, $size)
  } else {
    $path = New-PathRoundedRect 0 0 $size $size ($size * 0.22)
    $g.FillPath($grad, $path)
    $path.Dispose()
  }
  $grad.Dispose()

  Draw-Glyph $g $size 0.40
  $g.Dispose()
  return $bmp
}

# Foreground adaptativo: solo glifo sobre fondo transparente (el fondo lo da el color)
function New-AdaptiveForeground([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
  Draw-Glyph $g $size 0.44
  $g.Dispose()
  return $bmp
}

# ─── Densidades launcher (px) ───
$densities = @{ mdpi = 48; hdpi = 72; xhdpi = 96; xxhdpi = 144; xxxhdpi = 192 }
foreach ($d in $densities.Keys) {
  $size = $densities[$d]
  $dir = Join-Path $resDir "mipmap-$d"

  if ($usePack) {
    # Copiar el pack del usuario (el tamaño ya coincide con la densidad)
    Copy-Item (Join-Path $packDir "ic_launcher_${d}.png") (Join-Path $dir 'ic_launcher.png') -Force
    # Versión round: esquinas redondeadas sobre el mismo PNG
    $src = [System.Drawing.Image]::FromFile((Join-Path $packDir "ic_launcher_${d}.png"))
    $b2 = New-RoundedIcon $src $size
    $src.Dispose()
    $b2.Save((Join-Path $dir 'ic_launcher_round.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    $b2.Dispose()
    continue
  }

  $b1 = New-LauncherIcon $size $false
  $b1.Save((Join-Path $dir 'ic_launcher.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $b1.Dispose()
  $b2 = New-LauncherIcon $size $true
  $b2.Save((Join-Path $dir 'ic_launcher_round.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $b2.Dispose()
}

# ─── Foreground adaptativo 108dp → px ───
$fgPx = @{ mdpi = 108; hdpi = 162; xhdpi = 216; xxhdpi = 324; xxxhdpi = 432 }
foreach ($d in $fgPx.Keys) {
  $dir = Join-Path $resDir "mipmap-$d"
  if ($usePack) {
    # Ícono centrado al 67% del canvas adaptativo (safe-zone)
    $src = [System.Drawing.Image]::FromFile((Join-Path $packDir "ic_launcher_${d}.png"))
    $fgSize = $fgPx[$d]
    $b = New-Object System.Drawing.Bitmap($fgSize, $fgSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($b)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
    $drawSize = [int]($fgSize * 0.67)
    $x = [int](($fgSize - $drawSize) / 2)
    $srcRect = New-Object System.Drawing.Rectangle(0, 0, $src.Width, $src.Height)
    $dstRect = New-Object System.Drawing.Rectangle($x, $x, $drawSize, $drawSize)
    $g.DrawImage($src, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $src.Dispose()
    $b.Save((Join-Path $dir 'ic_launcher_foreground.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    $b.Dispose()
    continue
  }
  $b = New-AdaptiveForeground $fgPx[$d]
  $b.Save((Join-Path $dir 'ic_launcher_foreground.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $b.Dispose()
}

# ─── Notificación (T blanca transparente, o pack si está disponible) ───
if ($usePack) {
  $notif = New-Object System.Drawing.Bitmap(72, 72, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($notif)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
  $srcBig = [System.Drawing.Image]::FromFile((Join-Path $packDir 'ic_launcher_play.png'))
  $srcRect = New-Object System.Drawing.Rectangle(0, 0, $srcBig.Width, $srcBig.Height)
  $dstRect = New-Object System.Drawing.Rectangle(0, 0, 72, 72)
  $g.DrawImage($srcBig, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $srcBig.Dispose()
  $notif.Save((Join-Path $resDir 'drawable\ic_stat_turnos.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $notif.Dispose()
} else {
  $notif = New-Object System.Drawing.Bitmap(72, 72, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($notif)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
  Draw-Glyph $g 72 0.40
  $g.Dispose()
  $notif.Save((Join-Path $resDir 'drawable\ic_stat_turnos.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $notif.Dispose()
}

# ─── PWA ───
foreach ($sz in @(192, 512)) {
  if ($usePack) {
    $b = New-Object System.Drawing.Bitmap($sz, $sz, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($b)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
    $srcBig = [System.Drawing.Image]::FromFile((Join-Path $packDir 'ic_launcher_play.png'))
    $srcRect = New-Object System.Drawing.Rectangle(0, 0, $srcBig.Width, $srcBig.Height)
    $dstRect = New-Object System.Drawing.Rectangle(0, 0, $sz, $sz)
    $g.DrawImage($srcBig, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $srcBig.Dispose()
    $b.Save((Join-Path $root "public\pwa-$sz`x$sz.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $b.Dispose()
    continue
  }
  $b = New-LauncherIcon $sz $false
  $b.Save((Join-Path $root "public\pwa-$sz`x$sz.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $b.Dispose()
}

Write-Host 'Iconos generados OK.'