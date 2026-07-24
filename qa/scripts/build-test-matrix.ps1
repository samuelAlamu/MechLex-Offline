param(
  [string]$MasterDocument = "C:\Users\samue\Downloads\MechLex_Codex_Goal_Driven_QA_Master.md",
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
)

$ErrorActionPreference = "Stop"
$master = Get-Content -LiteralPath $MasterDocument -Raw -Encoding UTF8
$ids = [regex]::Matches($master, "\b(?:OFF|SYNC|CNT|SRCH|IMG|AUTH|REC|CACHE|PERF|UX)-\d{3}\b") |
  ForEach-Object { $_.Value } |
  Select-Object -Unique

$executed = @{
  "OFF-001" = @("PASS", "Edge 150 / disposable loopback copy", "qa/evidence/logs/browser-core-results.json", "", "Cold start 0.85s, core local assets loaded without Internet dependency. Local-server contradiction is scored separately.")
  "OFF-002" = @("PASS", "Static scan + Edge 150", "qa/evidence/logs/static-audit.json; qa/evidence/logs/browser-core-results.json", "", "No active CDN, analytics, remote font or external API request.")
  "OFF-007" = @("INCONCLUSIVE", "Windows 11 / disposable copy", "qa/evidence/logs/shared-api-results.json", "F-START-001", "Server script launched and API worked; BAT/restricted-account/browser-missing cases were not fully executed.")
  "OFF-008" = @("INCONCLUSIVE", "Disposable API copy", "qa/evidence/logs/shared-api-results.json", "F-SYNC-003", "Missing state GET returned 404 safely, but browser startup auto-creates a new shared source.")
  "OFF-010" = @("FAIL", "Architecture + runtime", "qa/architecture/SYSTEM_MAP.md", "F-ARCH-001", "A PowerShell loopback server is mandatory, contradicting the no-local-server requirement.")
  "SYNC-004" = @("FAIL", "20 concurrent API rounds / one Windows host", "qa/evidence/logs/shared-api-results.json", "F-SYNC-005", "No silent overwrite: one writer wins and one gets 409. Different-record changes do not both survive as required.")
  "SYNC-005" = @("PASS", "20 concurrent API rounds / one Windows host", "qa/evidence/logs/shared-api-results.json", "", "Stale same-revision writes were rejected with 409 in all executed rounds.")
  "SYNC-009" = @("FAIL", "Edge 150 / disposable shared state", "qa/evidence/logs/browser-core-results.json", "F-SYNC-001", "Polling 304 responses produced ERR_ABORTED requests and transient read-only behavior.")
  "SYNC-010" = @("PASS", "API writer / disposable state", "qa/evidence/logs/shared-api-results.json", "", "Revision and checksum remained valid through executed sequential/concurrent writes.")
  "SYNC-013" = @("FAIL", "Static + Edge runtime evidence", "qa/evidence/logs/browser-core-results.json", "F-SYNC-001", "Polling network errors force read-only state without a reliable recovery indication.")
  "SYNC-014" = @("FAIL", "Static code-path reproduction", "qa/QA_FINDINGS.md", "F-SYNC-002", "When startup never established shared sync, saveAll may persist locally instead of blocking the edit.")
  "CNT-001" = @("PASS", "Edge 150 / disposable shared state", "qa/evidence/logs/browser-core-results.json", "", "Disposable term creation persisted and was visible to a second isolated context.")
  "CNT-010" = @("PASS", "Edge 150 sanitizer check", "qa/evidence/logs/browser-core-results.json", "", "Sanitizer removed script, event-handler and javascript URL markup.")
  "SRCH-001" = @("PASS", "Edge 150 / base catalog", "qa/evidence/logs/browser-core-results.json", "", "Exact Hebrew term search returned the expected item.")
  "SRCH-003" = @("PASS", "Edge 150 / base catalog", "qa/evidence/logs/browser-core-results.json", "", "English/Unicode counterpart search returned the expected item; Amharic data was not supplied.")
  "SRCH-005" = @("FAIL", "Edge 150 / base catalog", "qa/evidence/logs/ux-edge-cases.json", "F-SRCH-001", "Query A | B returned all 8 terms because single-letter tokens score broadly.")
  "SRCH-007" = @("PASS", "Edge 150 / base catalog", "qa/evidence/logs/browser-core-results.json", "", "No-result query produced zero cards without a crash.")
  "SRCH-009" = @("PASS", "Edge 150 / term modal", "qa/evidence/logs/browser-core-results.json", "", "Twelve Tab presses remained inside the open term modal.")
  "IMG-001" = @("FAIL", "Edge 150 + disposable API capacity run", "qa/evidence/logs/browser-image-results.json; qa/evidence/performance/image-capacity-api.json", "F-IMG-001", "1/3/5MB persisted through the UI; 15MB server round-trip worked but GET took 6.9-9.1s and exceeded the fixed 5s client timeout.")
  "AUTH-002" = @("FAIL", "Edge 150 direct-call test", "qa/evidence/logs/browser-core-results.json", "F-AUTH-001", "openAdmin('super') bypassed the PIN and exposed Super Admin controls.")
  "AUTH-003" = @("PASS", "Edge 150 visible content role", "qa/evidence/logs/browser-core-results.json", "", "Content Expert UI allowed content scope and hid appearance/data tabs.")
  "AUTH-004" = @("FAIL", "Edge 150 direct-call + static code path", "qa/evidence/logs/browser-core-results.json", "F-AUTH-001", "Expert restrictions are UI-only and can be bypassed by direct global calls.")
  "AUTH-006" = @("FAIL", "Static + browser role state", "qa/QA_FINDINGS.md", "F-AUTH-001", "Role/PIN state is client-side and modifiable; no trusted authorization layer exists.")
  "AUTH-007" = @("NOT TESTED", "No separate Windows/SMB accounts supplied", "qa/reports/SECURITY_PERMISSION_REALITY.md", "F-AUTH-002", "Actual Viewer/Expert/Admin ACL matrix is unavailable.")
  "AUTH-008" = @("PASS", "Edge 150 sanitizer check", "qa/evidence/logs/browser-core-results.json", "", "Stored rich HTML sanitizer removed active markup in the executed sanitizer path.")
  "REC-001" = @("INCONCLUSIVE", "Disposable Windows filesystem", "qa/evidence/logs/shared-api-results.json", "F-ATOMIC-001", "Temp + replace + previous/history observed; forced process/power interruption timing was not executed.")
  "REC-006" = @("INCONCLUSIVE", "Disposable API copy", "qa/evidence/logs/shared-api-results.json", "F-REC-001", "Malformed JSON was rejected and source preserved, but browser UI cannot repair the shared source.")
  "REC-007" = @("FAIL", "Configured external shared source", "qa/evidence/baseline/external-shared-inventory.json", "F-PERS-001", "Schema-1 unsigned performance fixture with 2,000 nested terms is accepted as authoritative.")
  "REC-009" = @("PASS", "Edge 150 / disposable state", "qa/evidence/logs/browser-core-results.json", "F-BACK-003", "A signed full-admin JSON download was created and parsed; download completion status remains optimistic.")
  "REC-011" = @("PASS", "Second isolated Edge context / basic dataset", "qa/evidence/logs/browser-core-results.json", "F-REC-001", "Signed backup restored and removed a disposable term. Corrupt shared-source repair and external-image restore remain unproven.")
  "REC-013" = @("FAIL", "Static backup inspection", "qa/evidence/logs/static-audit.json", "F-BACK-001", "Both bundled initial backups are unsigned and accepted as legacy.")
  "PERF-001" = @("INCONCLUSIVE", "Edge 150 / 4 domains, 8 terms", "qa/evidence/performance/browser-performance.json", "", "Base cold start was below 1s; medium/large datasets and five-run distributions were not executed.")
  "PERF-004" = @("FAIL", "Disposable API capacity run", "qa/evidence/performance/image-capacity-api.json", "F-IMG-001", "15MB image state GET exceeded the app's 5s timeout and the proposed 3s target.")
  "PERF-010" = @("INCONCLUSIVE", "API capacity + base browser run", "qa/evidence/performance/image-capacity-api.json", "F-IMG-003", "Single embedded 15MB image tested at server level; multi-image/catalog limits remain unknown.")
  "UX-001" = @("NOT TESTED", "Edge 95 unavailable", "qa/QA_RELEASE_GATES.md", "F-COMPAT-001", "Installed Edge is 150.0.4078.83; modern Edge is not proof of Edge 95.")
  "UX-002" = @("INCONCLUSIVE", "Edge 150 at 390/768/1440 CSS pixels", "qa/evidence/logs/browser-core-results.json", "", "No horizontal overflow at tested widths; Windows 125%/150% display scaling was not available.")
  "UX-003" = @("PASS", "Edge 150 / base mixed Hebrew-English content", "qa/evidence/logs/browser-core-results.json", "", "Document RTL and sampled mixed Hebrew/English term presentation were correct.")
  "UX-005" = @("FAIL", "Edge 150 / unsaved admin form", "qa/evidence/logs/ux-edge-cases.json", "F-UX-001", "Modified form closed with zero warning dialogs while status still said all changes were saved.")
  "UX-008" = @("FAIL", "Documentation-to-runtime comparison", "qa/evidence/logs/static-audit.json", "F-DOC-001; F-DOC-002", "Documented package/tests/manifest are absent; versions conflict.")
  "UX-009" = @("FAIL", "Edge 150 desktop/mobile", "qa/evidence/logs/ux-edge-cases.json", "F-A11Y-001; F-A11Y-002", "ARIA selected state is stale and 11 offscreen sidebar controls receive focus on mobile.")
}

