param(
  [string]$OutputRoot = $(Join-Path $PSScriptRoot '..\release'),
  [string]$RuntimeNodePath,
  [string]$InnoCompilerPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Resolve-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

function Resolve-NodeExe {
  param([string]$ExplicitPath)

  if ($ExplicitPath) {
    if (-not (Test-Path -LiteralPath $ExplicitPath -PathType Leaf)) {
      throw "Node runtime non trovato: $ExplicitPath"
    }
    return (Resolve-Path -LiteralPath $ExplicitPath).Path
  }

  $command = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($command -and $command.Source) {
    return $command.Source
  }

  throw 'node.exe non trovato. Installa Node.js oppure passa -RuntimeNodePath.'
}

function Resolve-InnoCompiler {
  param([string]$ExplicitPath)

  $candidates = @(
    $ExplicitPath,
    (Join-Path $env:LOCALAPPDATA 'Programs\Inno Setup 6\ISCC.exe'),
    'C:\Program Files (x86)\Inno Setup 6\ISCC.exe',
    'C:\Program Files\Inno Setup 6\ISCC.exe'
  ) | Where-Object { $_ }

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate -PathType Leaf) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }

  throw 'Inno Setup compiler ISCC.exe non trovato.'
}

$repoRoot = Resolve-RepoRoot
$outputRootPath = Join-Path $repoRoot 'release'
if ($OutputRoot) {
  $outputRootPath = $OutputRoot
}

New-Item -ItemType Directory -Path $outputRootPath -Force | Out-Null

$stagingRoot = Join-Path $outputRootPath 'staging'
$packageDir = Join-Path $stagingRoot 'starcitizen-collector-windows'
$appDir = Join-Path $packageDir 'app'
$runtimeDir = Join-Path $packageDir 'runtime'

if (Test-Path -LiteralPath $stagingRoot) {
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $appDir -Force | Out-Null
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

Copy-Item -LiteralPath (Join-Path $repoRoot 'src\cli.js') -Destination $appDir -Force
Copy-Item -LiteralPath (Join-Path $repoRoot 'src\config.js') -Destination $appDir -Force
Copy-Item -LiteralPath (Join-Path $repoRoot 'src\http.js') -Destination $appDir -Force
Copy-Item -LiteralPath (Join-Path $repoRoot 'src\parser.js') -Destination $appDir -Force
Copy-Item -LiteralPath (Join-Path $repoRoot 'src\types.js') -Destination $appDir -Force
Copy-Item -LiteralPath (Join-Path $repoRoot 'src\url.js') -Destination $appDir -Force

Copy-Item -LiteralPath (Join-Path $repoRoot 'packaging\windows\Avvia Collector.cmd') -Destination $packageDir -Force
Copy-Item -LiteralPath (Join-Path $repoRoot 'packaging\windows\Configura Collector.cmd') -Destination $packageDir -Force
Copy-Item -LiteralPath (Join-Path $repoRoot 'packaging\windows\Seleziona GameLog.ps1') -Destination $packageDir -Force
Copy-Item -LiteralPath (Join-Path $repoRoot 'packaging\windows\README.txt') -Destination $packageDir -Force
Copy-Item -LiteralPath (Join-Path $repoRoot 'packaging\windows\PRIVACY_INSTALL.txt') -Destination $packageDir -Force
Copy-Item -LiteralPath (Join-Path $repoRoot 'docs\SICUREZZA_PRIVACY.txt') -Destination $packageDir -Force
Copy-Item -LiteralPath (Join-Path $repoRoot 'config.example.json') -Destination $packageDir -Force
Copy-Item -LiteralPath (Join-Path $repoRoot 'VERSIONE.txt') -Destination $packageDir -Force

$nodeExe = Resolve-NodeExe -ExplicitPath $RuntimeNodePath
Copy-Item -LiteralPath $nodeExe -Destination (Join-Path $runtimeDir 'node.exe') -Force

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repoRoot 'scripts\create-icon.ps1') -OutputIcon (Join-Path $packageDir 'ODK-StarCitizen-Collector.ico')

$portableZip = Join-Path $outputRootPath 'ODK-StarCitizen-Collector-Portable.zip'
if (Test-Path -LiteralPath $portableZip) {
  Remove-Item -LiteralPath $portableZip -Force
}
Compress-Archive -Path (Join-Path $packageDir '*') -DestinationPath $portableZip -CompressionLevel Optimal

$iscc = Resolve-InnoCompiler -ExplicitPath $InnoCompilerPath
$issPath = Join-Path $repoRoot 'packaging\windows\inno\ODK-StarCitizen-Collector.iss'
$iconPath = Join-Path $packageDir 'ODK-StarCitizen-Collector.ico'

& $iscc `
  "/DSourceDir=$packageDir" `
  "/DOutputDir=$outputRootPath" `
  "/DMyAppIcon=$iconPath" `
  $issPath

if ($LASTEXITCODE -ne 0) {
  throw "Inno Setup failed with exit code $LASTEXITCODE"
}

$setupPath = Join-Path $outputRootPath 'ODK-StarCitizen-Collector-Setup.exe'
$hashLines = foreach ($target in @($setupPath, $portableZip)) {
  $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $target
  "$($hash.Hash.ToLower())  $([System.IO.Path]::GetFileName($target))"
}

Set-Content -LiteralPath (Join-Path $outputRootPath 'SHA256SUMS.txt') -Value $hashLines -Encoding ASCII

Write-Host ''
Write-Host 'Release artifacts created:' -ForegroundColor Cyan
Write-Host $setupPath
Write-Host $portableZip
Write-Host (Join-Path $outputRootPath 'SHA256SUMS.txt')
