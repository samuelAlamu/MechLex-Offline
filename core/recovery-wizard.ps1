param(
  [string]$SharedDataPath = ""
)

$ErrorActionPreference = "Stop"

$Root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..")).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)

function Resolve-SharedDataPath {
  $configured = $SharedDataPath
  if ([string]::IsNullOrWhiteSpace($configured)) { $configured = $env:MECHLEX_SHARED_DATA_PATH }
  if ([string]::IsNullOrWhiteSpace($configured)) {
    $configFile = Join-Path $Root "SHARED_DATA_PATH.txt"
    if (Test-Path -LiteralPath $configFile -PathType Leaf) {
      $configured = Get-Content -LiteralPath $configFile |
        ForEach-Object { $_.Trim() } |
        Where-Object { $_ -and -not $_.StartsWith("#") } |
        Select-Object -First 1
    }
  }
  if ([string]::IsNullOrWhiteSpace($configured)) {
    $configured = Join-Path (Split-Path -Parent $Root) "MechLex_Shared_Data"
  } elseif (-not [System.IO.Path]::IsPathRooted($configured)) {
    $configured = Join-Path $Root $configured
  }
  return [System.IO.Path]::GetFullPath($configured)
}

$SharedRoot = Resolve-SharedDataPath
$StatePath = Join-Path $SharedRoot "state.json"
$PreviousPath = Join-Path $SharedRoot "state.previous.json"
$HistoryPath = Join-Path $SharedRoot "history"
$AuditLogPath = Join-Path $SharedRoot "recovery_audit.log"

function Write-Audit([string]$Msg) {
  $line = "[{0}] {1}" -f [DateTime]::UtcNow.ToString("o"), $Msg
  Add-Content -Path $AuditLogPath -Value $line
}

function Validate-StateData($dataArray) {
  if ($null -eq $dataArray -or $dataArray -isnot [System.Array]) { return "Data missing or not an array" }
  $ids = New-Object System.Collections.Generic.HashSet[string]
  foreach ($item in $dataArray) {
    if ([string]::IsNullOrWhiteSpace($item.id)) { return "Item is missing an id" }
    if (-not $ids.Add($item.id)) { return "Duplicate id found: $($item.id)" }
  }
  return $null
}

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " MechLex Data Recovery Wizard" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Shared folder: $SharedRoot"

if (-not (Test-Path $SharedRoot)) {
  Write-Host "Shared folder does not exist or access denied." -ForegroundColor Red
  exit 1
}

$backups = @()
if (Test-Path $PreviousPath) {
  $backups += Get-Item $PreviousPath
}
if (Test-Path $HistoryPath) {
  $backups += Get-ChildItem -Path $HistoryPath -Filter "state-*.json" | Sort-Object LastWriteTimeUtc -Descending
}

if ($backups.Count -eq 0) {
  Write-Host "No backups found in the system." -ForegroundColor Red
  exit 1
}

Write-Host "`nScanning and validating available backups..."

$validBackups = @()
$index = 1
foreach ($file in $backups) {
  try {
    $content = Get-Content $file.FullName -Raw | ConvertFrom-Json -ErrorAction Stop
    if ($content.schemaVersion -ne 2) { throw "Schema version not supported" }
    
    $err = Validate-StateData $content.shared.data
    if ($null -ne $err) { throw $err }
    
    $validBackups += @{
      Index = $index
      File = $file
      Revision = $content.revision
      Date = $file.LastWriteTime
      Size = "{0:N2} MB" -f ($file.Length / 1MB)
    }
    $index++
  } catch {
    # Skip invalid ones or just log them silently
  }
}

if ($validBackups.Count -eq 0) {
  Write-Host "No fully valid backups found (all are corrupted)." -ForegroundColor Red
  exit 1
}

Write-Host "`nValid backups available for use:" -ForegroundColor Green
$validBackups | Format-Table Index, Revision, Date, Size, @{Name="File";Expression={$_.File.Name}}

$choice = Read-Host "Please type the number of the backup you want to restore (or 'q' to quit)"
if ($choice -eq 'q') { exit 0 }

$selected = $validBackups | Where-Object { $_.Index -eq $choice }
if ($null -eq $selected) {
  Write-Host "Invalid selection." -ForegroundColor Red
  exit 1
}

Write-Host "You selected backup from revision $($selected.Revision) created at $($selected.Date)"
$confirm = Read-Host "Are you sure you want to overwrite the current dictionary and restore this version? (Y/N)"
if ($confirm -notmatch "^y$|^yes$") {
  Write-Host "Restore operation cancelled."
  exit 0
}

Write-Audit "Manual restore operation started by admin to revision $($selected.Revision) from file $($selected.File.Name)"

if (Test-Path $StatePath) {
  $safeCopy = Join-Path $SharedRoot "state.presafety.$([DateTime]::UtcNow.ToString('yyyyMMdd_HHmmss')).json"
  Copy-Item $StatePath $safeCopy -Force
  Write-Host "Safety copy of current state saved as $safeCopy"
  Write-Audit "Created pre-safety copy: $safeCopy"
}

$tempPath = Join-Path $SharedRoot "state.restore.tmp"
Copy-Item $selected.File.FullName $tempPath -Force

try {
  if (Test-Path $StatePath) {
    [System.IO.File]::Replace($tempPath, $StatePath, $PreviousPath, $true)
  } else {
    [System.IO.File]::Move($tempPath, $StatePath)
  }
  
  # Verify after writing
  $verify = Get-Content $StatePath -Raw | ConvertFrom-Json
  if ($verify.revision -ne $selected.Revision) { throw "Restore failed - Revision mismatch after saving!" }
  
  Write-Host "`nRestore completed successfully! Dictionary restored to revision $($selected.Revision)" -ForegroundColor Green
  Write-Audit "Restore completed successfully to revision $($selected.Revision)"
} catch {
  Write-Host "`nCritical error during restore: $_" -ForegroundColor Red
  Write-Audit "Error during restore: $_"
  if (Test-Path $tempPath) { Remove-Item $tempPath -Force }
}

Write-Host "You can now restart the local server."
