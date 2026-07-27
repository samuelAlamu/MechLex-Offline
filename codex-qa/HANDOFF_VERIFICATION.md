# MechLex Gate H0 — Handoff Verification

**Gate:** H0 and H0-A only  
**Date:** 2026-07-26 (Asia/Jerusalem)  
**Goal 1:** **INACTIVE — not started**  
**Activation decision:** **READY TO ACTIVATE after user review**  
**Production code changed:** No  
**Real organizational shared data changed:** No

## 1. Immutable identity and worktree

- Branch: `qa/remediation-9-5-plus`
- HEAD: `5034fa3f76e4b6da97ca6f23ee055ef3de24e903`
- Parent: `2957b6856fba67bf1fb01642f86de4047b0b430b`
- Annotated tag: `mechlex-final-gemini-handoff`
- Tag object: `c04b16c1a3119d06531bd478063a8f7bddc8fd20`
- Tag peeled commit: `5034fa3f76e4b6da97ca6f23ee055ef3de24e903`
- HEAD equals tag commit: yes
- Frozen-tag archive SHA-256: `2e70276541322421431aa2fe3d00cbe537020b762ef530d4e75e04d10b3c9179`
- Remote: `https://github.com/samuelAlamu/MechLex-Offline.git`
- Remote relationship: the local branch is two commits ahead of its configured remote branch at `5d76f9d7d29a3fa8cf672eda712e573ea037bd7c`; the final tag is not advertised by the remote.
- Remote privacy: **NOT VERIFIABLE** from Git metadata in this environment.
- H0-authorized start: 0 tracked modifications and 48 untracked paths (47 pre-existing non-`codex-qa` paths plus the approved execution plan). The handoff claim of a clean worktree is false.
- Completion snapshot: 0 tracked changes, 0 staged paths, 1,132 untracked paths (47 outside `codex-qa`, 1,085 under `codex-qa`) and 752 ignored paths. The high untracked count is primarily the preserved H0-A copies, isolated browser profiles and QA evidence; it is not a production modification.
- Completion-state evidence: `codex-qa/evidence/preactivation/final-worktree-state.json` and `final-git-status.txt`.

Primary evidence:

- `codex-qa/evidence/preactivation/01_git_identity.json`
- `codex-qa/evidence/preactivation/01_git_status_authorized_h0_start.txt`
- `codex-qa/evidence/preactivation/01_remote_refs.txt`
- `codex-qa/evidence/baseline/h0a-summary.json`
- `codex-qa/evidence/baseline/frozen-tag-sha256.csv`

## 2. H0-A baseline preservation

**Verdict: PASS.**

- Frozen tag: 367 files, 74,124,268 bytes.
- Normal immutable runtime closure: 14 files.
- Optional recovery runtime: 1 file.
- Real configured shared path: `C:\Users\samue\Documents\Projects\Active\MechLex_Shared_Data_Simulation`.
- Real shared baseline: 44 files, 17,304,795 bytes.
- Read-only baseline copy matched all real-share hashes before testing.
- Six disposable workspaces were created and hash-verified: normal, destructive, recovery, concurrency-a, concurrency-b and media.
- Separate SHA-256 manifests were completed for 44 mutable shared-data files, 41 backup/recovery/history files, 28 image assets, 305 QA/test files and 45 documentation files.
- Every runtime target passed the real-share path guard before launch.
- Final verification found the same 44 paths, lengths, SHA-256 hashes and timestamps in the real shared directory; zero differences.

The guard expands environment variables, normalizes relative/local/UNC paths, resolves mapped-drive provider roots, resolves filesystem links/junctions through handles, compares volume serial plus file index, and blocks the same directory and descendants. Executed cases passed for the direct path, relative path, environment-expanded path, descendant, junction alias, UNC alias and a temporary mapped network drive alias. The temporary drive mapping was removed after the probe.

Evidence:

