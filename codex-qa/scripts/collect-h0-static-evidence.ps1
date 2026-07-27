[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$preRoot = Join-Path $projectRoot "codex-qa\evidence\preactivation"
if (-not (Test-Path -LiteralPath $preRoot)) { New-Item -ItemType Directory -Path $preRoot -Force | Out-Null }

function Write-Utf8 {
  param([string]$Path, [string]$Text)
  [System.IO.File]::WriteAllText($Path, $Text, (New-Object System.Text.UTF8Encoding($false)))
}

function Write-Json {
  param([string]$Name, [object]$Value, [int]$Depth = 8)
  Write-Utf8 (Join-Path $preRoot $Name) ($Value | ConvertTo-Json -Depth $Depth)
}

function Write-Csv {
  param([string]$Name, [object[]]$Rows)
  $path = Join-Path $preRoot $Name
  @($Rows | ForEach-Object { $_ }) | Export-Csv -LiteralPath $path -NoTypeInformation -Encoding UTF8
}

function Invoke-Git {
  param([string[]]$Arguments)
  $output = & git -C $projectRoot @Arguments 2>&1
  [pscustomobject]@{ ExitCode = $LASTEXITCODE; Output = @($output) }
}

$head = (Invoke-Git @("rev-parse", "HEAD")).Output[0].Trim()
$branch = (Invoke-Git @("branch", "--show-current")).Output[0].Trim()
$tagName = "mechlex-final-gemini-handoff"
$tagCommit = (Invoke-Git @("rev-parse", "$tagName^{commit}")).Output[0].Trim()
$tagObject = (Invoke-Git @("rev-parse", "$tagName^{tag}")).Output[0].Trim()
$parent = (Invoke-Git @("rev-parse", "$head^")).Output[0].Trim()
$tracked = @((Invoke-Git @("-c", "core.quotePath=false", "ls-files")).Output)
$untrackedNow = @((Invoke-Git @("-c", "core.quotePath=false", "ls-files", "--others", "--exclude-standard")).Output)
$ignoredNow = @((Invoke-Git @("-c", "core.quotePath=false", "ls-files", "--others", "--ignored", "--exclude-standard")).Output)
$trackedDiff = @((Invoke-Git @("status", "--porcelain=v1", "--untracked-files=no")).Output | Where-Object { $_ })
$initialUntracked = @($untrackedNow | Where-Object { $_ -notmatch "^codex-qa/" -or $_ -eq "codex-qa/QA_EXECUTION_PLAN.md" })

$remoteHeads = Invoke-Git @("ls-remote", "--heads", "origin")
$remoteTags = Invoke-Git @("ls-remote", "--tags", "origin")
$remoteUrl = (Invoke-Git @("remote", "get-url", "origin")).Output[0].Trim()

$gitIdentity = [ordered]@{
  capturedUtc = (Get-Date).ToUniversalTime().ToString("o")
  branch = $branch
  head = $head
  parent = $parent
  tag = $tagName
  tagObject = $tagObject
  tagCommit = $tagCommit
  headMatchesTag = ($head -eq $tagCommit)
  remoteUrl = $remoteUrl
  remotePrivacy = "NOT VERIFIABLE FROM GIT URL"
  remoteHeadsQueryExit = $remoteHeads.ExitCode
  remoteTagsQueryExit = $remoteTags.ExitCode
  remoteTagAdvertised = [bool](@($remoteTags.Output | Where-Object { $_ -match "refs/tags/$([regex]::Escape($tagName))(\^\{\})?$" }).Count)
  trackedFiles = $tracked.Count
  trackedQaFiles = @($tracked | Where-Object { $_ -match "^qa/" }).Count
  trackedProductionChanges = $trackedDiff.Count
  authorizedH0StartUntrackedFiles = $initialUntracked.Count
  currentUntrackedFilesAtCapture = $untrackedNow.Count
  ignoredFilesAtCapture = $ignoredNow.Count
}
Write-Json "01_git_identity.json" $gitIdentity
Write-Utf8 (Join-Path $preRoot "01_git_status_authorized_h0_start.txt") (
  "Command: git ls-files --others --exclude-standard`r`n" +
  "Reconstructed H0-authorized-start set: all current non-codex-qa untracked files plus the already approved plan.`r`n" +
  "Count: $($initialUntracked.Count)`r`n`r`n" +
  ($initialUntracked -join "`r`n") + "`r`n"
)
Write-Utf8 (Join-Path $preRoot "01_remote_refs.txt") (
  "REMOTE HEADS (exit $($remoteHeads.ExitCode))`r`n$($remoteHeads.Output -join "`r`n")`r`n`r`n" +
  "REMOTE TAGS (exit $($remoteTags.ExitCode))`r`n$($remoteTags.Output -join "`r`n")`r`n"
)

$commitOrder = @("2e2dff4", "20835d4", "d7cea8f", "5d76f9d", "2957b68", "5034fa3")
$commitRows = New-Object System.Collections.Generic.List[object]
foreach ($commit in $commitOrder) {
  $meta = Invoke-Git @("show", "-s", "--format=%H|%P|%ci|%s", $commit)
  $parts = $meta.Output[0] -split "\|", 4
  $changes = Invoke-Git @("diff-tree", "--no-commit-id", "--name-status", "-r", $commit)
  if (@($changes.Output | Where-Object { $_ }).Count -eq 0) {
    $commitRows.Add([pscustomobject]@{Commit=$parts[0];Parent=$parts[1];Date=$parts[2];Subject=$parts[3];Status="";Path=""})
  } else {
    foreach ($change in $changes.Output) {
      if (-not $change) { continue }
      $columns = $change -split "`t", 2
      $commitRows.Add([pscustomobject]@{Commit=$parts[0];Parent=$parts[1];Date=$parts[2];Subject=$parts[3];Status=$columns[0];Path=$columns[1]})
    }
  }
}
Write-Csv "02_commit_change_map.csv" @($commitRows | ForEach-Object { $_ })
Write-Utf8 (Join-Path $preRoot "02_commit_graph.txt") ((Invoke-Git @("log", "--oneline", "--decorate", "--graph", "--all", "-12")).Output -join "`r`n")

$runtime = @(
  [pscustomobject]@{Path="START_MECHLEX.bat";Class="Startup runtime";LoadedBy="User launch";Required="Yes"},
  [pscustomobject]@{Path="core/start-local-server.ps1";Class="Startup runtime";LoadedBy="START_MECHLEX.bat";Required="Yes"},
  [pscustomobject]@{Path="SHARED_DATA_PATH.txt";Class="Deployment configuration";LoadedBy="Local Helper";Required="Yes for current deployment"},
  [pscustomobject]@{Path="index.html";Class="Browser runtime";LoadedBy="Local Helper static route";Required="Yes"},
  [pscustomobject]@{Path="style.css";Class="Browser runtime";LoadedBy="index.html";Required="Yes"},
  [pscustomobject]@{Path="data/mechlex-data.js";Class="Embedded base dictionary";LoadedBy="index.html";Required="Yes; alternate/fallback risk"},
  [pscustomobject]@{Path="images/catalog.js";Class="Image catalogue";LoadedBy="index.html";Required="Yes"},
  [pscustomobject]@{Path="images/mechlex-icon.svg";Class="Static asset";LoadedBy="index.html";Required="Yes"},
  [pscustomobject]@{Path="app.js";Class="Browser runtime";LoadedBy="index.html";Required="Yes"},
  [pscustomobject]@{Path="core/integrity.js";Class="Browser runtime";LoadedBy="index.html";Required="Yes"},
  [pscustomobject]@{Path="core/persistence.js";Class="Browser runtime";LoadedBy="index.html";Required="Yes"},
  [pscustomobject]@{Path="core/shared-sync.js";Class="Browser runtime";LoadedBy="index.html";Required="Yes"},
  [pscustomobject]@{Path="core/inline-editor.js";Class="Browser runtime";LoadedBy="index.html";Required="Yes"},
  [pscustomobject]@{Path="core/boot.js";Class="Browser runtime";LoadedBy="index.html";Required="Yes"},
  [pscustomobject]@{Path="core/recovery-wizard.ps1";Class="Operational recovery runtime";LoadedBy="Operator separately";Required="Conditional"},
  [pscustomobject]@{Path="<shared>/state.json";Class="Authoritative mutable data";LoadedBy="Local Helper";Required="Yes"},
  [pscustomobject]@{Path="<shared>/state.previous.json";Class="Rollback data";LoadedBy="Recovery";Required="Conditional"},
  [pscustomobject]@{Path="<shared>/history/*.json";Class="Recovery history";LoadedBy="Recovery";Required="Conditional"},
  [pscustomobject]@{Path="images/<dynamic JPEG|PNG|WebP>";Class="Dynamic content asset";LoadedBy="Browser static route";Required="Conditional"}
)
Write-Csv "03_runtime_dependency_closure.csv" $runtime

$ledger = Import-Csv -LiteralPath (Join-Path $projectRoot "handoff\08_TEST_EXECUTION_LEDGER.csv")
$historicalMatrix = Import-Csv -LiteralPath (Join-Path $projectRoot "qa\QA_TEST_MATRIX.csv")
$testRecon = @(
  [pscustomobject]@{Source="handoff/08_TEST_EXECUTION_LEDGER.csv";Claimed=108;Rows=@($ledger).Count;ExecutedRows=@($ledger|Where-Object{$_.'Executed yes/no' -eq 'Yes'}).Count;CreditablePass=@($ledger|Where-Object{$_.'Executed yes/no' -eq 'Yes' -and $_.'PASS / FAIL / BLOCKED / NOT TESTED / INCONCLUSIVE / NOT APPLICABLE' -eq 'PASS'}).Count;Verdict="108 PASS unsupported"},
  [pscustomobject]@{Source="qa/QA_TEST_MATRIX.csv";Claimed=107;Rows=$historicalMatrix.Count;ExecutedRows=@($historicalMatrix|Where-Object{$_.Status -in @("PASS","FAIL")}).Count;CreditablePass=@($historicalMatrix|Where-Object{$_.Status -eq "PASS"}).Count;Verdict="Historical input only; no statuses inherited into Goal 1"}
)
Write-Csv "04_test_claim_reconciliation.csv" $testRecon

$evidenceIndexPath = Join-Path $projectRoot "handoff\09_EVIDENCE_INDEX.md"
$evidenceText = Get-Content -LiteralPath $evidenceIndexPath -Raw -Encoding utf8
$references = @([regex]::Matches($evidenceText, '`([^`]+)`') | ForEach-Object { $_.Groups[1].Value })
$evidenceAudit = foreach ($reference in $references) {
  $candidate = Join-Path $projectRoot ($reference -replace '/', '\')
  [pscustomobject]@{Reference=$reference;Exists=Test-Path -LiteralPath $candidate;SHA256=if(Test-Path -LiteralPath $candidate -PathType Leaf){(Get-FileHash -LiteralPath $candidate -Algorithm SHA256).Hash.ToLowerInvariant()}else{""}}
}
Write-Csv "05_handoff_evidence_audit.csv" $evidenceAudit

$architectureClaims = @(
  [pscustomobject]@{Claim="Helper technology";Handoff="Node.js http-server";Actual="PowerShell System.Net.Sockets.TcpListener";Source="START_MECHLEX.bat:4; core/start-local-server.ps1:305"},
  [pscustomobject]@{Claim="Bind";Handoff="127.0.0.1:8765";Actual="IPAddress.Loopback, requested port; may move/reuse";Source="core/start-local-server.ps1:8-9,56-78,271-311"},
  [pscustomobject]@{Claim="Static serving";Handoff="Node standard server";Actual="Custom PowerShell HTTP parser/static route";Source="core/start-local-server.ps1:472-486"},
  [pscustomobject]@{Claim="UI write check";Handoff="Current helper";Actual="Hard-coded http://127.0.0.1:8765/api/can-write";Source="app.js:2366-2378"},
  [pscustomobject]@{Claim="Existing-helper identity";Handoff="Reuse same product instance";Actual="Checks only title prefix and mainContent id; does not verify project, commit or shared path";Source="core/start-local-server.ps1:56-78"}
)
Write-Csv "06_launcher_helper_trace.csv" $architectureClaims

$endpointRows = @(
  [pscustomobject]@{Path="/api/shared-health";Methods="GET, HEAD";Success="200";Other="405";OriginCheck="No";MutationRisk="No direct write; writable flag is directory attribute only";Source="core/start-local-server.ps1:325-340"},
  [pscustomobject]@{Path="/api/can-write";Methods="GET";Success="200";Other="405";OriginCheck="No";MutationRisk="OpenOrCreate can create state.json before role result";Source="core/start-local-server.ps1:342-358"},
  [pscustomobject]@{Path="/api/shared-state";Methods="GET, HEAD, PUT";Success="200/304";Other="400,403,404,405,409,415,422,503";OriginCheck="Present Origin only";MutationRisk="PUT writes; GET/HEAD read";Source="core/start-local-server.ps1:360-469"},
  [pscustomobject]@{Path="/* static";Methods="GET, HEAD";Success="200";Other="403,404,405";OriginCheck="No";MutationRisk="None";Source="core/start-local-server.ps1:472-486"}
)
Write-Csv "07_endpoint_map.csv" $endpointRows
$writeModel = [ordered]@{
  pathPrecedence = @("-SharedDataPath parameter","MECHLEX_SHARED_DATA_PATH","SHARED_DATA_PATH.txt","sibling MechLex_Shared_Data default")
  pathNormalizationInProduct = "GetFullPath only; no env expansion inside file value, reparse resolution or UNC/mapped physical identity"
  lock = ".mechlex-state.lock; FileShare.None; 5 second retry"
  staleWrite = "Lock, re-read, expectedRevision comparison"
  temp = "state.<pid>.<guid>.tmp"
  durableFlush = "StreamWriter.Flush then FileStream.Flush(true)"
  replace = "File.Replace(temp,state,previous,true), else Move for initial state"
  history = "copy written revision; retain newest 30"
  source = "core/start-local-server.ps1:13-39,187-245,412-467"
}
Write-Json "07_path_lock_atomic_model.json" $writeModel

$configHits = @(Get-ChildItem -LiteralPath $projectRoot -Recurse -File -Force |
  Where-Object { $_.FullName -notmatch "\\.git\\" -and $_.Name -eq "MechLex_Config.json" } |
  Select-Object FullName,Length)
$configAudit = [ordered]@{
  claimedFile = "MechLex_Config.json"
  filesFound = $configHits
  actualSources = $writeModel.pathPrecedence
  generatedClaimSource = "generate_md.js:21; handoff/03_ARCHITECTURE_TRUTH.md:15"
  runtimeSource = "core/start-local-server.ps1:1-4,13-31"
}
Write-Json "08_configuration_discovery.json" $configAudit

$validationRows = @(
  [pscustomobject]@{Boundary="Server startup";Checks="schema 2 plus Validate-StateData";Coverage="Top-level shared.data only";Source="core/start-local-server.ps1:283-301"},
  [pscustomobject]@{Boundary="Server PUT";Checks="body structure, schema 2, Validate-StateData";Coverage="Top-level IDs/parents and limited image data URL";Source="core/start-local-server.ps1:397-409,199-216"},
  [pscustomobject]@{Boundary="Atomic write";Checks="Validate-StateData again";Coverage="Same limited top-level coverage";Source="core/start-local-server.ps1:219-221"},
  [pscustomobject]@{Boundary="Client";Checks="IDs, codes, names, definitions, hierarchy, related refs and repair";Coverage="Materially richer, still client-side";Source="core/integrity.js:28-85,117-179,350-463"}
)
Write-Csv "09_validation_boundary_map.csv" $validationRows

$changeTrace = @($commitRows | Where-Object { $_.Path } | ForEach-Object {
  [pscustomobject]@{Commit=$_.Commit;Date=$_.Date;Subject=$_.Subject;Status=$_.Status;Path=$_.Path;RegisteredInHandoff=if($_.Path -eq "app.js" -and $_.Commit -eq $head){"CHG-002"}else{"No exact CHG mapping"}}
})
Write-Csv "10_reconstructed_change_register.csv" $changeTrace

$storageRows = @(
  [pscustomobject]@{Store="localStorage";KeyOrScope="mechlex_v6_settings and other MechLex keys";DictionaryAuthority="Yes in fallback/file mode; settings always";SecretRisk="PIN-bearing settings";Source="app.js:47-56,841-861,958-1001; core/persistence.js:112-123"},
  [pscustomobject]@{Store="IndexedDB";KeyOrScope="MechLexDB/full state";DictionaryAuthority="Primary browser persistence in persistence layer";SecretRisk="Full settings included";Source="core/persistence.js:36-60,88-99,135-160"},
  [pscustomobject]@{Store="file:// localStorage";KeyOrScope="FILE_OFFLINE_MODE";DictionaryAuthority="Functional local save branch";SecretRisk="Local alternate dictionary";Source="core/persistence.js:15,222-287,369-449"},
  [pscustomobject]@{Store="Shared state";KeyOrScope="shared.settings";DictionaryAuthority="Intended sole organizational source";SecretRisk="PIN-bearing settings cloned into shared snapshot";Source="core/shared-sync.js:31-36,74-104,152-166"}
)
Write-Csv "11_browser_storage_static_map.csv" $storageRows

$pinLocations = @(
  [pscustomobject]@{File="app.js";Lines="47-56";Kind="Settings storage key declaration";ValueRedacted=$true},
  [pscustomobject]@{File="app.js";Lines="460-464";Kind="Plain default PIN material in source";ValueRedacted=$true},
  [pscustomobject]@{File="app.js";Lines="841-861,958-1001";Kind="PIN-bearing settings localStorage load/save";ValueRedacted=$true},
  [pscustomobject]@{File="core/persistence.js";Lines="88-99,112-160";Kind="Settings copied to IndexedDB/bootstrap mirror";ValueRedacted=$true},
  [pscustomobject]@{File="core/shared-sync.js";Lines="31-36,74-104,152-166";Kind="Settings copied to shared state";ValueRedacted=$true},
  [pscustomobject]@{File="app.js";Lines="2359-2385,3833-3844";Kind="Client-side PIN comparison/authority";ValueRedacted=$true},
  [pscustomobject]@{File="core/start-local-server.ps1";Lines="253-268";Kind="MECHLEX_MOCK_ROLE production override";ValueRedacted=$true}
)
Write-Csv "12_pin_secret_exposure_REDACTED.csv" $pinLocations

$roleRows = @(
  [pscustomobject]@{Layer="UI";Role="Viewer/locked";Authority="Browse; no admin panel";Enforcement="Client state";Source="app.js, index.html"},
  [pscustomobject]@{Layer="UI";Role="Content Expert";Authority="Terms/domains UI; appearance/data tabs hidden";Enforcement="Client PIN/state only";Source="app.js:2359-2403; index.html:428-525"},
  [pscustomobject]@{Layer="UI";Role="Super Admin";Authority="All admin UI";Enforcement="Client PIN/state only";Source="app.js:2359-2403"},
  [pscustomobject]@{Layer="Helper";Role="Viewer";Authority="No intended PUT";Enforcement="Windows groups/filesystem; GET can-write may create state";Source="core/start-local-server.ps1:253-268,342-356"},
  [pscustomobject]@{Layer="Helper";Role="Editor";Authority="Any non-settings shared-state delta";Enforcement="MechLex_Editors or override plus filesystem";Source="core/start-local-server.ps1:417-434"},
  [pscustomobject]@{Layer="Helper";Role="Admin";Authority="Settings delta or initial catalog";Enforcement="MechLex_Admins/Administrators or override plus filesystem";Source="core/start-local-server.ps1:253-268,417-434"},
  [pscustomobject]@{Layer="Recovery wizard";Role="Filesystem user";Authority="Restore state";Enforcement="Filesystem access and interactive prompt; no app role";Source="core/recovery-wizard.ps1:106-150"}
)
Write-Csv "13_role_permission_model.csv" $roleRows

$handoffInventory = Import-Csv -LiteralPath (Join-Path $projectRoot "handoff\14_FILE_INVENTORY.csv")
$runtimeSet = @{}
foreach ($row in $runtime) {
  if ($row.Path -notmatch "^<") { $runtimeSet[$row.Path.ToLowerInvariant()] = $true }
}
$labelErrors = foreach ($row in $handoffInventory) {
  $actualRuntime = $runtimeSet.ContainsKey($row.Path.ToLowerInvariant())
  if (($row.'Required at runtime' -eq "Yes") -ne $actualRuntime) {
    [pscustomobject]@{
      Path=$row.Path
      HandoffClass=$row.'Production / QA / Data / Backup / Documentation'
      HandoffRequired=$row.'Required at runtime'
      RebuiltRuntimeRequired=if($actualRuntime){"Yes"}else{"No"}
      Error="Incorrect runtime-required label"
    }
  }
}
Write-Csv "14_inventory_label_errors.csv" @($labelErrors)

$allCurrentFiles = Get-ChildItem -LiteralPath $projectRoot -Recurse -File -Force |
  Where-Object {
    $_.FullName -notmatch "\\.git\\" -and
    $_.FullName -notmatch "\\codex-qa\\workspaces\\" -and
    $_.FullName -notmatch "\\codex-qa\\evidence\\" -and
    $_.FullName -notmatch "\\qa\\workspaces\\" -and
    $_.FullName -notmatch "\\qa\\automation\\node_modules\\"
  }
$rebuilt = foreach ($file in $allCurrentFiles) {
  $relative = $file.FullName.Substring($projectRoot.Length).TrimStart("\") -replace "\\","/"
  $class = if ($runtimeSet.ContainsKey($relative.ToLowerInvariant())) { "Runtime" }
    elseif ($relative -eq "core/recovery-wizard.ps1") { "Operational runtime" }
    elseif ($relative -match "^(qa|codex-qa)/") { "QA" }
    elseif ($relative -match "^handoff/") { "Handoff" }
    elseif ($relative -match "\.docx$") { "Documentation backup" }
    elseif ($relative -match "^(README|CHANGELOG|VERSION|TEST_REPORT|QUALITY_REPORT)" -or $relative -match "\.(md|txt)$") { "Documentation" }
    elseif ($relative -match "^backups/") { "Backup/distribution data" }
    elseif ($relative -match "^(test_|generate_)") { "QA utility" }
    else { "Other" }
  $safe = if ($class -in @("Backup/distribution data","QA") -or $relative -match "(state|backup|image|pin|secret)") { "REQUIRES SENSITIVE-DATA REVIEW" } else { "NOT ASSESSED IN H0" }
  [pscustomobject]@{Path=$relative;Class=$class;Length=$file.Length;SHA256=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant();SafeForGitHub=$safe}
}
Write-Csv "14_rebuilt_file_inventory.csv" $rebuilt

$expectedHandoff = @(
  "00_CODEX_START_HERE.md","01_BASELINE_IDENTITY.md","02_EXECUTIVE_SUMMARY.md",
  "03_ARCHITECTURE_TRUTH.md","04_DATA_AND_STATE_PROVENANCE.md","05_CHANGE_REGISTER.md",
  "06_STORAGE_AND_BROWSER_STATE_MAP.md","07_ROLE_AND_PERMISSION_MODEL.md",
  "08_TEST_EXECUTION_LEDGER.csv","09_EVIDENCE_INDEX.md","10_KNOWN_GAPS_AND_BLOCKERS.md",
  "11_ENVIRONMENT_MATRIX.md","12_RELEASE_GATES.md","13_OPERATIONAL_RUNBOOK.md","14_FILE_INVENTORY.csv"
)
$handoffFiles = @(Get-ChildItem -LiteralPath (Join-Path $projectRoot "handoff") -File | Select-Object -ExpandProperty Name)
$tagHandoff = Invoke-Git @("ls-tree", "-r", "--name-only", $tagName, "--", "handoff")
$completeness = foreach ($name in $expectedHandoff) {
  [pscustomobject]@{Expected=$name;Supplied=($name -in $handoffFiles);TrackedInTag=($name -in $tagHandoff.Output);Impact=if($name -in $handoffFiles){"Present as untracked worktree handoff"}else{"Missing requested handoff component"}}
}
Write-Csv "15_handoff_completeness.csv" $completeness
Write-Utf8 (Join-Path $preRoot "15_tag_handoff_tree.txt") (
  "Command: git ls-tree -r --name-only $tagName -- handoff`r`n" +
  "Exit: $($tagHandoff.ExitCode)`r`n" +
  "Rows: $(@($tagHandoff.Output | Where-Object { $_ }).Count)`r`n" +
  ($tagHandoff.Output -join "`r`n")
)

$summary = [ordered]@{
  timestampUtc = (Get-Date).ToUniversalTime().ToString("o")
  result = "PASS"
  head = $head
  tagCommit = $tagCommit
  trackedProductionChanges = $trackedDiff.Count
  authorizedH0StartUntracked = $initialUntracked.Count
  runtimeClosureRows = $runtime.Count
  handoffLedgerRows = @($ledger).Count
  handoffEvidenceReferences = $references.Count
  handoffInventoryRows = $handoffInventory.Count
  handoffInventoryRuntimeLabelErrors = @($labelErrors).Count
  suppliedHandoffFiles = $handoffFiles.Count
  trackedHandoffFilesAtTag = @($tagHandoff.Output | Where-Object { $_ }).Count
}
Write-Json "static-evidence-summary.json" $summary
$summary | ConvertTo-Json -Depth 6
