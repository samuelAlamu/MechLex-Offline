# MechLex Three-Goal QA — Execution Plan

**Plan version:** 1.0  
**Prepared:** 2026-07-26  
**Current state:** **PLAN ONLY — GOAL 1 IS NOT ACTIVE**  
**Production-code changes authorized:** **None**  
**Permitted output for this planning step:** `codex-qa/QA_EXECUTION_PLAN.md`

## 1. Outcome and control rule

This plan creates a strict pre-activation gate before Goal 1. Goal 1 may not start until every contradiction in section 1.1 of `CODEX_MECHLEX_THREE_GOAL_MASTER.md` has:

1. an individual claim ID;
2. a verdict of `VERIFIED`, `CONTRADICTED`, `PARTIALLY VERIFIED`, or `NOT VERIFIABLE`;
3. a reproducible read-only command or bounded runtime procedure;
4. a durable evidence path under `codex-qa/evidence/preactivation/`;
5. an explanation of what truth replaces the handoff claim;
6. an activation decision recorded in `codex-qa/HANDOFF_VERIFICATION.md`.

“Resolved” means the contradiction has an evidenced truth value. It does **not** mean that the product defect has been fixed or that the handoff claim has been made to pass.

If any contradiction still lacks decisive evidence, Goal 1 remains `INACTIVE` and the exact missing input or environment is recorded. `NOT VERIFIABLE` is an honest resolution only when the unavailable source/environment is precisely identified; it never becomes PASS.

## 2. Sources read for this plan

The following were read before writing the plan:

- `AGENTS.md`
- `CODEX_MECHLEX_THREE_GOAL_MASTER.md`
- `CODEX_THREE_GOALS.md`
- all 11 files in `handoff/`
- all 632 rows in `handoff/14_FILE_INVENTORY.csv`
- `README.md`
- `README_HE.txt`
- `CHANGELOG_HE.txt`
- `VERSION.txt`
- `START_MECHLEX.bat`
- `SHARED_DATA_PATH.txt`
- targeted source locations necessary to test the handoff’s architecture, endpoint, storage, PIN and locking claims

The handoff is treated as untrusted narrative. Git, files, code, executed commands and persisted artifacts control every verdict.

## 3. Instruction precedence and resolved instruction conflicts

1. The current user instruction and repository `AGENTS.md` govern this work.
2. `CODEX_MECHLEX_THREE_GOAL_MASTER.md` defines the product contract and the three-goal evidence rules.
3. `CODEX_THREE_GOALS.md` defines the sequential activation prompts.
4. Handoff documents are claims only.
5. Old QA reports and scores are investigation leads, not inherited results.

### Local Helper wording

The first half of `AGENTS.md` says not to add a local-server dependency, while the later product contract explicitly permits a per-workstation Local Helper bound to `127.0.0.1`. The operative interpretation is:

- the existing approved Local Helper is permitted;
- Goal 1 may audit it but may not add or replace runtime infrastructure;
- no new Internet, cloud, remote API, service, elevation requirement or additional machine-specific server dependency may be introduced;
- Goal 2 may alter the existing helper only after Goal 1 proves a defect and only in an isolated worktree.

### Missing legacy filenames

`AGENTS.md` refers to `CODEX_QA_GOAL.md` and `MechLex_Codex_Goal_Driven_QA_Master.md`, but those filenames are absent. The present controlling documents are `CODEX_MECHLEX_THREE_GOAL_MASTER.md` and `CODEX_THREE_GOALS.md`. Their absence is recorded as a handoff-completeness gap; no missing legacy document will be silently reconstructed or treated as read.

### `qa/` versus `codex-qa/`

The older half of `AGENTS.md` names `qa/`, while the current user instruction and three-goal master require `codex-qa/`. For this program:

- existing `qa/` is historical, untrusted input and remains read-only during planning and Goal 1;
- all new three-goal artifacts go under `codex-qa/`;
- `.logs/` is used only where the master explicitly requires it;
- this direct user instruction controls over the older generic path wording.