- `codex-qa/evidence/baseline/h0a-summary.json`
- `codex-qa/evidence/baseline/real-shared-readonly-sha256.csv`
- `codex-qa/evidence/baseline/shared-baseline-copy-sha256.csv`
- `codex-qa/evidence/baseline/workspace-verification.csv`
- `codex-qa/evidence/baseline/h0a-category-manifest-summary.json`
- `codex-qa/evidence/baseline/mutable-shared-data-sha256.csv`
- `codex-qa/evidence/baseline/backup-and-history-sha256.csv`
- `codex-qa/evidence/baseline/image-assets-sha256.csv`
- `codex-qa/evidence/baseline/qa-files-sha256.csv`
- `codex-qa/evidence/baseline/documentation-sha256.csv`
- `codex-qa/evidence/preactivation/real-shared-path-guard-test-summary.json`
- `codex-qa/evidence/preactivation/guard-path-alias-test-summary.json`
- `codex-qa/evidence/preactivation/real-shared-final-verification.json`

## 3. Final HC verdicts

| ID | Final verdict | Truth replacing the handoff claim | Evidence |
|---|---|---|---|
| HC-01 | **CONTRADICTED** | The worktree was not clean. At the authorized H0 start it had 48 untracked paths and no tracked modifications. The immutable tag is separate from the dirty worktree. | `01_git_identity.json`; `01_git_status_authorized_h0_start.txt`; `final-worktree-state.json` |
| HC-02 | **PARTIALLY VERIFIED** | The final commit changes only `app.js` (5 insertions, 2 deletions). Earlier helper/sync/recovery changes are in commits `2e2dff4`, `20835d4` and `d7cea8f`. Claimed `state.json` changes CHG-001/CHG-003 are not in Git history. | `02_commit_change_map.csv`; `02_commit_graph.txt`; `10_reconstructed_change_register.csv` |
| HC-03 | **CONTRADICTED** | The normal product closure is 14 immutable runtime/config files, one optional recovery script, external mutable shared-state files and dynamic content images—not five files and not all 632 inventory rows. | `03_runtime_dependency_closure.csv`; `baseline/runtime-closure-sha256.csv`; `baseline/operational-runtime-sha256.csv` |
| HC-04 | **CONTRADICTED** | The handoff ledger has 1 executed PASS row, not 108. The historical 107-case matrix contains 15 PASS, 16 FAIL, 7 INCONCLUSIVE and 69 NOT TESTED; none is inherited as Goal 1 proof. | `04_test_claim_reconciliation.csv`; `handoff/08_TEST_EXECUTION_LEDGER.csv`; `qa/QA_TEST_MATRIX.csv` |
| HC-05 | **CONTRADICTED** | The index covers only one visual issue and its before/after screenshots. Both screenshots exist locally but are untracked and absent from the frozen tag. No evidence map supports the other claimed results. | `05_handoff_evidence_audit.csv`; `15_tag_handoff_tree.txt` |
| HC-06 | **CONTRADICTED** | `START_MECHLEX.bat` launches Windows PowerShell. The helper is `powershell.exe` running `core/start-local-server.ps1`, serving through `System.Net.Sockets.TcpListener` bound to `127.0.0.1`; it is not Node `http-server`. | `06_launcher_helper_trace.csv`; `runtime-probes.json`; `h0-normal-helper.stdout.log` |
| HC-07 | **PARTIALLY VERIFIED** | Some safety primitives exist, but the handoff model is inaccurate. Actual APIs are `/api/shared-health`, `/api/can-write`, `/api/shared-state` plus static GET/HEAD. Path precedence is parameter → environment → text file → sibling default. Writes use a 5-second exclusive lock, re-read/revision check, PID/GUID temp, durable flush, `File.Replace`, previous state and 30 history files. Origin checking applies only to shared-state and Host is not validated. | `07_endpoint_map.csv`; `07_path_lock_atomic_model.json`; `runtime-probes.json` |
| HC-08 | **CONTRADICTED** | `MechLex_Config.json` does not exist in the searched worktree/tag/history. The live configuration sources are `-SharedDataPath`, `MECHLEX_SHARED_DATA_PATH`, `SHARED_DATA_PATH.txt`, then a sibling default. | `08_configuration_discovery.json` |
| HC-09 | **CONTRADICTED** | Validation is not client-only. The server rejects malformed/schema/semantic inputs and returned 422 for duplicate IDs. Its semantic validator is shallow: it validates only the top-level `shared.data` array, IDs, top-level parent references and image data URI format; it does not validate the nested dictionary deeply. | `09_validation_boundary_map.csv`; `runtime-probes.json` |
| HC-10 | **CONTRADICTED** | The three-row change register is incomplete. Git exposes more helper/sync/recovery changes; CHG-001 and CHG-003 lack Git support, and prior changes lack complete finding/test/change traceability. | `10_reconstructed_change_register.csv`; `02_commit_change_map.csv` |
| HC-11 | **CONTRADICTED** | In installed Edge 150, direct `file://` opened a functional dictionary (4 domains, 8 terms). LocalStorage was persistent and a modified dictionary value was loaded after reload with `meta.dataSource="local"`. This proves an alternate browser-storage authority. Localhost loaded the shared folder and IndexedDB. After helper loss, a save returned success and left changed in-memory data, but neither LocalStorage nor IndexedDB durably stored the marker; durable local-only fallback was therefore **not proven**, while fail-closed rollback was also false. Disallowed Origin was rejected, absent Origin was accepted, and a hostile Host header was accepted. | `11_browser_storage_static_map.csv`; `11_file-storage-runtime-probe.json`; `11_file-storage-after-reload.png`; `11_12_localhost_failed-helper_authority-probe.json`; `11_12_localhost-probe-shared-verification.json`; `runtime-probes.json` |
| HC-12 | **PARTIALLY VERIFIED** | The literal key `mechlex_pin` was not found. However, PIN-bearing `pin`, `contentPin` and `superPin` settings are stored in browser/shared-state serialization, default PIN material exists client-side, and modified client state opened Super Admin using the client-side PIN while the same browser's direct PUT was rejected 403 by the Viewer helper. This proves client PIN authority is separate from server authorization and is a mandatory release-gate finding. | `12_pin_secret_exposure_REDACTED.csv`; `11_file-storage-runtime-probe.json`; `11_12_localhost_failed-helper_authority-probe.json`; `13_role_permission_model.csv` |
| HC-13 | **CONTRADICTED** | Actual UI roles are Viewer/Content Expert/Super Admin and are selected by client state/PIN. Helper roles are Viewer/Editor/Admin from Windows groups or `MECHLEX_MOCK_ROLE`; they are not bound to the UI session. The current helper identity resolved to Viewer. A Viewer `GET /api/can-write` created a durable zero-byte `state.json` on an empty disposable share. Recovery authority is filesystem access plus an interactive prompt. | `13_role_permission_model.csv`; `runtime-probes.json` |
| HC-14 | **CONTRADICTED** | All 632 listed hashes matched their listed current files, but the labels are unsafe: all rows are runtime-required, 566 QA rows are misclassified, and test/generator/state/evidence paths receive unsafe Production/GitHub labels. The rebuilt inventory separates runtime, QA, docs and sensitive/mutable material. | `14_rebuilt_file_inventory.csv`; `14_inventory_label_errors.csv`; `03_runtime_dependency_closure.csv` |
| HC-15 | **CONTRADICTED** | Only 11 handoff files were supplied; numbered 01, 02, 07 and 12 are absent, legacy filenames referenced by AGENTS are absent, the tag has no tracked `handoff/` directory, and indexed screenshots are external/untracked. The archive alone is non-reproducible. | `15_handoff_completeness.csv`; `15_tag_handoff_tree.txt`; `05_handoff_evidence_audit.csv` |

