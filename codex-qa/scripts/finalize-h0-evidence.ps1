[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$qaRoot = Join-Path $projectRoot "codex-qa"
$evidenceRoot = Join-Path $qaRoot "evidence"
$preRoot = Join-Path $evidenceRoot "preactivation"
$indexCsv = Join-Path $evidenceRoot "PREACTIVATION_EVIDENCE_INDEX.csv"
$indexMd = Join-Path $evidenceRoot "PREACTIVATION_EVIDENCE_INDEX.md"
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Write-Utf8([string]$Path, [string]$Text) {
  [System.IO.File]::WriteAllText($Path, $Text, $utf8)
}

function Invoke-GitText([string[]]$Arguments) {
  $output = & git -C $projectRoot -c core.quotePath=false @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) { throw "git $($Arguments -join ' ') failed: $output" }
  return @($output)
}

$status = @(Invoke-GitText @("status", "--porcelain=v1", "--untracked-files=all"))
$untracked = @(Invoke-GitText @("ls-files", "--others", "--exclude-standard"))
$ignored = @(Invoke-GitText @("ls-files", "--others", "--ignored", "--exclude-standard"))
$nonCodexQa = @($untracked | Where-Object { -not $_.StartsWith("codex-qa/") })
$codexQa = @($untracked | Where-Object { $_.StartsWith("codex-qa/") })
$trackedChanges = @(Invoke-GitText @("status", "--porcelain=v1", "--untracked-files=no") | Where-Object { $_ })
$staged = @(Invoke-GitText @("diff", "--cached", "--name-only") | Where-Object { $_ })
$head = [string](Invoke-GitText @("rev-parse", "HEAD") | Select-Object -First 1)
$branch = [string](Invoke-GitText @("branch", "--show-current") | Select-Object -First 1)
$tagCommit = [string](Invoke-GitText @("rev-parse", "mechlex-final-gemini-handoff^{commit}") | Select-Object -First 1)
$head = $head.Trim()
$branch = $branch.Trim()
$tagCommit = $tagCommit.Trim()
$realShareCheck = Get-Content -LiteralPath (Join-Path $preRoot "real-shared-final-verification.json") -Raw | ConvertFrom-Json

$statusText = @(
  "Captured UTC: $([DateTime]::UtcNow.ToString('o'))"
  "Command: git status --porcelain=v1 --untracked-files=all"
  "Branch: $branch"
  "HEAD: $head"
  "Tracked changes: $($trackedChanges.Count)"
  "Staged paths: $($staged.Count)"
  "Untracked total: $($untracked.Count)"
  "Untracked outside codex-qa: $($nonCodexQa.Count)"
  "Untracked under codex-qa: $($codexQa.Count)"
  ""
  $status
) -join "`r`n"
Write-Utf8 (Join-Path $preRoot "final-git-status.txt") $statusText

$state = [pscustomobject]@{
  capturedUtc = [DateTime]::UtcNow.ToString("o")
  branch = $branch
  head = $head
  tagCommit = $tagCommit
  headMatchesTag = ($head -eq $tagCommit)
  trackedChanges = $trackedChanges.Count
  stagedPaths = $staged.Count
  untrackedTotal = $untracked.Count
  untrackedOutsideCodexQa = $nonCodexQa.Count
  untrackedUnderCodexQa = $codexQa.Count
  ignoredTotal = $ignored.Count
  productionTrackedTreeUnchanged = ($trackedChanges.Count -eq 0)
  realSharedContentAndMetadataUnchanged = [bool]$realShareCheck.timestampsAlsoMatch
  goal1Active = $false
}
Write-Utf8 (Join-Path $preRoot "final-worktree-state.json") ($state | ConvertTo-Json -Depth 6)

