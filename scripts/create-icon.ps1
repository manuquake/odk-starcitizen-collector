param(
  [string]$SourceImage = $(Join-Path $PSScriptRoot '..\assets\odk-clan-logo.jpg'),
  [string]$OutputIcon = $(Join-Path $PSScriptRoot '..\release\staging\starcitizen-collector-windows\ODK-StarCitizen-Collector.ico')
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

function New-IconPngFrame {
  param(
    [System.Drawing.Image]$Source,
    [int]$Size
  )

  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $scale = [Math]::Min($Size / $Source.Width, $Size / $Source.Height)
    $drawWidth = [int][Math]::Round($Source.Width * $scale)
    $drawHeight = [int][Math]::Round($Source.Height * $scale)
    $drawX = [int][Math]::Floor(($Size - $drawWidth) / 2)
    $drawY = [int][Math]::Floor(($Size - $drawHeight) / 2)

    $graphics.DrawImage($Source, $drawX, $drawY, $drawWidth, $drawHeight)

    $memory = New-Object System.IO.MemoryStream
    try {
      $bitmap.Save($memory, [System.Drawing.Imaging.ImageFormat]::Png)
      return $memory.ToArray()
    }
    finally {
      $memory.Dispose()
    }
  }
  finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

function Write-IconFile {
  param(
    [string]$Path,
    [array]$Frames
  )

  $directory = Split-Path -Parent $Path
  if ($directory) {
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
  }

  $stream = [System.IO.File]::Create($Path)
  $writer = New-Object System.IO.BinaryWriter $stream
  try {
    $writer.Write([UInt16]0)
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]$Frames.Count)

    $offset = 6 + (16 * $Frames.Count)
    foreach ($frame in $Frames) {
      $sizeByte = if ($frame.Size -eq 256) { 0 } else { [byte]$frame.Size }
      $writer.Write([byte]$sizeByte)
      $writer.Write([byte]$sizeByte)
      $writer.Write([byte]0)
      $writer.Write([byte]0)
      $writer.Write([UInt16]1)
      $writer.Write([UInt16]32)
      $writer.Write([UInt32]$frame.Bytes.Length)
      $writer.Write([UInt32]$offset)
      $offset += $frame.Bytes.Length
    }

    foreach ($frame in $Frames) {
      $writer.Write([byte[]]$frame.Bytes)
    }
  }
  finally {
    $writer.Dispose()
    $stream.Dispose()
  }
}

if (-not (Test-Path -LiteralPath $SourceImage -PathType Leaf)) {
  throw "Immagine sorgente non trovata: $SourceImage"
}

$source = [System.Drawing.Image]::FromFile($SourceImage)
try {
  $frames = foreach ($size in @(256, 128, 64, 48, 32, 16)) {
    [PSCustomObject]@{
      Size = $size
      Bytes = New-IconPngFrame -Source $source -Size $size
    }
  }

  Write-IconFile -Path $OutputIcon -Frames $frames
}
finally {
  $source.Dispose()
}

Write-Host "Icona creata: $OutputIcon"