### Audit versus repair

The generic defect loop in the older half of `AGENTS.md` includes patching. Under the newer three-goal workflow, its patch steps apply only to Goal 2. Goal 1 stops after observation, reproduction, registration, failing test/reproduction and repair planning. Goal 3 is also audit-only.

### Separate completion gates

The older wording about one combined “Master Goal” does not collapse the three goals. Goal 1, Goal 2 and Goal 3 each have their own completion and user-review gate. The overall program is complete only after Goal 3.

## 4. Read-only preflight facts already observed

These are provisional facts from non-mutating inspection. Gate H0 will rerun and persist the exact outputs before Goal 1:

- Current branch: `qa/remediation-9-5-plus`.
- HEAD and final tag target: `5034fa3f76e4b6da97ca6f23ee055ef3de24e903`.
- Tag: `mechlex-final-gemini-handoff`.
- The final commit changes only `app.js`.
- The branch is two commits ahead of its configured remote branch.
- The worktree is not clean: 47 untracked paths were reported, including the master/handoff documents and 31 paths under `qa/`.
- Git currently reports 367 tracked files, including 305 paths under `qa/`.
- The handoff ledger has one executed-test row; its evidence index covers only QA-001 and its fix.
- The handoff inventory has 632 rows and marks all 632 as required at runtime, including 566 QA rows.
- The inventory labels 16 paths as Production, including QA/inventory helpers such as `generate_inventory.js`, `test_50mb.ps1` and `test_post.ps1`.
- The actual helper implementation is PowerShell using `System.Net.Sockets.TcpListener`, not Node.js `http-server`.
- Actual discovered API names are `/api/shared-health`, `/api/can-write` and `/api/shared-state`.
- The configured share comes from `SHARED_DATA_PATH.txt` or `MECHLEX_SHARED_DATA_PATH`; no `MechLex_Config.json` was found.
- The helper uses an exclusive lock file and `File.Replace`; it does not match the handoff’s Node single-thread serialization description.
- Server-side schema and semantic validation code exists.
- IndexedDB and localStorage code still exists, and `file://` has functional persistence branches; the blanket “blocked/no fallback” storage claims are contradicted at source level, while runtime consequences still require Goal 1 proof.
- The literal localStorage key `mechlex_pin` was not found, but default Content/Super PIN values and PIN-bearing settings are present in client code and persistence paths.

These observations do not activate Goal 1 and do not award PASS.

## 5. Gate H0 — resolve all 15 handoff contradictions

All commands in this gate are read-only or run only against an isolated disposable copy. Production code and the authoritative shared folder remain untouched. Section 6 is an H0 sub-gate and must complete before any HC row uses a runtime probe.

