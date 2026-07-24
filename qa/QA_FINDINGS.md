# MechLex QA Findings Register

## Severity summary

| Severity | Count | Release impact |
|---|---:|---|
| Critical | 5 | Immediate NO GO |
| High | 9 | Must fix before pilot |
| Medium | 6 | Fix before broad release |
| Total | 20 | 20 open |

## Critical findings

### F-PERS-001 — Active shared state is invalid for the current client

- **Severity / priority / status:** Critical / P0 / Open
- **Category:** Data integrity, recovery
- **Observed:** The configured `state.json` is unsigned schema 1 with reason `Performance test load`, 10 domains and 2,000 nested terms ignored by the current client. `state.previous.json` is valid schema 2, revision 13, with matching checksum.
- **Expected:** The active shared state must match the current schema, be checksummed, and contain data where the client reads it.
- **Reproduction:** Resolve `SHARED_DATA_PATH.txt`; inspect copied active and previous evidence files; compare schema, revision, checksum and item nesting.
- **Root cause:** Weak server-side validation accepts legacy/partial snapshots; a performance fixture became the active state.
- **Risk:** Empty or incorrect catalog display, persistence of corrupt structure, loss of the last known-good shared state.
- **Recommendation:** Freeze writes, make a full copy, recover revision 13 through an approved procedure, and enforce a complete schema/checksum contract on GET and PUT.
- **Evidence:** `qa/evidence/baseline/external-shared-state-active.json`, `external-shared-state-previous.json`, `external-shared-inventory.json`.
- **Residual risk:** Recovery itself overwrites active data and must be explicitly approved, hashed, logged and rollback-tested.

### F-AUTH-001 — Super Admin PIN can be bypassed

- **Severity / priority / status:** Critical / P0 / Open
- **Category:** Security and permissions
- **Observed:** Calling `openAdmin("super")` directly opens Super Admin without a PIN. The API does not enforce application roles.
- **Expected:** Privileged capability must be enforced at a security boundary, not only by hiding UI controls.
- **Reproduction:** Open browser DevTools in the QA copy, call the function, observe the Super Admin view.
- **Root cause:** Role checks are client-side presentation state; privileged functions are globally callable.
- **Risk:** Any local user with browser tooling can reach destructive controls; direct API calls bypass role UI.
- **Recommendation:** Define the real trust model. Enforce privilege through Windows account/ACL or an authenticated server capability, and remove global privileged entry points.
- **Evidence:** `qa/evidence/screenshots/security-direct-super-bypass.png`, `qa/evidence/logs/browser-core-results.json`.
- **Residual risk:** A PIN embedded in client code is not sufficient protection.

### F-SYNC-002 — Shared-sync failure can silently fall back to local persistence

- **Severity / priority / status:** Critical / P0 / Open
- **Category:** Reliability, synchronization
- **Observed:** Before sync readiness and without a committed shared snapshot, the shared wrapper can route saves to base/local persistence.
- **Expected:** When a shared source is configured but unavailable, writes must be blocked or explicitly queued with unmistakable user consent.
- **Reproduction:** Start with an unreachable shared source, edit before the first successful sync, inspect local state and absence of the change on another context.
- **Root cause:** Compatibility fallback treats “not yet connected” like standalone mode.
- **Risk:** Split-brain, invisible data divergence, user believes changes are shared when they are not.
- **Recommendation:** Make shared mode fail closed; show a persistent unsynced state and require explicit reconciliation.
- **Evidence:** `qa/architecture/DATA_FLOW.md`, `qa/architecture/PERSISTENCE_AND_LOCKING.md`, source review of `core/shared-sync.js`.
- **Residual risk:** Queued offline changes still need conflict-safe reconciliation.

### F-REC-001 — Browser restore does not reliably repair corrupt shared state

- **Severity / priority / status:** Critical / P0 / Open
- **Category:** Backup and recovery
- **Observed:** Restore succeeds in isolated browser storage, but when shared sync never becomes ready it may report local success without replacing the corrupt shared source.
- **Expected:** A disaster restore must state exactly which source was repaired and verify the recovered shared snapshot.
- **Reproduction:** Use a corrupt/unreadable shared state, invoke restore, then inspect the shared source from a second context.
- **Root cause:** Restore is coupled to the same persistence wrapper and readiness ambiguity as ordinary saves.
- **Risk:** False recovery confidence while other users continue loading corrupt data.
- **Recommendation:** Add a privileged recovery workflow that writes a verified revision to the shared source, then re-reads and checks hash/schema from a second process.
- **Evidence:** `qa/evidence/recovery/browser-full-admin-backup.json`, `qa/evidence/screenshots/restore-second-context.png`, architecture notes.
- **Residual risk:** Recovery needs exclusive locking and rollback.

