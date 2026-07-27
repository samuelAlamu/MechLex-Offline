[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$baselinePath = Join-Path $projectRoot "codex-qa\evidence\baseline\real-shared-readonly-sha256.csv"
$summaryPath = Join-Path $projectRoot "codex-qa\evidence\preactivation\real-shared-final-verification.json"
$h0a = Get-Content -LiteralPath (Join-Path $projectRoot "codex-qa\evidence\baseline\h0a-summary.json") -Raw | ConvertFrom-Json
$realShared = [System.IO.Path]::GetFullPath([string]$h0a.realSharedPath)
$baseline = @(Import-Csv -LiteralPath $baselinePath | Sort-Object RelativePath)
$current = @(Get-ChildItem -LiteralPath $realShared -File -Recurse -Force |
  Sort-Object FullName |
  ForEach-Object {
    [pscustomobject]@{
      RelativePath = $_.FullName.Substring($realShared.Length).TrimStart("\")
      Length = [string]$_.Length
      SHA256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
      LastWriteUtc = $_.LastWriteTimeUtc.ToString("o")
    }
  })

$baselineContent = @($baseline | Select-Object RelativePath,Length,SHA256) | ConvertTo-Json -Depth 5 -Compress
$currentContent = @($current | Select-Object RelativePath,Length,SHA256) | ConvertTo-Json -Depth 5 -Compress
$baselineMetadata = @($baseline | Select-Object RelativePath,Length,SHA256,LastWriteUtc) | ConvertTo-Json -Depth 5 -Compress
$currentMetadata = @($current | Select-Object RelativePath,Length,SHA256,LastWriteUtc) | ConvertTo-Json -Depth 5 -Compress
$differences = [System.Collections.Generic.List[object]]::new()
$baselineMap = @{}
foreach ($row in $baseline) { $baselineMap[$row.RelativePath] = $row }
$currentMap = @{}
foreach ($row in $current) { $currentMap[$row.RelativePath] = $row }
foreach ($path in @($baselineMap.Keys + $currentMap.Keys | Sort-Object -Unique)) {
  $before = $baselineMap[$path]
  $after = $currentMap[$path]
  if ($null -eq $before -or $null -eq $after -or
      $before.Length -ne $after.Length -or $before.SHA256 -ne $after.SHA256 -or
      $before.LastWriteUtc -ne $after.LastWriteUtc) {
    $differences.Add([pscustomobject]@{ path=$path; before=$before; after=$after })
  }
}

$result = [pscustomobject]@{
  timestampUtc = [DateTime]::UtcNow.ToString("o")
  realSharedPath = $realShared
  baselineEvidence = $baselinePath
  baselineFileCount = $baseline.Count
  currentFileCount = $current.Count
  contentAndPathMatch = ($baselineContent -eq $currentContent)
  timestampsAlsoMatch = ($baselineMetadata -eq $currentMetadata)
  differences = @($differences | ForEach-Object { $_ })
  verdict = if ($baselineMetadata -eq $currentMetadata) { "PASS - real shared organizational data is unchanged" } else { "FAIL - difference detected" }
}
[System.IO.File]::WriteAllText(
  $summaryPath,
  ($result | ConvertTo-Json -Depth 10),
  (New-Object System.Text.UTF8Encoding($false))
)
$result | ConvertTo-Json -Depth 5
if ($result.verdict -like "FAIL*") { exit 2 }
