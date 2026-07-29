# MechLex — Current Category Scores (Status Review 2026-07-28)

**Build:** `8a0c0dd` on `qa/remediation-9-5-plus`  
**Method:** Source code inspection. No runtime tests executed.  
**Baseline:** Goal 1 scores from `codex-qa/GOAL1_CATEGORY_SCORES.md` (frozen tag `mechlex-goal1-no-go-baseline`)

> [!IMPORTANT]
> All scores below are based on code inspection against the Goal 2 fixes. Without runtime verification, confidence levels are LOW. Score improvements from Goal 1 reflect **code changes only**, not proven behavior.

---

## Category Scores

### 1. Architecture — 6.5/10 (Goal 1: 5.0)

| Metric | Value |
|---|---|
| Confidence | LOW — no runtime test |
| Evidence Count | 7 code inspections |
| Proven Strengths | Loopback binding; dynamic port selection; relative API URLs; path boundary enforcement; no hardcoded port in production browser code |
| Open Findings | Embedded data used before sync; `images/catalog.js` dead code; stale QA workspace copies |
| External Blockers | None |
| Score Rationale | Hard-coded port fixed (+1.0); dynamic port discovery implemented (+0.5); embedded data still loads pre-sync (-0.5) |
| Work for 9.5 | Prove dynamic port end-to-end; eliminate pre-sync embedded data authority; verify helper identity matching |

### 2. Offline Operation — 5.0/10 (Goal 1: 4.0)

| Metric | Value |
|---|---|
| Confidence | LOW |
| Evidence Count | 3 code inspections |
| Proven Strengths | `file://` detection in shared-sync.js blocks sync; persistence.js refuses save in file mode |
| Open Findings | `file://` still renders embedded data as functional dictionary (G1-SEC-01 not fully resolved) |
| External Blockers | None |
| Score Rationale | file:// sync block added (+1.0); but embedded data still loads (-0.5) |
| Work for 9.5 | Block or redirect file:// before any dictionary renders; prove all offline scenarios |

### 3. Reliability — 4.0/10 (Goal 1: 3.0)

| Metric | Value |
|---|---|
| Confidence | LOW |
| Evidence Count | 4 code inspections |
| Proven Strengths | Atomic write with File.Replace; conflict detection on PUT; rollback on failure; recovery mode on corrupt state |
| Open Findings | 304 polling ERR_ABORTED (G1-SYNC-01); brief false-save window before rollback |
| External Blockers | None |
| Score Rationale | Robust atomic save path (+0.5); rollback mechanism (+0.5); 304 issue remains (-0.5) |
| Work for 9.5 | Fix 304 polling; prove failure-accurate save contract; restart/soak test suite |

### 4. Data Integrity — 4.0/10 (Goal 1: 2.5)

| Metric | Value |
|---|---|
| Confidence | LOW |
| Evidence Count | 5 code inspections |
| Proven Strengths | SHA-256 checksum on shared state; semantic validation (duplicate IDs, dangling parents); temp-file atomic write; history rotation (30 entries) |
| Open Findings | Nested corrupt state acceptance (G1-SEC-06 status unclear); write-probe OpenOrCreate on lock file (acceptable) |
| External Blockers | None |
| Score Rationale | Checksum validation (+0.5); semantic validation added (+1.0); limited test coverage (-0.5) |
| Work for 9.5 | Recursive validation proof; all corruption/import/restore test cases pass |

### 5. Synchronization & Multi-user Safety — 3.5/10 (Goal 1: 3.0)

| Metric | Value |
|---|---|
| Confidence | LOW |
| Evidence Count | 3 code inspections |
| Proven Strengths | Revision-based conflict detection; file lock on write; fail-closed when disconnected; rollback on conflict |
| Open Findings | No multi-workstation SMB test; 304 polling issue; lock file uses OpenOrCreate |
| External Blockers | Two-workstation test environment unavailable |
| Score Rationale | Conflict handling implemented (+0.5); no new SMB evidence |
| Work for 9.5 | Full Tier 3 distinct-machine/SID test suite; reconnect/soak tests |

### 6. Backup and Recovery — 6.5/10 (Goal 1: 6.0)

| Metric | Value |
|---|---|
| Confidence | LOW |
| Evidence Count | 4 code inspections |
| Proven Strengths | 30-entry history; state.previous.json; forensic copy on corruption; recovery-wizard.ps1 exists; local restore points in localStorage |
| Open Findings | Cross-machine recovery untested; interrupted restore untested |
| External Blockers | None |
| Score Rationale | Recovery mode implemented (+0.5); no new execution evidence |
| Work for 9.5 | All 14 backup/recovery cases pass with evidence |

### 7. Performance and Capacity — 5.0/10 (Goal 1: 5.0)