All evidence paths in this table are relative to `codex-qa/evidence/preactivation/` unless prefixed with another directory.

## 4. Actual runtime dependency closure

Normal immutable closure:

1. `START_MECHLEX.bat`
2. `core/start-local-server.ps1`
3. `SHARED_DATA_PATH.txt`
4. `index.html`
5. `style.css`
6. `data/mechlex-data.js`
7. `images/catalog.js`
8. `images/mechlex-icon.svg`
9. `app.js`
10. `core/integrity.js`
11. `core/persistence.js`
12. `core/shared-sync.js`
13. `core/inline-editor.js`
14. `core/boot.js`

Conditional runtime:

- `core/recovery-wizard.ps1`
- configured shared `state.json`, `state.previous.json`, `.mechlex-state.lock`, `history/*.json`
- dynamically referenced JPEG, PNG and WebP content images

Host dependencies:

- Windows PowerShell 5.1 / .NET networking and filesystem APIs
- an installed browser; H0 runtime proof used Microsoft Edge `150.0.4078.83`
- filesystem access to the configured shared directory

Node.js and Playwright were used only as already-installed QA tooling for the isolated browser probe. They are not product runtime dependencies. No new dependency was installed.

## 5. Actual architecture and endpoint map

```text
START_MECHLEX.bat
  -> Windows PowerShell 5.1
     -> core/start-local-server.ps1
        -> TcpListener on 127.0.0.1
        -> static files from project root
        -> shared state from explicit configured folder
Browser
  -> GET/HEAD static application files
  -> GET/HEAD /api/shared-health
  -> GET /api/can-write
  -> GET/HEAD/PUT /api/shared-state
```