| ID | Master contradiction | Provisional resolution | Decisive pre-activation action | Required evidence | Goal 1 activation rule |
|---|---|---|---|---|---|
| HC-01 | “Clean working directory” vs untracked QA files | **CONTRADICTED:** current status lists 47 untracked paths | Capture porcelain status, tracked/untracked counts and ignored files at both worktree and detached tag | `preactivation/git-status.txt`, `git-file-counts.json` | Record the dirty worktree separately from the immutable tag; never call the worktree clean |
| HC-02 | Only `app.js` committed although many remediation changes are claimed | **PARTIAL:** final commit changes only `app.js`; earlier commits contain other changes | Build commit-by-commit name/status map from baseline tag/commit through final tag; associate each claimed change with the actual introducing commit or mark unsupported | `preactivation/commit-change-map.csv`, `commit-graph.txt` | Every claimed server/sync/recovery/data change has a commit or `UNSUPPORTED` verdict |
| HC-03 | Five production files vs many runtime files | **CONTRADICTED:** inventory says 16 Production and incorrectly marks all 632 rows runtime-required | Rebuild runtime dependency closure from launcher → helper → `index.html` → scripts/styles/data/images and dynamic reads; separate runtime, mutable data, docs, QA and generated copies | `preactivation/runtime-closure.csv`, `runtime-closure-method.md` | One exact runtime closure replaces all narrative counts |
| HC-04 | One ledger row vs 108 executed PASS claims | **CONTRADICTED:** ledger contains one row; 108 is unsupported by this ledger | Locate every original test ID/result source, deduplicate by ID, and require command/date/environment/evidence for execution; do not infer PASS from scripts or prose | `preactivation/test-claim-reconciliation.csv` | 108 claim is either evidenced row-by-row or formally rejected; no inherited PASS enters Goal 1 |
| HC-05 | Evidence index covers only one visual issue | **CONTRADICTED:** only QA-001 and QA-001-Fix are indexed | Hash-check every referenced evidence artifact and map it to a test ID and claim; missing links are recorded | `preactivation/handoff-evidence-audit.csv` | Handoff evidence scope is stated exactly; absent evidence remains absent |
| HC-06 | Node `http-server` vs PowerShell/HttpListener/TcpListener | **CONTRADICTED:** source uses PowerShell `TcpListener` | Trace `START_MECHLEX.bat`, process command line, bound address/port and serving implementation in a disposable launch | `preactivation/helper-technology.txt`, `helper-process.json` | Architecture truth names PowerShell/TcpListener unless runtime disproves the source trace |
| HC-07 | Endpoint, path, atomic-write and lock descriptions conflict | **CONTRADICTED/PARTIAL:** actual names/primitives differ | Enumerate every route/method/status/schema from source; trace path precedence; inspect lock acquisition, re-read, temp creation, flush and replacement; use no real shared data | `preactivation/endpoint-map.csv`, `shared-path-precedence.md`, `write-lock-trace.md` | Each disputed mechanism has one source-cited, runtime-confirmed description |
| HC-08 | `MechLex_Config.json` is mentioned but absent | **CONTRADICTED:** no such file found; source uses text/env configuration | Search tracked, untracked, ignored and historical trees; trace actual configuration code | `preactivation/config-source-audit.txt` | Missing file is explicitly rejected and real precedence is documented |
| HC-09 | Client-only semantic validation vs earlier server-side claims | **CONTRADICTED:** server validation functions and 422 path exist | Map client and server validators separately; run one valid and bounded invalid request only in a disposable shared copy | `preactivation/semantic-validation-map.md`, `semantic-probe.json` | State exactly which rules run at each boundary; no blanket “client-only” claim |
| HC-10 | Three-entry change register plus unsupported catch-all note | **CONTRADICTED:** traceability is incomplete | Reconstruct change register from Git commits/diffs and claimed findings; distinguish code, data, QA, docs and generated dependencies | `preactivation/reconstructed-change-register.csv` | Every material claimed remediation maps to commit/files/tests, or is labelled unsupported |
| HC-11 | file:// blocked, no IndexedDB fallback, Origin enforced—without proof | **CONTRADICTED/PARTIAL:** source implements IndexedDB, localStorage fallback and functional `file://` persistence branches; Origin checking exists for the shared-state route | Static map plus clean-profile browser probes for direct `file://`, localhost, storage keys, failed helper and disallowed Origin; disposable data only | `preactivation/browser-storage-map.json`, `file-mode-probe.json`, `origin-probe.json` | Source-level storage claims are rejected; runtime effects receive separate verdicts and Goal 1 IDs |
| HC-12 | `mechlex_pin` in localStorage and authorization based on it | **Literal key contradicted; exposure risk unresolved:** defaults and PIN settings exist elsewhere | Enumerate PIN/default/credential flows and storage serialization without printing secret values; test whether modified client state can create durable authority in a disposable copy | `preactivation/pin-storage-audit-sanitized.md`, `authority-boundary-probe.json` | Report key names, storage class and authority boundary without copying secrets; UI PIN never counts as server authorization |
| HC-13 | Runbook omits Content Expert and lets Viewer become Administrator via PIN | **CONTRADICTED:** two UI roles exist, but server boundary does not express them | Compare runbook, UI roles, direct API behavior and filesystem authority; create exact Viewer/Expert/Admin capability matrix | `preactivation/role-contract-diff.csv` | Runbook claim is replaced with an evidence-based role model and any missing enforcement is carried into Goal 1 |
| HC-14 | Inventory labels hundreds of QA files runtime-required and has unsafe Production/GitHub labels | **CONTRADICTED:** all 632 rows are marked runtime; 566 are QA | Rebuild inventory from filesystem, exclude recursive QA copies from production closure, scan state/backups/images/PINs before any Safe-for-GitHub label | `preactivation/rebuilt-file-inventory.csv`, `inventory-label-errors.csv`, `sensitive-path-scan.txt` | No runtime or GitHub-safety decision uses the handoff labels |
| HC-15 | Requested handoff documents/code/evidence are missing | **CONTRADICTED/PARTIAL:** only 11 handoff files exist; numbered documents 01, 02, 07 and 12 are absent; `00` leaves commit verification to the reader; the tag contains no tracked `handoff/` directory | Compare actual handoff tree with the master’s required checklist and every referenced path; distinguish repository-root code from archive-contained material | `preactivation/handoff-completeness.csv`, `missing-references.txt` | Every missing item is listed with impact; the archive is classified non-reproducible unless independent repository evidence fills a specific gap |