### F-IMG-001 — 15MB image gate fails end to end

- **Severity / priority / status:** Critical / P0 / Open
- **Category:** Performance and capacity
- **Observed:** A 15MB PNG becomes a ~20.97MB JSON state. Latest GET took ~9.08s; the browser client aborts after 5s.
- **Expected:** The documented 15MB case must save and reload reliably within the defined response target.
- **Reproduction:** Generate the 15MB fixture, persist through the API, reload through the client.
- **Root cause:** Images are embedded as Base64 in a whole-state JSON document plus a fixed 5s client timeout.
- **Risk:** Read-only/offline behavior, failed loads and unusable catalog as image volume grows.
- **Recommendation:** Store images separately and reference them by ID/path, or formally lower the limit; add streaming/capacity limits and aligned timeouts.
- **Evidence:** `qa/evidence/performance/image-capacity-api.json`, `qa/evidence/logs/browser-image-results.json`.
- **Residual risk:** Increasing timeout alone does not solve memory, transfer and full-state rewrite costs.

## High findings

| ID | Finding | Category | Evidence | Recommendation |
|---|---|---|---|---|
| F-ARCH-001 | Mandatory PowerShell loopback server contradicts the “no local server dependency” acceptance criterion | Architecture/offline | `qa/architecture/SYSTEM_MAP.md`, README/source | Align requirements or replace the server dependency with an approved packaging model |
| F-SYNC-001 | HTTP 304 polling appears as `net::ERR_ABORTED` and triggers transient offline/read-only behavior | Sync/reliability | `browser-core-results.json` | Return an explicit 200 unchanged envelope or handle 304 as success without fetch abort semantics |
| F-SYNC-003 | Wrong or missing shared path can be created and initialized automatically | Data integrity | architecture/source review | Require explicit existing-path validation and operator confirmation; never auto-initialize a production path |
| F-START-001 | Launcher may reuse an unrelated MechLex server on port 8765 based on a weak page/title probe | Operations | launcher review | Add instance identity, workspace/shared-path fingerprint and health metadata |
| F-BACK-001 | Bundled initial backups are unsigned although documentation claims checksum protection | Backup | `static-audit.json` | Regenerate signed backups or document them as untrusted samples |
| F-BACK-002 | Full JSON backup excludes external image files | Recovery | backup/source review | Produce a manifest plus image payload/archive and test full restore on a clean machine |
| F-DOC-001 | Source package lacks documented `package.json`, `tests/` and `MANIFEST_SHA256.txt` | Readiness | `static-audit.json` | Ship the reproducible QA harness and manifest or correct the documentation |
| F-UX-001 | Closing an edited form gives no unsaved-changes warning and status says all changes saved | UX | `ux-edge-cases.json`, screenshot | Add dirty-state tracking, close confirmation and accurate save status |
| F-A11Y-001 | Closed mobile sidebar controls receive focus before visible controls | Accessibility | `ux-edge-cases.json` | Remove hidden controls from tab order/inert subtree until the sidebar opens |

## Medium findings

| ID | Finding | Category | Evidence | Recommendation |
|---|---|---|---|---|
| F-BACK-003 | Backup status clears after download click without verifying file creation or restoreability | Backup UX | source/browser review | Keep a verifiable receipt with checksum and filename; add “test restore” |
| F-DOC-002 | Runtime, changelog and installation guide show different versions | Documentation | `static-audit.json` | Generate all version labels from one source |
| F-A11Y-002 | Admin tabs expose stale `aria-selected` values | Accessibility | `ux-edge-cases.json` | Update ARIA state and focus together on every tab change |
| F-SRCH-001 | Search for `A | B` returned all 8 terms; short/special queries have poor relevance | Search UX | `ux-edge-cases.json` | Normalize tokens deliberately and add ranked exact/prefix/contains behavior |
| F-MAINT-001 | Large monolithic app/style files and load-order monkey patches make regressions likely | Maintainability | architecture review | Introduce modules with explicit interfaces and unit coverage around persistence/admin |
| F-COMPAT-001 | Actual Edge 95 compatibility was not tested | Compatibility | environment inventory | Provide a controlled Edge 95 VM if still required, otherwise update the support baseline |

## Positive controls confirmed

- Atomic temp-file replacement exists.
- Bad checksum and malformed JSON were rejected by the API.
- Twenty two-writer stale-revision rounds produced one accepted write and one 409, never malformed JSON.
- Signed browser backup restored successfully in a second isolated context.
- Sanitization, modal focus trap, basic CRUD, Hebrew/English search and responsive no-overflow checks passed.