| Route | Methods | Observed/defined status codes | Authority/behavior |
|---|---|---|---|
| `/api/shared-health` | GET, HEAD | 200, 405 | Reports mode/state/writable flag; no Origin or Host enforcement. |
| `/api/can-write` | GET | 200, 405 | Probes `state.json` with `OpenOrCreate` before role evaluation; can therefore write as Viewer. |
| `/api/shared-state` | GET, HEAD, PUT | 200, 304, 400, 403, 404, 405, 409, 415, 422, 503 | Origin accepts absent Origin or exact current loopback origin. PUT uses schema/semantic/role/revision checks and atomic replacement. |
| Static path | GET, HEAD | 200, 403, 404, 405 | Project-root boundary and content-type map. |

Runtime H0 evidence confirmed loopback binding, 422 semantic rejection, 403 for a hostile Origin, 304 for a known revision and acceptance of `Host: evil.example`. The normal shared-copy manifest was unchanged after the probes.

## 6. Browser storage and `file://` behavior

- Direct `file://` is not blocked or redirect-only.
- The page renders a functional dictionary from embedded/local data.
- LocalStorage keys created/used: `mechlex_v6_data`, `mechlex_v6_prefs`, `mechlex_v6_settings`, `mechlex_v8_meta`.
- The stored settings contain PIN-bearing fields; evidence records key paths only, never values.
- A normal content `saveAll` call while shared sync was unavailable was rolled back/fail-closed in the tested path.
- Directly persisted browser dictionary data was nevertheless loaded as authoritative on reload (`meta.dataSource="local"`).
- IndexedDB was available in the browser but no database was created during the file-mode probe; source still contains IndexedDB persistence for localhost mode.
- In localhost mode, the clean probe loaded `meta.dataSource="shared-folder"` with 142 terms, created IndexedDB `mechlex_offline_v95`, and mapped the current helper identity to Viewer.
- After the helper was stopped, a content mutation remained in memory and `saveAll` returned `true`, while LocalStorage and IndexedDB retained the prior value. This did not prove a durable local-only fallback, but it also did not provide a reliable fail-closed rollback or truthful save result.

**Mandatory release-gate finding:** functional `file://` plus authoritative browser-storage loading is proven.

## 7. Actual supported role model

