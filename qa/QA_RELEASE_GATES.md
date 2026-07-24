# MechLex QA Release Gates

**Decision:** NO GO  
**Overall score:** 3.1/10  
**Critical regression:** FAIL (3 PASS, 5 FAIL, 1 NOT TESTED)

| Gate | Required | Result | Evidence / blocker |
|---|---|---|---|
| Baseline preservation | Exact verified copies | PASS | Six QA workspaces hash-verified |
| JavaScript syntax | All active files valid | PASS | `qa/evidence/commands/critical-regression-*.log` |
| Static package integrity | No missing promised QA assets or version drift | FAIL | Missing `package.json`, `tests/`, `MANIFEST_SHA256.txt`; version mismatch |
| No external internet dependency | Zero external runtime requests | PASS | Browser network capture |
| Local launch model | Meets stated no-server requirement | FAIL | PowerShell loopback server is mandatory |
| Shared-state schema and checksum | Active state valid and signed | FAIL | Active state is unsigned schema-1 performance fixture |
| Atomic write and stale-write protection | No silent overwrite | PASS | 12/12 API checks; 20 concurrent rounds |
| Different-record concurrent edits | Both edits survive | FAIL | Whole-snapshot optimistic concurrency rejects one writer |
| Browser polling | Stable no-change cycle | FAIL | HTTP 304 appears as `net::ERR_ABORTED` |
| Shared-source failure behavior | No split-brain/local silent save | FAIL | Local fallback remains possible before sync readiness |
| Admin authorization | No privilege escalation | FAIL | Direct `openAdmin("super")` bypass |
| Full backup integrity | Signed and restorable | PARTIAL | Signed browser backup restored; external images excluded |
| Corrupt shared-state recovery | Repair shared source safely | FAIL | Browser restore may succeed locally without repairing shared source |
| Image capacity 1–15MB server | Round-trip all sizes | PASS | 1/3/5/8/10/15MB passed API |
| Image capacity 15MB end-to-end | Load within client limits | FAIL | ~9.08s GET vs fixed 5s timeout |
| Core browser flows | No critical failures | FAIL | 20 PASS, 3 FAIL |
| UX edge flows | Required edge behavior | FAIL | 0 PASS, 4 FAIL |
| Mobile horizontal overflow | None at 390/768px | PASS | Browser screenshots/assertions |
| Accessibility state/focus | Accurate ARIA and visible focus order | FAIL | Stale tabs ARIA; offscreen mobile focus |
| Edge 95 compatibility | Tested on actual Edge 95 | NOT TESTED | Edge 150 installed |
| Two physical workstations + SMB/UNC | Required production topology proven | NOT TESTED | Single-host simulation only |
| Windows ACL role matrix | Real account/ACL enforcement proven | NOT TESTED | Separate Windows accounts unavailable |
| Critical regression after fixes | All gates green | NOT TESTED | No production patches authorized or applied |

## GO criteria

A future GO requires:

1. Valid recovered shared state with schema and checksum validation.
2. No Super Admin bypass and a documented enforceable permission boundary.
3. Stable polling and no silent local fallback.
4. End-to-end 15MB image path within defined timeouts, or a revised documented limit.
5. Green critical regression.
6. Physical two-workstation/SMB/ACL verification for the intended deployment.

