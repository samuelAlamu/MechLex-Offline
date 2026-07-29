# MechLex — Evidence Index (Status Review 2026-07-28)

**Build:** `8a0c0dd` on `qa/remediation-9-5-plus`

## Source Inspection Evidence

| ID | Description | Source File | Line(s) | Method | Date |
|---|---|---|---|---|---|
| SI-001 | SimpleTeamMode = $true | core/start-local-server.ps1 | 19 | grep + view | 2026-07-28 |
| SI-002 | Relative API URLs in app.js | app.js | 66, 2378 | grep | 2026-07-28 |
| SI-003 | /api/can-write uses temp probe | core/start-local-server.ps1 | 262-283, 383-401 | code review | 2026-07-28 |
| SI-004 | Dynamic image catalog | core/start-local-server.ps1, app.js | 404-424, 64-73 | code review | 2026-07-28 |
| SI-005 | PIN defaults 1234/9999 | app.js | 471-473 | grep | 2026-07-28 |
| SI-006 | Atomic write with File.Replace | core/start-local-server.ps1 | 228-255 | code review | 2026-07-28 |
| SI-007 | Revision conflict detection | core/start-local-server.ps1 | 504-512 | code review | 2026-07-28 |
| SI-008 | Loopback binding | core/start-local-server.ps1 | 14 | code review | 2026-07-28 |
| SI-009 | Path traversal protection | core/start-local-server.ps1 | 547 | code review | 2026-07-28 |
| SI-010 | images/catalog.js not loaded | index.html | 693-698 | grep | 2026-07-28 |

## Git Evidence

| ID | Description | Command | Result | Date |
|---|---|---|---|---|
| GE-001 | Clean working tree | git status | nothing to commit | 2026-07-28 |
| GE-002 | Current branch | git branch | qa/remediation-9-5-plus | 2026-07-28 |
| GE-003 | HEAD commit | git log -1 | 8a0c0dd | 2026-07-28 |
| GE-004 | Tags | git tag -l | 4 tags (none on HEAD) | 2026-07-28 |
| GE-005 | File hashes | Get-FileHash SHA256 | 5 files hashed | 2026-07-28 |

## File System Evidence

| ID | Description | Path | Result | Date |
|---|---|---|---|---|
| FS-001 | Shared data simulation exists | C:\...\MechLex_Shared_Data_Simulation | EXISTS | 2026-07-28 |
| FS-002 | state.json exists | MechLex_Shared_Data_Simulation/state.json | 604,454 bytes | 2026-07-28 |
| FS-003 | Stale .tmp file | MechLex_Shared_Data_Simulation/state.*.tmp | 420 bytes | 2026-07-28 |
| FS-004 | No test images | images/ directory | Only mechlex-icon.svg | 2026-07-28 |
| FS-005 | images/catalog.js empty | images/catalog.js | 74 bytes, empty arrays | 2026-07-28 |

## Goal 1 Evidence (Historical)

| ID | Description | Path |
|---|---|---|
| G1-001 | Goal 1 findings | codex-qa/GOAL1_FINDINGS.md |
| G1-002 | Goal 1 category scores | codex-qa/GOAL1_CATEGORY_SCORES.md |
| G1-003 | Goal 1 status | codex-qa/GOAL_STATUS.md |
| G1-004 | Test execution matrix | codex-qa/QA_TEST_EXECUTION_MATRIX.csv |
| G1-005 | Test catalogue | codex-qa/QA_TEST_CATALOGUE.csv |

## Report Files Generated

All under `codex-qa/status-review-20260728/`:
- CURRENT_STATUS_EXECUTIVE_SUMMARY.md
- CURRENT_GIT_AND_BUILD_IDENTITY.md
- TWO_FILE_FIX_VERIFICATION.md
- TASK_STATUS_MATRIX.csv
- AUTOMATIC_IMAGE_STATUS.md
- TEST_EXECUTION_STATUS.md (replaces .csv)
- ENVIRONMENT_MATRIX.md
- ARCHITECTURE_TRUTH_CURRENT.md
- SIMILARITY_AUDIT_REGISTER.csv
- CURRENT_FINDINGS.md
- DOCUMENTATION_STATUS.md
- CURRENT_CATEGORY_SCORES.md
- REMAINING_WORK_PLAN.md
- EVIDENCE_INDEX.md
- FINAL_STATUS_REPORT_EN.md
- FINAL_STATUS_REPORT_HE.md