| Boundary | Roles | Actual authority |
|---|---|---|
| UI | Viewer, Content Expert, Super Admin | Client state and plaintext client-side PIN comparison. |
| Helper | Viewer, Editor, Admin | Windows process identity/groups, built-in Administrator, or `MECHLEX_MOCK_ROLE`; no binding to the UI PIN/session. |
| Filesystem | Process/user ACL capability | Ultimately controls whether the helper can read/write shared files. |
| Recovery wizard | Filesystem user | Filesystem access plus interactive confirmation; no MechLex UI role check. |

Mandatory release-gate findings carried forward:

1. Functional alternate `file://`/browser-storage dictionary authority.
2. Client-side PIN authority and PIN-bearing plaintext replication.
3. UI roles are not bound to helper/Windows authorization.
4. Viewer durable-write bypass: `GET /api/can-write` created zero-byte `state.json`.
5. `MECHLEX_MOCK_ROLE` is active production override code.
6. Host header is not validated.
7. Server validation is shallow for the nested dictionary.
8. UI write-capability probing is hard-coded to port 8765 while the helper may select another port.
9. Existing-helper reuse does not verify project, commit or shared path.

These findings block release approval; they do not block starting the audit whose purpose is to measure them.

## 8. Thirteen scoring categories

Gate H0 is a pre-activation truth and safety gate, not the Goal 1 scoring audit. No category score is awarded or inherited here. The wording “Goal 1 inactive” in the historical H0 table records its state at that checkpoint; Goal 1 was later authorized and completed. Current scores are in `GOAL1_CATEGORY_SCORES.md`.

The first label in each row is the exact category wording required by the user. The next column maps it to the more detailed master-specification wording.

| # | Required category | Master-specification equivalent | H0 scoring status |
|---:|---|---|---|
| 1 | Architecture | Architecture and deployment model | NOT SCORED — Goal 1 inactive |
| 2 | Offline Operation | Offline operation and portability | NOT SCORED — Goal 1 inactive |
| 3 | Reliability | Reliability and failure handling | NOT SCORED — Goal 1 inactive |
| 4 | Data Integrity | Data integrity and schema evolution | NOT SCORED — Goal 1 inactive |
| 5 | Synchronization and Multi-user Safety | Synchronization and multi-user concurrency | NOT SCORED — Goal 1 inactive |
| 6 | Backup and Recovery | Backup, recovery and rollback | NOT SCORED — Goal 1 inactive |
| 7 | Performance and Capacity | Performance, capacity and large media | NOT SCORED — Goal 1 inactive |
| 8 | Maintainability | Maintainability and regression infrastructure | NOT SCORED — Goal 1 inactive |
| 9 | UX | UX and workflow clarity | NOT SCORED — Goal 1 inactive |
| 10 | Accessibility | Accessibility | NOT SCORED — Goal 1 inactive |
| 11 | Security and Permissions | Security and permission enforcement | NOT SCORED — Goal 1 inactive |
| 12 | Operational Readiness | Operational readiness and supportability | NOT SCORED — Goal 1 inactive |
| 13 | Compatibility | Browser compatibility, including Edge 95 | NOT SCORED — Goal 1 inactive |

The historical 15 PASS values and any prior prose scores are not imported.

## 9. Missing environments and approvals

Not available and therefore not tested in H0:

- actual Edge 95 runtime in an isolated VM
- two real workstations/two VMs using SMB
- separate Windows test identities and controlled group/ACL matrix
- NVDA runtime
- independently authenticated GitHub visibility/privacy metadata

Not authorized, and not performed:

- writes/restores against the real organizational shared directory
- creating Windows users or changing ACLs/groups
- installing Edge 95 or any QA dependency
- changing Git history, tags or branches
- pushing to GitHub

## 10. Activation decision

All HC-01 through HC-15 now have a final verdict, replacement truth and durable evidence. H0-A passed, path-alias safety was demonstrated, the real shared directory is unchanged, and independent read-only reviewers challenged Git/handoff and architecture/role conclusions.

**Decision: READY TO ACTIVATE — but Goal 1 remains INACTIVE.**

Activation requires a new explicit user instruction after reviewing this checkpoint. No Goal 1 test has been started automatically.
