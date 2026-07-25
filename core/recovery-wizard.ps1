param(
  [string]$SharedDataPath = ""
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

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
  if ($null -eq $dataArray -or $dataArray -isnot [System.Array]) { return "נתונים חסרים או לא במבנה תקין" }
  $ids = New-Object System.Collections.Generic.HashSet[string]
  foreach ($item in $dataArray) {
    if ([string]::IsNullOrWhiteSpace($item.id)) { return "לפריט חסר מזהה (id)" }
    if (-not $ids.Add($item.id)) { return "מזהה כפול נמצא: $($item.id)" }
  }
  return $null
}

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " אשף שחזור נתונים למילון MechLex" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "תיקייה משותפת: $SharedRoot"

if (-not (Test-Path $SharedRoot)) {
  Write-Host "התיקייה המשותפת אינה קיימת או אין אליה גישה." -ForegroundColor Red
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
  Write-Host "לא נמצאו גיבויים במערכת." -ForegroundColor Red
  exit 1
}

Write-Host "`nסורק ומאמת גיבויים זמינים..."

$validBackups = @()
$index = 1
foreach ($file in $backups) {
  try {
    $content = Get-Content $file.FullName -Raw | ConvertFrom-Json -ErrorAction Stop
    if ($content.schemaVersion -ne 2) { throw "גרסת סכימה אינה נתמכת" }
    
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
  Write-Host "לא נמצאו גיבויים תקינים לחלוטין (כולם פגומים)." -ForegroundColor Red
  exit 1
}

Write-Host "`nגיבויים זמינים ותקינים לשימוש:" -ForegroundColor Green
$validBackups | Format-Table Index, Revision, Date, Size, @{Name="File";Expression={$_.File.Name}}

$choice = Read-Host "אנא הקלד את מספר הגיבוי שברצונך לשחזר (או 'q' ליציאה)"
if ($choice -eq 'q') { exit 0 }

$selected = $validBackups | Where-Object { $_.Index -eq $choice }
if ($null -eq $selected) {
  Write-Host "בחירה לא חוקית." -ForegroundColor Red
  exit 1
}

Write-Host "בחרת בגיבוי מגרסה $($selected.Revision) שנוצר ב-$($selected.Date)"
$confirm = Read-Host "האם אתה בטוח שברצונך לדרוס את המילון הנוכחי ולשחזר לגרסה זו? (Y/N)"
if ($confirm -notmatch "^y$|^yes$") {
  Write-Host "פעולת השחזור בוטלה."
  exit 0
}

Write-Audit "התחלת פעולת שחזור ידנית על ידי מנהל מערכת לגרסה $($selected.Revision) מקובץ $($selected.File.Name)"

if (Test-Path $StatePath) {
  $safeCopy = Join-Path $SharedRoot "state.presafety.$([DateTime]::UtcNow.ToString('yyyyMMdd_HHmmss')).json"
  Copy-Item $StatePath $safeCopy -Force
  Write-Host "עותק בטיחות של המצב הנוכחי נשמר כ-$safeCopy"
  Write-Audit "נוצר עותק בטיחות מקדים: $safeCopy"
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
  if ($verify.revision -ne $selected.Revision) { throw "שחזור נכשל - הגרסה אינה תואמת לאחר השמירה!" }
  
  Write-Host "`nהשחזור בוצע בהצלחה! המילון חזר לגרסה $($selected.Revision)" -ForegroundColor Green
  Write-Audit "שחזור הסתיים בהצלחה לגרסה $($selected.Revision)"
} catch {
  Write-Host "`nשגיאה קריטית במהלך השחזור: $_" -ForegroundColor Red
  Write-Audit "שגיאה במהלך השחזור: $_"
  if (Test-Path $tempPath) { Remove-Item $tempPath -Force }
}

Write-Host "ניתן כעת להפעיל את השרת המקומי מחדש."