$rows = foreach ($id in $ids) {
  if ($executed.ContainsKey($id)) {
    $value = $executed[$id]
    [pscustomobject]@{
      TestID = $id
      Status = $value[0]
      Date = "2026-07-25"
      Environment = $value[1]
      Evidence = $value[2]
      FindingIDs = $value[3]
      Notes = $value[4]
    }
  } else {
    [pscustomobject]@{
      TestID = $id
      Status = "NOT TESTED"
      Date = "2026-07-25"
      Environment = "Unavailable or not completed in supplied environment"
      Evidence = "qa/QA_FINAL_REPORT.md"
      FindingIDs = ""
      Notes = "Not executed; required prerequisite, destructive timing, data scale, physical workstation, SMB/ACL environment, legacy browser or independent user was unavailable."
    }
  }
}

$output = Join-Path $ProjectRoot "qa\QA_TEST_MATRIX.csv"
$rows | Export-Csv -LiteralPath $output -NoTypeInformation -Encoding UTF8
$summary = $rows | Group-Object Status | Sort-Object Name | ForEach-Object { [pscustomobject]@{ status = $_.Name; count = $_.Count } }
$summary | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $ProjectRoot "qa\evidence\logs\test-matrix-summary.json") -Encoding UTF8

Write-Output ("Created {0} rows at {1}" -f $rows.Count, $output)
$summary | Format-Table -AutoSize
