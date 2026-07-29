# MechLex — Remaining Work Plan (Status Review 2026-07-28)

**Build:** `8a0c0dd` on `qa/remediation-9-5-plus`

---

## P0 — Release Blockers

| # | Task | Reason | Affected Files | Required Test | Complexity | Dependency | Release Impact |
|---|---|---|---|---|---|---|---|
| P0-1 | Runtime verify Simple Team Mode | PIN 1234/9999 must work without elevation | `core/start-local-server.ps1`, `app.js` | Launch as normal user, enter PINs, verify admin panel | LOW | Helper server running | BLOCKER: No evidence of working PIN flow |
| P0-2 | Runtime verify durable save cycle | Edits must persist to state.json and survive restart | `core/shared-sync.js`, `core/start-local-server.ps1` | Edit term → save → restart helper → reopen → verify | MEDIUM | P0-1 | BLOCKER: No evidence of durable write |
| P0-3 | Fix 304 polling ERR_ABORTED (G1-SYNC-01) | Modern Edge treats polling response as error, triggering read-only | `core/shared-sync.js`, `core/start-local-server.ps1` | Verify polling in Edge 130+ does not cause ERR_ABORTED | MEDIUM | None | BLOCKER: Sync degradation |
| P0-4 | Place test images and verify auto-match | Automatic image matching is a mandatory requirement | `images/` directory, `app.js` | Place `term-name.jpg` → open term → verify image loads | LOW | P0-1 | BLOCKER: Feature untestable |
| P0-5 | Fix file:// rendering functional dictionary (G1-SEC-01) | file:// must not open a second functional dictionary | `app.js`, `core/persistence.js` | Open via file:// → verify redirect or blocked state | MEDIUM | None | BLOCKER: Split-brain risk |
| P0-6 | Ensure save failure is accurately reported (G1-SEC-07) | User must never see "saved" if data did not persist | `core/shared-sync.js`, `core/persistence.js` | Kill helper during save → verify error shown, no false success | HIGH | P0-2 | BLOCKER: False save = data loss |

## P1 — Major Completion Work

| # | Task | Reason | Affected Files | Required Test | Complexity | Dependency | Release Impact |
|---|---|---|---|---|---|---|---|
| P1-1 | Update documentation for Simple Team Mode | Users need to know PINs and how the system works | `README_HE.txt`, `README.md` | Documentation review | LOW | None | Users cannot configure system |
| P1-2 | Remove PINs from shared state.json | PINs in plaintext in shared folder visible to all workstations | `core/shared-sync.js`, `app.js` | Save settings → verify PINs NOT in state.json | MEDIUM | None | Security concern |
| P1-3 | Clean up dead `images/catalog.js` file | Confusing dead code | `images/catalog.js`, `index.html` (verify not loaded) | Verify removal has no impact | LOW | None | Maintainability |
| P1-4 | Clean stale .tmp file in shared data directory | Orphan from interrupted operation | Shared data directory | Manual cleanup | LOW | None | Cosmetic |
| P1-5 | Fix empty catch block in /api/can-write | Swallowed error at PS1 line 399 | `core/start-local-server.ps1` | Verify error logged not swallowed | LOW | None | Debugging difficulty |
| P1-6 | Add unsaved-change warning (G1-UX-02) | Dirty close discards edits silently | `app.js` | Edit term → close without saving → verify warning | MEDIUM | None | Data loss risk |
| P1-7 | Fix special-character search (G1-UX-01) | `A | B` returns all 142 terms | `app.js` | Search with `|`, `(`, `[`, `*` → verify correct results | LOW | None | UX defect |
| P1-8 | Fix ARIA/tab inconsistency (G1-A11Y-01) | Inconsistent tab ARIA states | `index.html`, `app.js` | Keyboard navigation test | LOW | None | Accessibility |

## P2 — Quality and Maintainability

| # | Task | Reason | Affected Files | Required Test | Complexity | Dependency | Release Impact |
|---|---|---|---|---|---|---|---|
| P2-1 | Create package.json and test runner | No executable test suite exists | New `package.json`, test scripts | Run test suite | MEDIUM | None | Maintainability |
| P2-2 | Add image cache-busting for auto-matched images | Replaced images may show stale version | `app.js` | Replace image → verify new version loads | LOW | None | Stale images |
| P2-3 | Add re-fetch mechanism for image catalog after init | Images added after startup not detected | `app.js` | Add image while running → verify it appears | LOW | None | UX gap |
| P2-4 | Remove stale QA workspace copies or add .gitignore | Old copies with hardcoded URLs confuse audits | `codex-qa/workspaces/` | Verify ignored or documented | LOW | None | Audit confusion |
| P2-5 | Verify helper identity/version before reuse (G1-ARCH-02) | Wrong helper can be reused | `core/start-local-server.ps1`, `START_MECHLEX.bat` | Launch two instances with different data paths | MEDIUM | None | Wrong-data risk |
| P2-6 | Performance benchmarks for 15 MiB images | Goal 1 showed 5-9 second load times | `app.js` | Benchmark with 15 MiB JPEG/PNG/WebP | MEDIUM | None | User experience |

## P3 — Optional Future Enhancements

| # | Task | Reason | Affected Files | Required Test | Complexity | Dependency | Release Impact |
|---|---|---|---|---|---|---|---|
| P3-1 | EXE launcher | More user-friendly than BAT | New build system | Launch and verify | HIGH | Build tooling | Convenience |
| P3-2 | Edge 95 compatibility verification | Listed requirement but environment unavailable | Browser testing | Acquire Edge 95 VM | HIGH | VM acquisition | Compatibility |
| P3-3 | NVDA screen reader testing | Accessibility requirement | N/A | Install NVDA and test | MEDIUM | NVDA installation | Accessibility |
| P3-4 | Multi-workstation SMB testing | Concurrency requirement | N/A | Two machines with shared folder | HIGH | Second machine | Sync safety |
| P3-5 | Hardened Mode (optional) | For organizations wanting Windows group enforcement | `core/start-local-server.ps1` | Test with AD groups | HIGH | AD infrastructure | Enterprise option |

---

## Priority Summary

| Priority | Count | Critical for Release? |
|---|---|---|
| P0 | 6 | **YES** — these must be resolved before release |
| P1 | 8 | **YES** — these should be resolved before release |
| P2 | 6 | NO — but improve quality significantly |
| P3 | 5 | NO — optional or environment-blocked |
