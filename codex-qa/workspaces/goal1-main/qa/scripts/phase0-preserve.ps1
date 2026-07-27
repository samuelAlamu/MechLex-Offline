param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
)

$ErrorActionPreference = "Stop"
$projectPath = [System.IO.Path]::GetFullPath($ProjectRoot).TrimEnd("\")
$qaPath = [System.IO.Path]::GetFullPath((Join-Path $projectPath "qa")).TrimEnd("\")
$logsPath = [System.IO.Path]::GetFullPath((Join-Path $projectPath ".logs")).TrimEnd("\")
$evidenceBaseline = Join-Path $qaPath "evidence\baseline"
$evidenceHashes = Join-Path $qaPath "evidence\hashes"
$workspaceRoot = Join-Path $qaPath "workspaces"

$sourceFiles = Get-ChildItem -LiteralPath $projectPath -Recurse -Force -File |
  Where-Object {
    $full = [System.IO.Path]::GetFullPath($_.FullName)
    -not $full.StartsWith($qaPath + "\", [System.StringComparison]::OrdinalIgnoreCase) -and
    -not $full.StartsWith($logsPath + "\", [System.StringComparison]::OrdinalIgnoreCase)
  } |
  Sort-Object FullName

$sourceDirectories = Get-ChildItem -LiteralPath $projectPath -Recurse -Force -Directory |
  Where-Object {
    $full = [System.IO.Path]::GetFullPath($_.FullName)
    -not $full.StartsWith($qaPath, [System.StringComparison]::OrdinalIgnoreCase) -and
    -not $full.StartsWith($logsPath, [System.StringComparison]::OrdinalIgnoreCase)
  }

$manifest = foreach ($file in $sourceFiles) {
  $relative = $file.FullName.Substring($projectPath.Length).TrimStart("\")
  $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash.ToLowerInvariant()
  [pscustomobject]@{
    Path = $relative
    Bytes = $file.Length
    LastWriteTimeUtc = $file.LastWriteTimeUtc.ToString("o")
    SHA256 = $hash
  }
}

$manifest |
  Export-Csv -LiteralPath (Join-Path $evidenceHashes "baseline-sha256.csv") -NoTypeInformation -Encoding UTF8

$manifest |
  ForEach-Object { "$($_.SHA256) *$($_.Path)" } |
  Set-Content -LiteralPath (Join-Path $evidenceHashes "baseline-sha256.txt") -Encoding UTF8

$inventory = [ordered]@{
  capturedAt = [DateTime]::UtcNow.ToString("o")
  projectRoot = $projectPath
  fileCount = @($sourceFiles).Count
  folderCount = @($sourceDirectories).Count
  totalBytes = [int64](($sourceFiles | Measure-Object Length -Sum).Sum)
  gitRepository = [bool](Test-Path -LiteralPath (Join-Path $projectPath ".git"))
  sha256Manifest = "qa/evidence/hashes/baseline-sha256.csv"
}
$inventory | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $evidenceBaseline "inventory.json") -Encoding UTF8

$sourceFiles |
  ForEach-Object { $_.FullName.Substring($projectPath.Length).TrimStart("\") } |
  Set-Content -LiteralPath (Join-Path $evidenceBaseline "file-list.txt") -Encoding UTF8

$copies = @("baseline-preserved", "normal", "concurrency-a", "concurrency-b", "destructive", "moved-path")
foreach ($copyName in $copies) {
  $destinationRoot = Join-Path $workspaceRoot $copyName
  New-Item -ItemType Directory -Path $destinationRoot -Force | Out-Null
  foreach ($file in $sourceFiles) {
    $relative = $file.FullName.Substring($projectPath.Length).TrimStart("\")
    $destination = Join-Path $destinationRoot $relative
    $destinationDirectory = Split-Path -Parent $destination
    New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
    Copy-Item -LiteralPath $file.FullName -Destination $destination -Force
  }
}

$copyVerification = foreach ($copyName in $copies) {
  $destinationRoot = Join-Path $workspaceRoot $copyName
  $mismatches = @()
  foreach ($item in $manifest) {
    $candidate = Join-Path $destinationRoot $item.Path
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
      $mismatches += "MISSING: $($item.Path)"
      continue
    }
    $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $candidate).Hash.ToLowerInvariant()
    if ($actual -ne $item.SHA256) {
      $mismatches += "HASH: $($item.Path)"
    }
  }
  [pscustomobject]@{
    copy = $copyName
    filesExpected = @($manifest).Count
    mismatches = @($mismatches)
    verified = @($mismatches).Count -eq 0
  }
}
$copyVerification | ConvertTo-Json -Depth 5 |
  Set-Content -LiteralPath (Join-Path $evidenceBaseline "copy-verification.json") -Encoding UTF8

if (@($copyVerification | Where-Object { -not $_.verified }).Count -gt 0) {
  throw "One or more preserved QA copies failed hash verification."
}

Write-Output ("Baseline preserved: {0} files, {1} folders, {2} bytes." -f $inventory.fileCount, $inventory.folderCount, $inventory.totalBytes)
Write-Output ("Verified copies: {0}" -f ($copies -join ", "))