function Get-Classification([string]$RelativePath) {
  $name = [System.IO.Path]::GetFileName($RelativePath)
  if ($RelativePath -like "codex-qa/evidence/baseline/*") {
    return [pscustomobject]@{Category="H0-A baseline";Supports="H0-A"}
  }
  if ($name -match "^01_") { return [pscustomobject]@{Category="Git identity/worktree";Supports="HC-01"} }
  if ($name -match "^02_") { return [pscustomobject]@{Category="Commit trace";Supports="HC-02, HC-10"} }
  if ($name -match "^03_") { return [pscustomobject]@{Category="Runtime closure";Supports="HC-03"} }
  if ($name -match "^04_") { return [pscustomobject]@{Category="Test reconciliation";Supports="HC-04"} }
  if ($name -match "^05_") { return [pscustomobject]@{Category="Evidence reconciliation";Supports="HC-05, HC-15"} }
  if ($name -match "^06_|helper\\.") { return [pscustomobject]@{Category="Helper runtime";Supports="HC-06"} }
  if ($name -match "^07_") { return [pscustomobject]@{Category="Endpoint/path/write model";Supports="HC-07"} }
  if ($name -match "^08_") { return [pscustomobject]@{Category="Configuration";Supports="HC-08"} }
  if ($name -match "^09_") { return [pscustomobject]@{Category="Validation";Supports="HC-09"} }
  if ($name -match "^10_") { return [pscustomobject]@{Category="Change traceability";Supports="HC-10"} }
  if ($name -match "^11_") { return [pscustomobject]@{Category="Browser/file storage";Supports="HC-11, HC-12"} }
  if ($name -match "^12_") { return [pscustomobject]@{Category="Sanitized PIN audit";Supports="HC-12"} }
  if ($name -match "^13_") { return [pscustomobject]@{Category="Roles/permissions";Supports="HC-13"} }
  if ($name -match "^14_") { return [pscustomobject]@{Category="Inventory";Supports="HC-14"} }
  if ($name -match "^15_") { return [pscustomobject]@{Category="Handoff completeness";Supports="HC-15"} }
  if ($name -like "guard-*") { return [pscustomobject]@{Category="Real-share safety guard";Supports="H0-A"} }
  if ($name -eq "runtime-probes.json") { return [pscustomobject]@{Category="Bounded helper runtime";Supports="HC-06, HC-07, HC-09, HC-11, HC-12, HC-13"} }
  if ($name -like "h0-*-helper.*.log") { return [pscustomobject]@{Category="Helper runtime log";Supports="HC-06, HC-13"} }
  if ($name -eq "real-shared-final-verification.json") { return [pscustomobject]@{Category="Real-share final proof";Supports="H0-A"} }
  if ($RelativePath -like "codex-qa/scripts/*" -or $RelativePath -like "codex-qa/tests/*") {
    return [pscustomobject]@{Category="Reproduction asset";Supports="H0/H0-A"}
  }
  if ($RelativePath -like "codex-qa/reports/*") { return [pscustomobject]@{Category="Checkpoint report";Supports="H0"} }
  if ($RelativePath -like "codex-qa/evidence/review/*") { return [pscustomobject]@{Category="Independent review";Supports="H0 exit"} }
  return [pscustomobject]@{Category="Control document";Supports="H0"}
}

$roots = @(
  (Join-Path $qaRoot "QA_EXECUTION_PLAN.md"),
  (Join-Path $qaRoot "HANDOFF_VERIFICATION.md"),
  (Join-Path $qaRoot "GOAL_STATUS.md"),
  (Join-Path $qaRoot "reports\H0_CHECKPOINT_HE.md")
)
$files = [System.Collections.Generic.List[System.IO.FileInfo]]::new()
foreach ($path in $roots) {
  if (Test-Path -LiteralPath $path -PathType Leaf) { $files.Add((Get-Item -LiteralPath $path)) }
}
foreach ($directory in @((Join-Path $qaRoot "scripts"), (Join-Path $qaRoot "tests\preactivation"), (Join-Path $qaRoot "evidence\baseline"), (Join-Path $qaRoot "evidence\review"), $preRoot)) {
  if (Test-Path -LiteralPath $directory) {
    foreach ($file in Get-ChildItem -LiteralPath $directory -File -Recurse -Force) { $files.Add($file) }
  }
}

$rows = @($files |
  Where-Object { $_.FullName -notin @($indexCsv, $indexMd) } |
  Sort-Object FullName -Unique |
  ForEach-Object {
    $relative = $_.FullName.Substring($projectRoot.Length + 1).Replace("\", "/")
    $classification = Get-Classification $relative
    [pscustomobject]@{
      Path = $relative
      SHA256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
      Bytes = $_.Length
      Category = $classification.Category
      Supports = $classification.Supports
    }
  })
$rows | Export-Csv -LiteralPath $indexCsv -NoTypeInformation -Encoding UTF8

$markdown = [System.Collections.Generic.List[string]]::new()
$markdown.Add("# MechLex Complete Pre-activation Evidence Index")
$markdown.Add("")
$markdown.Add("Generated: $([DateTime]::UtcNow.ToString('o'))")
$markdown.Add("")
$markdown.Add("This index covers every H0/H0-A evidence artifact, execution script, bounded browser reproduction, control document and checkpoint report. The two index files are excluded from their own hash list to avoid self-reference.")
$markdown.Add("")
$markdown.Add("- Indexed artifacts: $($rows.Count)")
$markdown.Add("- Production tracked changes: $($state.trackedChanges)")
$markdown.Add("- Real shared data unchanged: $($state.realSharedContentAndMetadataUnchanged)")
$markdown.Add("- Goal 1 active: $($state.goal1Active)")
$markdown.Add("")
$markdown.Add("| Path | SHA-256 | Bytes | Category | Supports |")
$markdown.Add("|---|---|---:|---|---|")
foreach ($row in $rows) {
  $markdown.Add("| ``$($row.Path)`` | ``$($row.SHA256)`` | $($row.Bytes) | $($row.Category) | $($row.Supports) |")
}
$markdown.Add("")
$markdown.Add("Machine-readable copy: `codex-qa/evidence/PREACTIVATION_EVIDENCE_INDEX.csv`.")
Write-Utf8 $indexMd ($markdown -join "`r`n")

[pscustomobject]@{
  result = "PASS"
  indexedArtifacts = $rows.Count
  finalWorktree = $state
  indexMarkdown = $indexMd
  indexCsv = $indexCsv
} | ConvertTo-Json -Depth 8