### H0 exit checklist

Goal 1 may become active only when all are true:

- [x] HC-01 through HC-15 each have a final verdict and evidence path.
- [x] `codex-qa/HANDOFF_VERIFICATION.md` is complete.
- [x] Git HEAD, tag, branch, parent, remote relationship and worktree dirt are separated correctly.
- [x] A single runtime dependency closure replaces handoff file counts.
- [x] A single endpoint/path/locking/source-of-truth map replaces architecture prose.
- [x] No prior test is imported as PASS without case-level evidence.
- [x] Potential secrets are recorded only in sanitized form.
- [x] The authoritative shared-data path has not been written.
- [x] The user receives a short Hebrew checkpoint explaining any action that would touch real data, Windows permissions, Git remotes or Edge 95.

If the checklist is incomplete, update `GOAL_STATUS.md` to `PRE-ACTIVATION BLOCKED`; do not start Goal 1.

## 6. H0-A — baseline preservation before any bounded runtime probe

After the initial read-only Git identity check, but before HC-06, HC-09, HC-11, HC-12 or any other bounded runtime probe:

1. Capture `git status --porcelain=v1 --untracked-files=all`.
2. Verify HEAD, claimed commit, tag target and parent.
3. Create a detached, read-only audit copy of the frozen tag.
4. Create a recursive SHA-256 manifest for production/runtime files.
5. Create separate manifests for mutable shared data, backups, images, QA files and documentation.
6. Record file count, directory count, byte count, timestamps and filesystem path.
7. Create disposable copies for normal, destructive, recovery, concurrency and media tests.
8. Hash-compare every copy to the frozen source before testing.
9. Point every helper used by QA to an explicit disposable shared path.
10. Add a guard that aborts if a test resolves to the real configured share.
11. Record completion as `H0-A PASS`; otherwise stop H0 as blocked.

No destructive or runtime probe may run until the guard and copy verification pass. This baseline step is part of H0 and does not activate Goal 1.

## 7. Goal 1 execution phases

Goal 1 is audit-only. Production code, production data, the frozen tag and `main` remain unchanged.

### G1-A — Identity, inventory and architecture truth

- Produce `BASELINE_IDENTITY.md`, runtime closure and mutable-data inventory.
- Map launcher, helper technology, binding, process identity and shutdown.
- Map every endpoint/method/schema/status.
- Map source-of-truth load/save/recovery flows.
- Map lock scope, stale revisions, replacement/flush and failure behavior.
- Map browser storage, cache, service worker, cookies, embedded fallback and `file://`.

