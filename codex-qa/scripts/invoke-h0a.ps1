[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$qaRoot = Join-Path $projectRoot "codex-qa"
$evidenceRoot = Join-Path $qaRoot "evidence"
$baselineRoot = Join-Path $evidenceRoot "baseline"
$preRoot = Join-Path $evidenceRoot "preactivation"
$workspaceRoot = Join-Path $qaRoot "workspaces"
$guardScript = Join-Path $PSScriptRoot "real-shared-path-guard.ps1"

foreach ($dir in @($baselineRoot, $preRoot, $workspaceRoot)) {
  if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
}

$tagName = "mechlex-final-gemini-handoff"
$tagCommit = (& git -C $projectRoot rev-parse "$tagName^{commit}").Trim()
$headCommit = (& git -C $projectRoot rev-parse HEAD).Trim()
$branch = (& git -C $projectRoot branch --show-current).Trim()
if (-not $tagCommit) { throw "Tag commit was not resolved." }

$frozenRoot = Join-Path $workspaceRoot "frozen-tag"
$archivePath = Join-Path $baselineRoot "frozen-tag.zip"
if (Test-Path -LiteralPath $frozenRoot) { throw "Frozen tag workspace already exists: $frozenRoot" }
if (Test-Path -LiteralPath $archivePath) { throw "Frozen tag archive already exists: $archivePath" }

& git -C $projectRoot archive --format=zip --output=$archivePath $tagName
if ($LASTEXITCODE -ne 0) { throw "git archive failed." }
Expand-Archive -LiteralPath $archivePath -DestinationPath $frozenRoot

$runtimePaths = @(
  "START_MECHLEX.bat",
  "SHARED_DATA_PATH.txt",
  "core/start-local-server.ps1",
  "index.html",
  "style.css",
  "data/mechlex-data.js",
  "images/catalog.js",
  "images/mechlex-icon.svg",
  "app.js",
  "core/integrity.js",
  "core/persistence.js",
  "core/shared-sync.js",
  "core/inline-editor.js",
  "core/boot.js"
)
$operationalPaths = @("core/recovery-wizard.ps1")

function Get-Manifest {
  param([string]$BasePath, [string[]]$RelativePaths)
  $result = foreach ($relative in $RelativePaths) {
    $path = Join-Path $BasePath ($relative -replace "/", "\")
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Manifest input missing: $path" }
    $item = Get-Item -LiteralPath $path
    [pscustomobject]@{
      RelativePath = $relative
      Length = $item.Length
      SHA256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
      LastWriteUtc = $item.LastWriteTimeUtc.ToString("o")
    }
  }
  return @($result)
}

$tagFiles = Get-ChildItem -LiteralPath $frozenRoot -Recurse -File -Force | Sort-Object FullName
$tagManifest = @($tagFiles | ForEach-Object {
  [pscustomobject]@{
    RelativePath = $_.FullName.Substring($frozenRoot.Length).TrimStart("\")
    Length = $_.Length
    SHA256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    LastWriteUtc = $_.LastWriteTimeUtc.ToString("o")
  }
})
$tagManifest | Export-Csv -LiteralPath (Join-Path $baselineRoot "frozen-tag-sha256.csv") -NoTypeInformation -Encoding UTF8

$runtimeManifest = Get-Manifest -BasePath $frozenRoot -RelativePaths $runtimePaths
$runtimeManifest | Export-Csv -LiteralPath (Join-Path $baselineRoot "runtime-closure-sha256.csv") -NoTypeInformation -Encoding UTF8
$operationalManifest = Get-Manifest -BasePath $frozenRoot -RelativePaths $operationalPaths
$operationalManifest | Export-Csv -LiteralPath (Join-Path $baselineRoot "operational-runtime-sha256.csv") -NoTypeInformation -Encoding UTF8

$sharedConfig = Get-Content -LiteralPath (Join-Path $projectRoot "SHARED_DATA_PATH.txt") -Encoding utf8 |
  Where-Object { $_ -notmatch "^\s*#" -and -not [string]::IsNullOrWhiteSpace($_) } |
  Select-Object -First 1
$realShared = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $sharedConfig.Trim()))
if (-not (Test-Path -LiteralPath $realShared -PathType Container)) { throw "Configured shared source does not exist: $realShared" }

$sharedFiles = Get-ChildItem -LiteralPath $realShared -Recurse -File -Force | Sort-Object FullName
$sharedManifest = @($sharedFiles | ForEach-Object {
  [pscustomobject]@{
    RelativePath = $_.FullName.Substring($realShared.Length).TrimStart("\")
    Length = $_.Length
    SHA256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    LastWriteUtc = $_.LastWriteTimeUtc.ToString("o")
  }
})
$sharedManifest | Export-Csv -LiteralPath (Join-Path $baselineRoot "real-shared-readonly-sha256.csv") -NoTypeInformation -Encoding UTF8

$sharedBaselineCopy = Join-Path $workspaceRoot "shared-baseline-readonly-copy"
if (Test-Path -LiteralPath $sharedBaselineCopy) { throw "Shared baseline copy already exists: $sharedBaselineCopy" }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $guardScript -TestPath $sharedBaselineCopy -ProjectRoot $projectRoot -OutputPath (Join-Path $preRoot "guard-shared-baseline-target.json") | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Safety guard rejected shared baseline copy target." }
New-Item -ItemType Directory -Path $sharedBaselineCopy | Out-Null
Get-ChildItem -LiteralPath $realShared -Force | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $sharedBaselineCopy -Recurse -Force
}

$sharedCopyManifest = @((Get-ChildItem -LiteralPath $sharedBaselineCopy -Recurse -File -Force | Sort-Object FullName) | ForEach-Object {
  [pscustomobject]@{
    RelativePath = $_.FullName.Substring($sharedBaselineCopy.Length).TrimStart("\")
    Length = $_.Length
    SHA256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    LastWriteUtc = $_.LastWriteTimeUtc.ToString("o")
  }
})
$sharedCopyManifest | Export-Csv -LiteralPath (Join-Path $baselineRoot "shared-baseline-copy-sha256.csv") -NoTypeInformation -Encoding UTF8

$sharedMatches = (
  ($sharedManifest.Count -eq $sharedCopyManifest.Count) -and
  (@(Compare-Object ($sharedManifest | Select-Object RelativePath,Length,SHA256) ($sharedCopyManifest | Select-Object RelativePath,Length,SHA256)).Count -eq 0)
)
if (-not $sharedMatches) { throw "Shared baseline copy failed hash comparison." }

$workspaceNames = @("normal", "destructive", "recovery", "concurrency-a", "concurrency-b", "media")
$workspaceVerification = foreach ($name in $workspaceNames) {
  $target = Join-Path $workspaceRoot $name
  if (Test-Path -LiteralPath $target) { throw "Disposable workspace already exists: $target" }
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $guardScript -TestPath $target -ProjectRoot $projectRoot -OutputPath (Join-Path $preRoot "guard-$name-target.json") | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Safety guard rejected disposable workspace target: $target" }
  New-Item -ItemType Directory -Path $target | Out-Null
  foreach ($relative in ($runtimePaths + $operationalPaths)) {
    $source = Join-Path $frozenRoot ($relative -replace "/", "\")
    $destination = Join-Path $target ($relative -replace "/", "\")
    $parent = Split-Path -Parent $destination
    if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    Copy-Item -LiteralPath $source -Destination $destination
  }
  $sharedTarget = Join-Path $target "shared-data"
  New-Item -ItemType Directory -Path $sharedTarget | Out-Null
  Get-ChildItem -LiteralPath $sharedBaselineCopy -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $sharedTarget -Recurse -Force
  }
  [System.IO.File]::WriteAllText((Join-Path $target "SHARED_DATA_PATH.txt"), ".\shared-data`r`n", (New-Object System.Text.UTF8Encoding($false)))

  $copyRuntime = Get-Manifest -BasePath $target -RelativePaths ($runtimePaths | Where-Object { $_ -ne "SHARED_DATA_PATH.txt" })
  $expectedRuntime = $runtimeManifest | Where-Object { $_.RelativePath -ne "SHARED_DATA_PATH.txt" }
  $runtimeMatches = @(Compare-Object ($expectedRuntime | Select-Object RelativePath,Length,SHA256) ($copyRuntime | Select-Object RelativePath,Length,SHA256)).Count -eq 0
  $copyShared = @((Get-ChildItem -LiteralPath $sharedTarget -Recurse -File -Force | Sort-Object FullName) | ForEach-Object {
    [pscustomobject]@{
      RelativePath = $_.FullName.Substring($sharedTarget.Length).TrimStart("\")
      Length = $_.Length
      SHA256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
  })
  $sharedCopyMatches = @(Compare-Object ($sharedManifest | Select-Object RelativePath,Length,SHA256) $copyShared).Count -eq 0
  [pscustomobject]@{
    Workspace = $name
    Path = $target
    RuntimeHashMatch = $runtimeMatches
    SharedDataHashMatch = $sharedCopyMatches
    GuardEvidence = "codex-qa/evidence/preactivation/guard-$name-target.json"
  }
}
$workspaceVerification | Export-Csv -LiteralPath (Join-Path $baselineRoot "workspace-verification.csv") -NoTypeInformation -Encoding UTF8
if (@($workspaceVerification | Where-Object { -not $_.RuntimeHashMatch -or -not $_.SharedDataHashMatch }).Count -gt 0) {
  throw "One or more disposable workspaces failed verification."
}

$summary = [ordered]@{
  timestampUtc = (Get-Date).ToUniversalTime().ToString("o")
  h0a = "PASS"
  branch = $branch
  head = $headCommit
  tag = $tagName
  tagCommit = $tagCommit
  archiveSha256 = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
  frozenTagFiles = $tagManifest.Count
  frozenTagBytes = ($tagManifest | Measure-Object Length -Sum).Sum
  runtimeClosureFiles = $runtimeManifest.Count
  operationalRuntimeFiles = @($operationalManifest).Count
  realSharedPath = $realShared
  realSharedFiles = $sharedManifest.Count
  realSharedBytes = ($sharedManifest | Measure-Object Length -Sum).Sum
  sharedBaselineCopyHashMatch = $sharedMatches
  disposableWorkspaces = @($workspaceVerification)
  productionModified = $false
  realSharedModified = $false
}
$summaryPath = Join-Path $baselineRoot "h0a-summary.json"
[System.IO.File]::WriteAllText($summaryPath, ($summary | ConvertTo-Json -Depth 6), (New-Object System.Text.UTF8Encoding($false)))
$summary | ConvertTo-Json -Depth 6
