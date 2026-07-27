[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$baselineRoot = Join-Path $projectRoot "codex-qa\evidence\baseline"
$frozenRoot = Join-Path $projectRoot "codex-qa\workspaces\frozen-tag"
$sharedCopy = Join-Path $projectRoot "codex-qa\workspaces\shared-baseline-readonly-copy"
$utf8 = New-Object System.Text.UTF8Encoding($false)

function New-ManifestRow([System.IO.FileInfo]$File, [string]$Root, [string]$Scope, [string]$Class) {
  [pscustomobject]@{
    Scope = $Scope
    RelativePath = $File.FullName.Substring($Root.Length).TrimStart("\")
    Length = $File.Length
    SHA256 = (Get-FileHash -LiteralPath $File.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    LastWriteUtc = $File.LastWriteTimeUtc.ToString("o")
    Classification = $Class
  }
}

$frozenFiles = @(Get-ChildItem -LiteralPath $frozenRoot -File -Recurse -Force | Sort-Object FullName)
$sharedFiles = @(Get-ChildItem -LiteralPath $sharedCopy -File -Recurse -Force | Sort-Object FullName)

$mutable = @($sharedFiles | ForEach-Object {
  New-ManifestRow $_ $sharedCopy "shared-baseline-readonly-copy" "Mutable shared data"
})
$backups = @($sharedFiles | Where-Object {
  $relative = $_.FullName.Substring($sharedCopy.Length).TrimStart("\")
  $relative -match "(^|\\)history\\" -or
  $_.Name -match "(?i)(backup|previous|presafety|corrupt|\.tmp$)"
} | ForEach-Object {
  New-ManifestRow $_ $sharedCopy "shared-baseline-readonly-copy" "Backup, recovery or history"
})
$images = @($frozenFiles | Where-Object {
  $relative = $_.FullName.Substring($frozenRoot.Length).TrimStart("\")
  $relative -match "^images\\" -or $_.Extension -match "^\.(png|jpe?g|webp|gif|svg)$"
} | ForEach-Object {
  New-ManifestRow $_ $frozenRoot "frozen-tag" "Image or image catalogue asset"
})
$qaFiles = @($frozenFiles | Where-Object {
  $relative = $_.FullName.Substring($frozenRoot.Length).TrimStart("\")
  $relative -match "^(qa|tests)\\"
} | ForEach-Object {
  New-ManifestRow $_ $frozenRoot "frozen-tag" "QA or test file"
})
$documentation = @($frozenFiles | Where-Object {
  $relative = $_.FullName.Substring($frozenRoot.Length).TrimStart("\")
  $relative -notmatch "^(qa|tests)\\" -and
  ($_.Extension -match "^\.(md|txt|docx)$" -or $_.Name -match "(?i)^(readme|changelog|version|quality|manifest)")
} | ForEach-Object {
  New-ManifestRow $_ $frozenRoot "frozen-tag" "Documentation"
})

$sets = [ordered]@{
  "mutable-shared-data-sha256.csv" = $mutable
  "backup-and-history-sha256.csv" = $backups
  "image-assets-sha256.csv" = $images
  "qa-files-sha256.csv" = $qaFiles
  "documentation-sha256.csv" = $documentation
}
foreach ($entry in $sets.GetEnumerator()) {
  @($entry.Value) | Export-Csv -LiteralPath (Join-Path $baselineRoot $entry.Key) -NoTypeInformation -Encoding UTF8
}

$summary = [pscustomobject]@{
  timestampUtc = [DateTime]::UtcNow.ToString("o")
  result = "PASS"
  sourceFrozenTag = "mechlex-final-gemini-handoff"
  sourceShared = "hash-verified read-only baseline copy; not the real shared directory"
  manifests = @(
    $sets.GetEnumerator() | ForEach-Object {
      [pscustomobject]@{
        file = $_.Key
        rows = @($_.Value).Count
        sha256 = (Get-FileHash -LiteralPath (Join-Path $baselineRoot $_.Key) -Algorithm SHA256).Hash.ToLowerInvariant()
      }
    }
  )
}
[System.IO.File]::WriteAllText(
  (Join-Path $baselineRoot "h0a-category-manifest-summary.json"),
  ($summary | ConvertTo-Json -Depth 8),
  $utf8
)
$summary | ConvertTo-Json -Depth 8