### G1-B — Test catalogue truth

- Locate the original 107-case specification.
- Preserve original IDs and titles: OFF, SYNC, CNT, SRCH, IMG, AUTH, REC, CACHE, PERF and UX.
- Add legitimate RV/post-remediation cases without renaming the original cases.
- Reconcile duplicates and narrative-only claims.
- For every row record applicability, execution, exact environment, date, steps/command, result, evidence and finding.

### G1-C — Startup, offline and portability

- Internet-blocked cold start and clean browser profile.
- Launcher, localhost, long/Hebrew/spaced paths, missing/read-only share, port collision, duplicate helper and stale process.
- Direct `file://` must not create a second functional dictionary.
- Record active network requests and external references.

### G1-D — Data integrity, persistence and recovery

- UI CRUD/move/delete; durable-file inspection; helper/browser close and second-process reopen.
- Schema, semantic corruption, duplicates, dangling references and unsupported versions.
- Locked/read-only/zero-byte/temp/replace/interruption cases on disposable data.
- Backup/restore into clean data and an authoritative test share.
- Prove success only after durable write and second-session read.

### G1-E — Synchronization and concurrency

Keep evidence tiers separate:

1. same-helper parallel requests;
2. same-host two-helper/two-account UNC;
3. real two-workstation or two-VM SMB.

Run different-record, same-record, stale revision, delete/edit, move/edit, image/image, rapid-save, disconnect-before/during-save and convergence cases. Same-host results never substitute for SMB proof.

### G1-F — Roles and security

- Viewer, Content Expert and Administrator through UI, direct API, modified client state and filesystem permissions.
- Mutating endpoint authorization at write time.
- Permission revocation during a session.
- Origin, Host, CORS, LAN exposure, path traversal, malformed and oversized bodies.
- XSS-safe rendering and sanitized PIN/secret storage review.

### G1-G — Images, performance and hierarchy

- Valid decodable JPEG, PNG and WebP fixtures at 1, 3, 5, 8, 10, 15,000,000 and 15,728,640 bytes.
- Mandatory path: UI select → preview → save → durable file → close → restart → reopen → decode/render → second isolated session.
- Measure p50/p95, Base64/full payload, memory and failures.
- Deep mixed hierarchy with root/intermediate terms and subdomains, four or more levels, search and complete CRUD/move/delete/reopen.

### G1-H — UX, accessibility and browser compatibility

- Keyboard-only navigation, focus order, visible focus, modal focus, names/labels, live status/errors and contrast.
- Hebrew, English, Amharic, mixed RTL/LTR, formulas, symbols and units.
- 100%, 125%, 150%, 175% and 200% zoom.
- NVDA when available.
- Modern browser runtime evidence and a separate actual Edge 95 VM requirement.
- If Edge 95 is unavailable, mark it NOT TESTED and block 9.5+ compatibility/full GO.

### G1-I — Scoring, findings and decision

- Exact total/applicable/executed/PASS/FAIL/BLOCKED/NOT TESTED/INCONCLUSIVE/N/A counts.
- Evidence coverage and execution coverage calculated separately.
- Score all 13 master categories independently.
- Product-quality and release-readiness scores remain separate.
- No averaging away Blocker/Critical/Major findings.
- Issue exactly one: GO, GO WITH CONDITIONS or NO GO.
- Produce P0/P1/P2 repair plan; do not repair in Goal 1.

## 8. Independent workstreams

Specialized reviewers receive bounded read-only scopes and separate evidence directories:

