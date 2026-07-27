[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$source = Join-Path $projectRoot "codex-qa\workspaces\frozen-tag"
$sharedSource = Join-Path $projectRoot "codex-qa\workspaces\shared-baseline-readonly-copy"
$target = Join-Path $projectRoot "codex-qa\workspaces\goal1-main"
$evidenceRoot = Join-Path $projectRoot "codex-qa\evidence\goal1\baseline"
$guard = Join-Path $projectRoot "codex-qa\scripts\real-shared-path-guard.ps1"

if (Test-Path -LiteralPath $target) { throw "Goal 1 main workspace already exists: $target" }
New-Item -ItemType Directory -Path $evidenceRoot -Force | Out-Null
$guardOutput = & $guard -ProjectRoot $projectRoot -TestPath $target `
  -OutputPath (Join-Path $evidenceRoot "guard-goal1-main.json")
if ($LASTEXITCODE -ne 0) { throw "Safety guard rejected Goal 1 workspace." }

New-Item -ItemType Directory -Path $target | Out-Null
Get-ChildItem -LiteralPath $source -Force | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $target -Recurse -Force
}

function Get-ContentManifest([string]$Root) {
  @(Get-ChildItem -LiteralPath $Root -File -Recurse -Force |
    Sort-Object FullName |
    ForEach-Object {
      [pscustomobject]@{
        Path = $_.FullName.Substring($Root.Length).TrimStart("\")
        Length = $_.Length
        SHA256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
      }
    })
}

$sourceManifest = Get-ContentManifest $source
$targetManifestBeforeConfig = Get-ContentManifest $target
$copyMatch = @(
  Compare-Object $sourceManifest $targetManifestBeforeConfig -Property Path,Length,SHA256
).Count -eq 0
if (-not $copyMatch) { throw "Goal 1 full copy failed hash comparison." }

$sharedTarget = Join-Path $target "shared-data"
New-Item -ItemType Directory -Path $sharedTarget | Out-Null
Get-ChildItem -LiteralPath $sharedSource -Force | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $sharedTarget -Recurse -Force
}
[System.IO.File]::WriteAllText(
  (Join-Path $target "SHARED_DATA_PATH.txt"),
  ".\shared-data`r`n",
  (New-Object System.Text.UTF8Encoding($false))
)

$summary = [pscustomobject]@{
  timestampUtc = [DateTime]::UtcNow.ToString("o")
  source = $source
  target = $target
  frozenFiles = $sourceManifest.Count
  frozenCopyHashMatchBeforeQaConfig = $copyMatch
  sharedSource = $sharedSource
  sharedTarget = $sharedTarget
  guardEvidence = (Join-Path $evidenceRoot "guard-goal1-main.json")
  realSharedDataUsed = $false
}
$summary | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $evidenceRoot "goal1-main-workspace.json") -Encoding UTF8
$summary | ConvertTo-Json -Depth 8
