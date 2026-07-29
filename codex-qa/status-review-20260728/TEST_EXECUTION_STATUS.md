# MechLex — Test Execution Status (Status Review 2026-07-28)

**Build:** `8a0c0dd` on `qa/remediation-9-5-plus`

> [!CAUTION]
> **No runtime tests were executed during this status review.** All findings below are based on source code inspection. The test execution numbers below reflect the GOAL 1 historical baseline only.

---

## Current Test Numbers

| Metric | Value |
|---|---|
| Total Catalogue Cases (Goal 1) | 180 |
| Applicable Cases | 180 |
| Executed Cases (Goal 1) | ~55 |
| **Executed in THIS review** | **0** |
| PASS (Goal 1) | 26 |
| FAIL (Goal 1) | 37 |
| BLOCKED | 17 |
| NOT TESTED | 82 |
| INCONCLUSIVE | 18 |
| NOT APPLICABLE | 0 |
| Execution Coverage (Goal 1) | ~30% |
| Execution Coverage (this review) | **0%** |
| Evidence Coverage (Goal 1) | ~50% |
| Critical-Path Coverage | **0%** (no end-to-end workflow tested) |
| New Regression Cases Added | 0 |
| Flaky Cases | 0 identified |
| Repeated Executions | 0 |

## Test Type Breakdown

| Test Type | Executed | Notes |
|---|---|---|
| Source Inspection | YES | All production files reviewed |
| Unit Tests | NONE | No test runner exists |
| API Tests | NONE | No runtime server started |
| Browser Tests | NONE | No browser session opened |
| Manual UI Tests | NONE | No manual testing performed |
| Shared-Folder Tests | NONE | No shared folder interaction |
| Concurrency Tests | NONE | Single-machine review |
| Recovery Tests | NONE | No corruption simulation |
| Performance Tests | NONE | No benchmarks run |
| Accessibility Tests | NONE | NVDA unavailable |
| Compatibility Tests | NONE | Edge 95 unavailable |

## Historical Reference

Goal 1 test execution results are preserved in:
- `codex-qa/QA_TEST_EXECUTION_MATRIX.csv` (42,409 bytes)
- `codex-qa/QA_TEST_CATALOGUE.csv` (15,861 bytes)
- `codex-qa/GOAL1_FINDINGS.md` (7,339 bytes)

These were executed against the **frozen tag** `mechlex-final-gemini-handoff` (commit `5034fa3`), NOT the current HEAD (`8a0c0dd`). The current build includes Goal 2 fixes that have NOT been re-tested.

## This Review's Source Inspection Results

| Inspection ID | Target | What Was Verified | Method | Result |
|---|---|---|---|---|
| SI-001 | `$SimpleTeamMode` | Variable exists and is `$true` | grep + view | CONFIRMED |
| SI-002 | Relative API URLs | No `127.0.0.1` or `8765` in production app.js | grep | CONFIRMED |
| SI-003 | `/api/can-write` side-effect free | Uses temp probe, not state.json | code review | CONFIRMED |
| SI-004 | Dynamic image catalog | `/api/image-catalog` scans images/ directory | code review | CONFIRMED |
| SI-005 | PIN defaults | 1234/9999 in settings | grep | CONFIRMED |
| SI-006 | Atomic write | temp file → flush → File.Replace | code review | CONFIRMED |
| SI-007 | Conflict detection | Revision check on PUT | code review | CONFIRMED |
| SI-008 | Loopback binding | `$Address = [System.Net.IPAddress]::Loopback` | code review | CONFIRMED |
| SI-009 | Path traversal protection | `$candidate.StartsWith($RootBoundary)` | code review | CONFIRMED |
| SI-010 | `images/catalog.js` dead code | NOT loaded by index.html | grep | CONFIRMED |

> [!IMPORTANT]
> Source inspections confirm that code changes exist but are **NOT equivalent to runtime PASS results**. Every SI item above must be validated at runtime before it can be counted as a test PASS.