| Workstream | Scope | Evidence owner |
|---|---|---|
| Architecture/deployment | Runtime closure, helper, endpoints, source of truth | `codex-qa/evidence/architecture/` |
| Persistence/concurrency | Locks, revisions, atomicity, SMB tiers | `codex-qa/evidence/concurrency/` |
| Security/roles | API authority, Windows SID/ACL, PIN/storage, Origin/path | `codex-qa/evidence/permissions/` |
| UX/accessibility | Keyboard, zoom, RTL/LTR, status, NVDA | `codex-qa/evidence/accessibility/` |
| Compatibility/performance | Edge 95 and media/capacity measurements | `codex-qa/evidence/compatibility/`, `performance/` |
| Recovery | Clean restore, rollback, second-session proof | `codex-qa/evidence/recovery/` |
| Independent review | Challenge findings, scores and evidence links | `codex-qa/evidence/review/` |

Parallel reviewers may not modify production files or the same QA artifact simultaneously.

## 9. Evidence standard

A PASS requires:

- test ID and title;
- frozen version/commit/tag;
- date and environment;
- exact command or manual steps;
- input fixture;
- observable result;
- authoritative persisted-file inspection where relevant;
- evidence path;
- second-process/session/workstation proof where required.

The following are never sufficient alone:

- UI success text;
- source-code presence;
- a generated but unexecuted test;
- API simulation for a full browser flow;
- same-host concurrency for cross-machine SMB;
- modern Chromium for Edge 95;
- a PIN or hidden control for authorization.

## 10. Required Goal 1 outputs

Under `codex-qa/`:

- `GOAL_STATUS.md`
- `BASELINE_IDENTITY.md`
- `HANDOFF_VERIFICATION.md`
- `QA_TEST_MATRIX.csv`
- `QA_FINDINGS.md`
- `QA_RELEASE_GATES.md`
- the architecture maps required by the master
- command, browser, concurrency, permission, recovery, performance, accessibility and compatibility evidence
- `reports/GOAL1_AUDIT_REPORT_HE.md`
- `reports/GOAL1_AUDIT_REPORT_EN.md`
- `reports/GOAL1_CATEGORY_SCORES.md`
- `reports/GOAL1_REPAIR_PLAN.md`
- `reports/EVIDENCE_INDEX.md`
- `reports/RESIDUAL_RISKS.md`

The existing `qa/` directory is historical input. New authoritative work for this program goes under `codex-qa/`.

## 11. Safety and approval checkpoints

This plan does not authorize any of the following actions.

| Action | Practical consequence | Required decision |
|---|---|---|
| Restore/migrate the real shared state | Can overwrite organizational dictionary data | Explain in Hebrew and obtain explicit user approval |
| Change Windows users, groups or ACLs | Can change who can read/write files on the computer/share | Explain exact accounts/paths and obtain explicit approval |
| Install or launch Edge 95 outside an isolated VM | Old software may create security/compatibility risk | Use an isolated VM; obtain explicit approval before installation |
| Push to GitHub | Sends files off the computer and may expose data/history | Secret/data scan plus explicit approval |
| Merge to `main` or move tags | Changes the official code/history | Explicit approval; never automatic |
| Delete QA artifacts or backups | Can remove recovery evidence | Explicit approval and recoverability statement |

Safe read-only inspection, hashing and disposable-copy testing do not alter the original data. Before the first runtime/destructive Goal 1 test, the user receives a concise Hebrew explanation of the target path and why the real share is protected.

## 12. Stop conditions

Stop and report a precise blocker when:

- the tag/commit identity cannot be made unambiguous;
- a disposable path resolves to the real shared folder;
- a requested test requires a real environment that is absent;
- a test would require changing production data, ACLs, users, Git remote/history or installing Edge 95 without approval;
- evidence is inconsistent and no materially distinct read-only verification remains;
- a subagent or script attempts to write outside `codex-qa/`, `.logs/` or an approved disposable workspace.

Do not weaken requirements, reduce image sizes, extend timeouts merely to pass, or relabel unavailable proof.

## 13. Activation decision

**Execution result after Gate H0: READY TO ACTIVATE after user review; Goal 1 remains INACTIVE.**

Gate H0 and H0-A are complete. Goal 1 may activate only after a new explicit user instruction. It must not begin automatically.
