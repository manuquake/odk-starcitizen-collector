param(
  [string]$InitialPath
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms

function Add-Candidate {
  param(
    [System.Collections.Generic.List[string]]$List,
    [string]$Path
  )

  if ([string]::IsNullOrWhiteSpace($Path)) {
    return
  }

  $List.Add($Path) | Out-Null
}

function Resolve-GameLogPath {
  param([string]$SelectedPath)

  $candidates = [System.Collections.Generic.List[string]]::new()
  Add-Candidate $candidates (Join-Path $SelectedPath 'Game.log')
  Add-Candidate $candidates (Join-Path $SelectedPath 'LIVE\Game.log')
  Add-Candidate $candidates (Join-Path $SelectedPath 'PTU\Game.log')
  Add-Candidate $candidates (Join-Path $SelectedPath 'StarCitizen\LIVE\Game.log')
  Add-Candidate $candidates (Join-Path $SelectedPath 'StarCitizen\PTU\Game.log')

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate -PathType Leaf) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }

  $leaf = Split-Path -Path $SelectedPath -Leaf
  if ($leaf -in @('LIVE', 'PTU')) {
    return (Join-Path $SelectedPath 'Game.log')
  }

  return (Join-Path $SelectedPath 'LIVE\Game.log')
}

$defaultCandidates = [System.Collections.Generic.List[string]]::new()
Add-Candidate $defaultCandidates $InitialPath
Add-Candidate $defaultCandidates (Join-Path $env:ProgramFiles 'Roberts Space Industries\StarCitizen\LIVE')
Add-Candidate $defaultCandidates (Join-Path ${env:ProgramFiles(x86)} 'Roberts Space Industries\StarCitizen\LIVE')
Add-Candidate $defaultCandidates 'C:\RSI\StarCitizen\LIVE'

$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Seleziona la cartella di Star Citizen che contiene Game.log. Di solito e StarCitizen\LIVE.'
$dialog.ShowNewFolderButton = $false

foreach ($candidate in $defaultCandidates) {
  if (Test-Path -LiteralPath $candidate -PathType Container) {
    $dialog.SelectedPath = $candidate
    break
  }
}

$result = $dialog.ShowDialog()
if ($result -ne [System.Windows.Forms.DialogResult]::OK) {
  exit 2
}

$gameLogPath = Resolve-GameLogPath $dialog.SelectedPath

if (-not (Test-Path -LiteralPath $gameLogPath -PathType Leaf)) {
  [System.Windows.Forms.MessageBox]::Show(
    "Non ho trovato Game.log nel percorso selezionato.`r`n`r`nIl collector salvera comunque questo percorso:`r`n$gameLogPath`r`n`r`nSe Star Citizen non e mai stato avviato, apri il gioco una volta e poi avvia il collector.",
    'ODK Star Citizen Collector',
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Warning
  ) | Out-Null
}

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Output $gameLogPath