| Metric | Value |
|---|---|
| Confidence | LOW |
| Evidence Count | 1 code inspection |
| Proven Strengths | 35MB body limit; ReadAllBytes for static files |
| Open Findings | Large image latency (5-15 MiB took 5-9 seconds in Goal 1); no performance regression suite |
| External Blockers | None |
| Score Rationale | No change from Goal 1 |
| Work for 9.5 | Agreed latency budget; 15 MiB JPEG/PNG/WebP benchmarks pass |

### 8. Maintainability — 5.0/10 (Goal 1: 4.5)

| Metric | Value |
|---|---|
| Confidence | MEDIUM |
| Evidence Count | 3 code inspections |
| Proven Strengths | Modular architecture (app.js + 5 core modules); VERSION.txt; clear API boundaries |
| Open Findings | No package.json; no test runner; stale QA workspace copies; dead images/catalog.js |
| External Blockers | None |
| Score Rationale | Clean modular design (+0.5); no executable test suite |
| Work for 9.5 | Package.json; executable test suite; version consistency; cleanup dead files |

### 9. UX — 4.5/10 (Goal 1: 4.0)

| Metric | Value |
|---|---|
| Confidence | LOW |
| Evidence Count | 3 code inspections |
| Proven Strengths | PIN dialog; role selection; shared sync status badge; conflict toast; read-only mode messaging |
| Open Findings | Dirty-close warning (G1-UX-02); special-char search (G1-UX-01); auto-image untestable |
| External Blockers | None |
| Score Rationale | Improved messaging (+0.5); untested workflows |
| Work for 9.5 | All editing/search/recovery/responsive workflows pass |

### 10. Accessibility — 5.0/10 (Goal 1: 5.0)

| Metric | Value |
|---|---|
| Confidence | LOW |
| Evidence Count | 1 code inspection |
| Proven Strengths | ARIA labels; role attributes; skip-to-content button |
| Open Findings | ARIA/tab inconsistency (G1-A11Y-01); NVDA untested |
| External Blockers | NVDA not installed; Edge 95 unavailable |
| Score Rationale | No change from Goal 1 |
| Work for 9.5 | Fix ARIA defects; NVDA evidence; Edge 95 keyboard |

### 11. Security (Simple Team Mode) — 4.0/10 (Goal 1: 2.0)

| Metric | Value |
|---|---|
| Confidence | LOW |
| Evidence Count | 6 code inspections |
| Proven Strengths | Simple Team Mode bypasses Windows groups; write probe does not touch state.json; CSP headers; path traversal protection; Origin enforcement on state endpoint |
| Open Findings | PIN validation client-side only; PINs stored in state.json plaintext; empty catch in can-write |
| External Blockers | None |
| Score Rationale | Major improvement: Simple Team Mode (+1.0); write probe fix (+0.5); PINs in state.json (-0.5) |
| Work for 9.5 | Consistent origin enforcement; remove PINs from shared state; prove all role scenarios |

### 12. Operational Readiness — 3.5/10 (Goal 1: 3.0)

| Metric | Value |
|---|---|
| Confidence | LOW |
| Evidence Count | 2 code inspections |
| Proven Strengths | Dynamic port discovery; existing-server reuse; clear startup messages; documentation exists |
| Open Findings | No launcher identity verification; documentation outdated; no EXE launcher |
| External Blockers | None |
| Score Rationale | Dynamic port (+0.5); outdated docs |
| Work for 9.5 | Fail-closed launcher verification; complete documentation; clean-station proof |

### 13. Compatibility — 2.5/10 (Goal 1: 2.5)

| Metric | Value |
|---|---|
| Confidence | LOW |
| Evidence Count | 0 runtime tests |
| Proven Strengths | `legacy-edge95` CSS class detection |
| Open Findings | Edge 95 untested; clean workstation untested |
| External Blockers | No Edge 95 VM available |
| Score Rationale | No change from Goal 1 |
| Work for 9.5 | Edge 95 VM runtime test; UNC/mapped-drive/mixed-language suite |

---

## Summary Scores

| Metric | Score |
|---|---|
| **Product Quality Score** | **4.5/10** (Goal 1: 3.8) |
| **Release Readiness Score** | **2.0/10** (Goal 1: 1.5) |
| **Evidence Coverage** | ~15% (code inspection only; no runtime execution) |
| **Execution Coverage** | 0% (no tests executed in this review) |
| **Critical-Path Coverage** | 0% (no end-to-end workflow tested) |

> [!WARNING]
> Product Quality improvement is based entirely on code-level fixes that have NOT been runtime-verified. Release Readiness remains very low because mandatory release gates lack execution evidence. A mandatory release failure cannot be averaged away.
