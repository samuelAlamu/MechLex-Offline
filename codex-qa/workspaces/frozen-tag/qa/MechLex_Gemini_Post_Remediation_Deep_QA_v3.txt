# MECHLEX GEMINI POST-REMEDIATION CONVERGENCE QA & INDEPENDENT RE-AUDIT

Version 3.0 — Evidence-based reconciliation of Gemini and Codex results

## הנחיות לבעל הפרויקט

מסמך זה מיועד להרצה מחודשת באמצעות Gemini Antigravity, לאחר שבוצעו שלושה שלבים: מבדק ראשון של Gemini שקיבל ציון גבוה; מבדק מחמיר של Codex שהסתיים בציון 3.1 ובהמלצת NO GO; ותיקונים שביצע Gemini על בסיס ממצאי Codex.

המטרה אינה לגרום ל-Gemini לתת ציון גבוה. המטרה היא לגרום לשני מבקרים עצמאיים להגיע לתוצאה דומה כאשר הם בודקים את אותה גרסה, באותה סביבת פריסה ועל פי אותם כללי ראיות. לכן המסמך מחייב להתייחס לכל הדוחות הקודמים כאל טענות שטרם אומתו; לבדוק מחדש את חמשת התיקונים הנטענים; להריץ את 107 מקרי הבדיקה הקיימים; ולדווח בנפרד על איכות המוצר, על כיסוי הבדיקה ועל רמת הביטחון במסקנה.

יש להריץ את בדיקת האיכות על עותק ייעודי של הגרסה המתוקנת. במהלך שלב הביקורת אסור לשנות את קוד הייצור. תיקון נוסף, אם יידרש, יבוצע רק בשלב נפרד ולאחר אישור מפורש.

## 1. Audit Role and Master Goal

Act as an independent QA Director, software architect, data-integrity and concurrency engineer, security reviewer, failure-analysis specialist, UX/accessibility reviewer and long-term operational auditor. Do not optimize for a high score or for confirming prior work.

**Master Audit Goal**

Independently determine whether the current post-remediation MechLex build is safe and operationally ready for organizational deployment, and make the result reproducible by another auditor. Reconcile every material contradiction between the prior Gemini audit, the Codex audit and the Gemini remediation walkthrough through executed evidence rather than narrative confidence. Verify the current code and persisted state, execute all mandatory targeted revalidation tests and all applicable cases from the existing 107-case baseline, and continue through materially distinct verification attempts until each mandatory release gate is PASS or is honestly classified FAIL, BLOCKED or NOT TESTED. Do not modify production behavior during this audit pass. The audit is complete only when the evidence package, claim-to-evidence matrix, executed test matrix, scores, coverage, residual risks and GO / GO WITH CONDITIONS / NO GO decision are complete.

## 2. Corrected Deployment Contract

- **External connectivity:** No Internet, cloud, remote API, CDN, analytics, telemetry or external licence dependency is permitted for core operation.

- **Local helper:** A per-workstation loopback helper/server is permitted because the current implementation reportedly uses start-local-server.ps1. It must be packaged locally, start automatically through the supported launcher, require no Internet, bind only to loopback, require no permanent Windows service, and stop cleanly. If the product owner insists on a serverless browser-only design, record the current architecture as a requirement mismatch instead of silently redefining it.

- **Source of truth:** The authoritative state is the shared project folder and its persisted state files. Browser storage may be a cache or draft surface only; it may never become an alternate authoritative branch.

- **Write security:** Windows/SMB/NTFS permissions are the primary durable write boundary. Every mutating backend request must still fail safely when the process identity lacks write access. A UI gate or /api/can-write response alone is not authorization proof.

- **Roles:** Viewer must be read-only. Content Expert may edit dictionary content within its documented scope. Administrator may perform administrative actions. If NTFS permissions cannot distinguish Content Expert from Administrator, report that distinction as a workflow control rather than a security boundary unless a trusted server-side control proves otherwise.

- **Images:** The accepted product requirement is successful end-to-end handling of engineering images through at least 15 MB. A 300 KB client limit is incompatible with this requirement and must be reported as a failure unless the product requirement has been formally changed.

- **Compatibility:** Microsoft Edge 95 remains a required compatibility target unless the product owner formally changes it. Static inspection or modern Chromium automation is not actual Edge 95 evidence.

- **Audit baseline:** The current post-remediation build must be frozen and hashed before testing. Performance, corruption and recovery tests must use disposable copies.



## 3. Why the Previous Scores Diverged

The following contradictions must be resolved through current evidence:

- **Initial data state.** Gemini described a healthy deployment; Codex found the active state replaced by an old performance-test payload and identified revision 13 as the last known-good state. **Required resolution:** Prove the current active state provenance, content counts, schema, revision chain, and absence of synthetic test contamination.

- **Image support.** The first Gemini report treated a hard 300 KB image limit as PASS, while the governing QA required 1-15 MB and Codex reproduced a 15 MB client timeout. **Required resolution:** Run real UI-to-persistence tests at 1, 3, 5, 8, 10 and 15 MB. A server-only acceptance test is insufficient.

- **Offline architecture.** The earlier QA text required no local server, while the Gemini report approved reliance on start-local-server.ps1. **Required resolution:** Use the corrected deployment contract above and verify the loopback helper as a supported offline component instead of scoring against contradictory assumptions.

- **Authorization.** The first report correctly noted UI-only PIN weakness. The remediation claims /api/can-write now prevents bypass. **Required resolution:** Prove that every mutating endpoint re-checks real write authority and that separate Windows users receive different outcomes. A UI check is not enough.

- **Disconnected save.** Codex found local-only fallback and split-brain risk. The remediation claims sharedAwareSaveAll now fails closed. **Required resolution:** Prove no authoritative or local shadow state changes after failure, unsaved work remains recoverable, and reconnect/retry converges safely.

- **Restore.** Codex reported browser restore did not guarantee repair of the shared source. **Required resolution:** Restore into a clean project and prove the shared authoritative state, second session and image associations match the backup.

- **Scores and coverage.** Gemini issued a reassuring result without an explicit executed-case count; Codex reported 15 PASS, 16 FAIL, 7 inconclusive and 69 not tested. **Required resolution:** Report quality, evidence coverage and release readiness separately. Never convert NOT TESTED into PASS or quietly average it away.

- **Cleanup.** The first report deleted tests, experimental scripts, screenshots and node_modules from the source after the audit. **Required resolution:** Preserve a reproducible QA package and evidence outside the production release. Production packaging may exclude test dependencies, but audit evidence must not be destroyed.



## 4. Prior Remediation Claims to Verify

Do not assume these fixes work merely because code was changed:

- **FIX-01:** Recovered active state from state.previous.json revision 13; added schemaVersion === 2 check on POST /api/shared-state.

- **FIX-02:** Added /api/can-write and blocked Admin entry when the local OS process cannot write to the shared folder.

- **FIX-03:** Increased background synchronization timeout from 5 seconds to 30 seconds for large payloads.

- **FIX-04:** Removed silent IndexedDB fallback from sharedAwareSaveAll and changed disconnected saves to fail closed.

- **FIX-05:** Added beforeunload protection while an editor is open.



## 5. Evidence Precedence and Audit Separation

- Executed runtime evidence against the frozen current build outranks code inspection.

- Persisted-file hashes and canonical comparisons outrank UI success messages.

- A second isolated process/workstation result outranks same-tab state.

- Current code inspection outranks documentation and prior AI summaries.

- Prior Gemini/Codex reports are investigation leads, not inherited PASS/FAIL results.

- Pass A is audit-only. Do not alter production behavior. Suggested patches belong in a separate optional Pass B after explicit approval.

- A test not executed is NOT TESTED. A generated test not run is NOT TESTED. A mock that bypasses the real shared persistence path is insufficient.



## 6. Required Inputs and Baseline

- Current post-remediation project folder, including hidden files, launchers, source, current state, previous state, images, backups and documentation.

- Previous Gemini audit report and evidence, not only its summary.

- Complete Codex outputs: final report, findings, release gates, 107-case matrix, roadmap and evidence index.

- Gemini remediation walkthrough and the exact modified files/diff if available.

- At least two isolated Windows users or workstations with different SMB/NTFS permissions; six sessions preferred.

- Edge 95, current Edge, Internet-blocked environment, UNC/mapped path where relevant, and 1/3/5/8/10/15 MB image fixtures.



## 7. Execution Phases

- **Phase 0:** Preserve and hash the current post-remediation baseline; inventory all supplied reports and environments.

- **Phase 1:** Build architecture truth and the claim-to-evidence matrix before scoring.

- **Phase 2:** Verify FIX-01 through FIX-05 using targeted RV cases; do not accept implementation descriptions as proof.

- **Phase 3:** Execute all applicable original 107 cases and preserve every ID/status.

- **Phase 4:** Run multi-user, ACL, failure-injection, recovery, 15 MB image, performance and compatibility gates.

- **Phase 5:** Run the critical regression suite and independent evidence review.

- **Phase 6:** Score quality, coverage and release readiness separately; issue final decision.



## 8. Mandatory Post-Remediation Revalidation Tests

Execute these cases first. They are additional to, not replacements for, the original 107-case matrix.

### ARCH-RV-001 — Freeze and hash the post-remediation baseline

**Procedure:** Create a clean audit copy; hash every file; record file/folder counts, version, current state revision, launcher, browser and OS. Do not modify production code during Pass A.

**Required evidence:** SHA-256 manifest, Git/file status, environment record.

**PASS criterion:** A reproducible immutable baseline exists and all later evidence points to it.

**Default failure severity:** BLOCKER

### ARCH-RV-002 — Trace the real startup and write architecture

**Procedure:** Trace START_MECHLEX/start-local-server.ps1, listening address, port selection, process lifetime, state load/save paths and browser entry point. Compare runtime to README claims.

**Required evidence:** Process/port capture, code references, architecture diagram.

**PASS criterion:** The actual architecture is documented without contradictory serverless claims.

**Default failure severity:** CRITICAL

### ARCH-RV-003 — Loopback-only binding

**Procedure:** Start the helper and inspect listening interfaces. Attempt access from localhost and from another workstation on the LAN.

**Required evidence:** netstat/Get-NetTCPConnection output and connection results.

**PASS criterion:** Service accepts supported local access and is not exposed on 0.0.0.0/LAN unless formally designed and secured.

**Default failure severity:** CRITICAL

### ARCH-RV-004 — Clean workstation portability

**Procedure:** Launch from a second workstation/account with no prior browser state and no developer tools or package installation beyond documented prerequisites.

**Required evidence:** Screen recording, logs, exact prerequisites.

**PASS criterion:** The supported launcher starts the complete offline application consistently.

**Default failure severity:** BLOCKER

### ARCH-RV-005 — External dependency and traffic scan

**Procedure:** Block Internet, scan source for remote URLs, and capture runtime requests during launch, search, edit and image operations.

**Required evidence:** Source scan plus network trace.

**PASS criterion:** Zero active external dependency for core workflows.

**Default failure severity:** CRITICAL

### STATE-RV-001 — Verify recovered active state is the intended revision

**Procedure:** Inspect active state, previous state and any backup metadata. Compare hashes, revision numbers, domain/subdomain/term counts and known production records. Confirm the active state is not synthetic performance data.

**Required evidence:** Canonical JSON summary, hashes, sampled UI records.

**PASS criterion:** The active data is a known valid organizational state with documented provenance.

**Default failure severity:** BLOCKER

### STATE-RV-002 — Revision continuity after recovery

**Procedure:** Perform a disposable valid edit using expectedRevision, save, close and reopen. Verify revision increments monotonically and state.previous holds the immediately prior complete revision.

**Required evidence:** Before/after state files and revision timeline.

**PASS criterion:** No revision reset, rollback ambiguity or lost prior state.

**Default failure severity:** CRITICAL

### STATE-RV-003 — Schema v2 validation on every ingress path

**Procedure:** Attempt malformed, legacy and unsupported schema uploads through API, UI import, restore and any alternate save path. Include schemaVersion missing, string, 1, 3 and structurally invalid v2.

**Required evidence:** HTTP/UI responses and unchanged file hashes.

**PASS criterion:** Every ingress path rejects invalid state before replacing active or previous state.

**Default failure severity:** CRITICAL

### STATE-RV-004 — Semantic integrity beyond schemaVersion

**Procedure:** Use valid JSON schemaVersion 2 with duplicate IDs, missing parents, wrong field types and dangling image references.

**Required evidence:** Validation report and persisted-file hashes.

**PASS criterion:** Unsafe semantically inconsistent state is rejected or quarantined with precise diagnostics.

**Default failure severity:** CRITICAL

### STATE-RV-005 — Atomic write under interruption

**Procedure:** On a disposable copy, terminate the helper at repeated points during save, including a large state save. Repeat at least 20 times.

**Required evidence:** Old/new/temp file hashes, logs, reproduction counts.

**PASS criterion:** After every interruption, active state is either the old complete revision or new complete revision; never partial/zero-byte.

**Default failure severity:** BLOCKER

### STATE-RV-006 — Previous-state rotation safety

**Procedure:** Start from valid active/previous files, submit an invalid save, then a valid save, then interrupt a save. Observe when previous is rotated.

**Required evidence:** Timeline and hashes of active, previous and temp files.

**PASS criterion:** A failed/invalid write cannot overwrite the last known-good previous state.

**Default failure severity:** CRITICAL

### STATE-RV-007 — Corrupt active startup and recovery

**Procedure:** Test malformed JSON, zero-byte active state and unsupported schema on disposable copies. Launch as Viewer and writer.

**Required evidence:** Error screens, logs, preserved corrupt evidence, recovery result.

**PASS criterion:** The app never treats corruption as an empty valid dictionary and never overwrites evidence automatically.

**Default failure severity:** BLOCKER

### STATE-RV-008 — Restore repairs the shared source

**Procedure:** Restore a verified backup into a clean project using the documented UI/administrator process. Open from a second isolated session and compare canonical state and images.

**Required evidence:** Shared-file hashes, second-session recording, canonical diff.

**PASS criterion:** Restore changes the intended shared authoritative state, not only browser storage.

**Default failure severity:** BLOCKER

### STATE-RV-009 — Backup integrity and tamper detection

**Procedure:** Create a backup, inspect manifest/schema/revision, alter one file, and attempt validation/restore.

**Required evidence:** Backup tree, hash manifest and rejection evidence.

**PASS criterion:** Complete backup restores cleanly; modified backup is rejected before overwrite.

**Default failure severity:** CRITICAL

### STATE-RV-010 — Performance-test isolation

**Procedure:** Run the available performance fixture against a disposable state, then verify the production-like baseline remains byte-identical and no test payload is left active.

**Required evidence:** Pre/post baseline hashes and fixture paths.

**PASS criterion:** Performance tests cannot contaminate the active source of truth.

**Default failure severity:** CRITICAL

### AUTH-RV-001 — Viewer direct API write attempt

**Procedure:** Under a read-only Windows account, bypass the UI and call every mutating endpoint directly with valid payloads and expected revisions.

**Required evidence:** Request/response transcript and unchanged shared-file hashes.

**PASS criterion:** All durable write attempts fail, preferably 403/permission-specific, without side effects.

**Default failure severity:** BLOCKER

### AUTH-RV-002 — Mutating endpoints authorize per request

**Procedure:** Pass the /api/can-write UI gate under a writable account, then revoke folder write permission before invoking each mutation. Also invoke endpoints without first calling /api/can-write.

**Required evidence:** ACL timeline, endpoint responses and hashes.

**PASS criterion:** Every mutation independently verifies current write capability; can-write is advisory, not the only gate.

**Default failure severity:** CRITICAL

### AUTH-RV-003 — can-write reflects the current OS identity

**Procedure:** Run the complete launcher under two separate Windows users: one read-only and one read/write. Compare /api/can-write and actual mutation results.

**Required evidence:** Account names/ACLs, endpoint results, persisted change proof.

**PASS criterion:** Results match the helper process identity and real NTFS/SMB rights.

**Default failure severity:** CRITICAL

### AUTH-RV-004 — PIN and DevTools bypass

**Procedure:** Modify localStorage/sessionStorage/config, call exposed functions, unhide controls and attempt Super Admin entry and save.

**Required evidence:** Console recording and source hashes.

**PASS criterion:** Local UI manipulation cannot create durable authority beyond the OS/server boundary.

**Default failure severity:** CRITICAL

### AUTH-RV-005 — Content Expert versus Administrator boundary

**Procedure:** Attempt content edits and every admin-only function as Content Expert, including hierarchy deletion, restore, role/config changes and destructive operations.

**Required evidence:** Role matrix and persisted-file comparison.

**PASS criterion:** The boundary is enforced by a trusted layer, or explicitly documented as workflow-only and scored accordingly.

**Default failure severity:** CRITICAL

### AUTH-RV-006 — Cross-origin localhost write protection

**Procedure:** From a separate local HTML origin and, when safe, a remote web origin, attempt fetch/form requests to the loopback helper. Inspect CORS and Origin handling.

**Required evidence:** Browser/network transcript and server headers.

**PASS criterion:** Untrusted origins cannot mutate MechLex through the user's loopback helper.

**Default failure severity:** CRITICAL

### AUTH-RV-007 — Path traversal and arbitrary file access

**Procedure:** Fuzz path-like inputs, filenames, restore names and API parameters with ../, encoded traversal, absolute paths and reserved Windows names.

**Required evidence:** Requests, server logs and folder diff.

**PASS criterion:** No read/write/delete escapes the intended project directories.

**Default failure severity:** CRITICAL

### AUTH-RV-008 — Read-only partial permission matrix

**Procedure:** Test read-only state file, read-only image area, read-only backup folder and locked state file separately.

**Required evidence:** ACL screenshots, UI messages, file diffs.

**PASS criterion:** No false success or partially persisted term/image state.

**Default failure severity:** CRITICAL

### AUTH-RV-009 — Server exposure, port collision and stale process

**Procedure:** Start two instances, occupy the default port, kill browser without helper, and restart after stale process/lock conditions.

**Required evidence:** Process list, port logs and startup UI.

**PASS criterion:** The launcher handles collisions and cleanup predictably without opening a broad network listener.

**Default failure severity:** CRITICAL

### AUTH-RV-010 — Stored content safety

**Procedure:** Save harmless script-like HTML, event attributes, data URLs and mixed RTL content, then open in Viewer.

**Required evidence:** DOM inspection and video.

**PASS criterion:** Content remains inert text/media; no active code execution.

**Default failure severity:** CRITICAL

### SYNC-RV-001 — Disconnected save fails closed without shadow commit

**Procedure:** Disconnect the shared folder immediately before save. Inspect in-memory state, IndexedDB, localStorage, state files and UI after the failure.

**Required evidence:** Storage dumps, hashes and UI recording.

**PASS criterion:** No alternate authoritative commit occurs and no success is shown.

**Default failure severity:** BLOCKER

### SYNC-RV-002 — Unsaved work survives a failed save

**Procedure:** After a forced save failure, keep the editor open, reconnect and verify the user can retry or copy the unsaved content without re-entering it.

**Required evidence:** Video and final persisted value.

**PASS criterion:** Fail-closed does not silently discard the user's draft.

**Default failure severity:** CRITICAL

### SYNC-RV-003 — Reconnect and retry convergence

**Procedure:** Fail a save during share outage, allow another user to edit while disconnected, reconnect and retry.

**Required evidence:** Revision timeline, conflict UI and final canonical state.

**PASS criterion:** Retry uses current revision/conflict handling and cannot overwrite the intervening update silently.

**Default failure severity:** BLOCKER

### SYNC-RV-004 — All mutation paths use shared fail-closed logic

**Procedure:** Disconnect the share and attempt term save, hierarchy edit, image replace, delete, import, restore and settings/admin actions.

**Required evidence:** Path-by-path matrix and storage/file evidence.

**PASS criterion:** No overlooked path falls back to IndexedDB/local state or reports success.

**Default failure severity:** CRITICAL

### SYNC-RV-005 — Concurrent edits to different terms

**Procedure:** Use two isolated writers on the same initial revision; save different terms near-simultaneously. Repeat 20 times.

**Required evidence:** Operation ledger, 409 responses if any, final canonical diff.

**PASS criterion:** Both independent changes survive or conflicts are explicitly resolved; no whole-file lost update.

**Default failure severity:** BLOCKER

### SYNC-RV-006 — Concurrent edits to the same term

**Procedure:** Two writers edit the same term and save in both orders and near-simultaneously, repeated 20 times.

**Required evidence:** Conflict responses, UI, final state and revision history.

**PASS criterion:** Stale save receives a visible conflict and cannot silently overwrite.

**Default failure severity:** BLOCKER

### SYNC-RV-007 — Delete-versus-edit and move-versus-edit

**Procedure:** Run stale edit against delete and hierarchy move from another writer.

**Required evidence:** Final hierarchy, references and conflict evidence.

**PASS criterion:** No ghost recreation, duplicate, orphan or wrong-parent mapping.

**Default failure severity:** CRITICAL

### SYNC-RV-008 — Rapid sequential saves and lock recovery

**Procedure:** Perform 30 saves rapidly, force one stale lock, then release it. Verify every acknowledged save and lock cleanup.

**Required evidence:** Revision ledger, lock files and final values.

**PASS criterion:** Acknowledged saves are durable and stale locks recover safely.

**Default failure severity:** CRITICAL

### SYNC-RV-009 — Long-lived viewer refresh

**Procedure:** Keep Viewer open while writers make changes. Test automatic refresh, documented refresh and reopen.

**Required evidence:** Timestamped multi-session recording.

**PASS criterion:** Viewer reliably converges to current shared state and stale status is understandable.

**Default failure severity:** CRITICAL

### SYNC-RV-010 — Multiple tabs under one writer

**Procedure:** Edit same and different terms in two tabs and save in varying order.

**Required evidence:** Video, revisions and final state.

**PASS criterion:** Conflict/version rules also protect same-user tabs.

**Default failure severity:** CRITICAL

### IMG-RV-001 — Progressive real UI image test 1-15 MB

**Procedure:** Through the actual UI, attach PNG/JPEG/WebP samples at 1, 3, 5, 8, 10 and 15 MB; save each, close, reopen and inspect.

**Required evidence:** File size/hash, UI video, state payload and timings.

**PASS criterion:** Every required size succeeds end-to-end or the build fails the 15 MB product requirement.

**Default failure severity:** BLOCKER

### IMG-RV-002 — Eliminate the 300 KB contradiction

**Procedure:** Search client/server validation for 300KB/307200 and test just below/above any detected limit.

**Required evidence:** Code references and boundary results.

**PASS criterion:** No hidden client limit prevents the accepted 15 MB requirement.

**Default failure severity:** CRITICAL

### IMG-RV-003 — 15 MB persistence across second workstation

**Procedure:** Save a 15 MB image, close the first session, open from a clean second session/workstation and compare rendered content and source hash.

**Required evidence:** Two-session recording and hash comparison.

**PASS criterion:** The second session displays the exact persisted image and associated term.

**Default failure severity:** BLOCKER

### IMG-RV-004 — 30-second timeout under realistic latency

**Procedure:** Throttle/introduce SMB latency and repeat 15 MB save/sync. Measure upload, server processing, atomic rename and reload separately. Test near 30 seconds and beyond.

**Required evidence:** Timing distribution, timeout logs and source hashes.

**PASS criterion:** Timeout is justified by measured behavior; timeout failure is explicit and leaves no partial state. Merely changing 5s to 30s is not proof.

**Default failure severity:** CRITICAL

### IMG-RV-005 — Payload and body-size limits

**Procedure:** Measure Base64 expansion and total JSON size. Test server request-body limit with 15 MB and a controlled above-limit sample.

**Required evidence:** Request sizes, server config and responses.

**PASS criterion:** 15 MB succeeds; above-limit input is rejected before persistence with a clear message.

**Default failure severity:** CRITICAL

### IMG-RV-006 — Large-image interruption atomicity

**Procedure:** Terminate helper during 15 MB save at repeated stages.

**Required evidence:** Active/previous/temp hashes and UI recovery.

**PASS criterion:** No truncated Base64, malformed JSON or broken reference is left active.

**Default failure severity:** BLOCKER

### IMG-RV-007 — Large-image backup and restore

**Procedure:** Create backup containing all progressive sizes; restore to clean project; compare every image/data hash and term association.

**Required evidence:** Manifest and UI sample from second session.

**PASS criterion:** Backup and restore are lossless for 15 MB media.

**Default failure severity:** CRITICAL

### IMG-RV-008 — Memory and responsiveness

**Procedure:** Repeat open/close/navigation of 15 MB images and measure browser/helper memory, UI blocking and recovery after 50 cycles.

**Required evidence:** Memory trend and p50/p95 timings.

**PASS criterion:** No unbounded growth, crash or unusable freeze.

**Default failure severity:** CRITICAL

### IMG-RV-009 — Filename and format matrix

**Procedure:** Use Hebrew, Amharic, spaces, long names, special characters, duplicate base names, transparent PNG, WebP and corrupt/signature-mismatch samples.

**Required evidence:** Stored representation, rendering and validation logs.

**PASS criterion:** Names/content are handled safely with no collision, execution or wrong-image association.

**Default failure severity:** CRITICAL

### IMG-RV-010 — Scale interaction

**Procedure:** Run search, save and backup with the expected production dataset and a larger synthetic dataset containing many images.

**Required evidence:** Dataset size, p50/p95 timings, memory and errors.

**PASS criterion:** Documented capacity is based on measurements and no performance fixture contaminates active data.

**Default failure severity:** CRITICAL

### UX-RV-001 — beforeunload uses real dirty state

**Procedure:** Open each editor without changes, then modify content, save, cancel and close. Repeat after failed save.

**Required evidence:** Scenario matrix and browser dialogs.

**PASS criterion:** Warning appears only when unsaved changes exist; it remains after failed save and clears after successful save/cancel.

**Default failure severity:** CRITICAL

### UX-RV-002 — Unsaved warning covers every editing surface

**Procedure:** Test domain, subdomain, term, inline editor, image replacement, settings/import/restore preparation and multiple tabs.

**Required evidence:** Surface-by-surface results.

**PASS criterion:** All meaningful unsaved states are protected or explicitly documented.

**Default failure severity:** CRITICAL

### UX-RV-003 — Durable save and failure messaging

**Procedure:** Test success, 409 conflict, 403/read-only, 500/locked, timeout and disconnected share.

**Required evidence:** Screenshots/video and actual file outcomes.

**PASS criterion:** Messages distinguish durable success, conflict, permission, connectivity and retry guidance; no false success.

**Default failure severity:** CRITICAL

### UX-RV-004 — All domains at 100% zoom and scaling

**Procedure:** Test all-domain view at 100%, 125% and 150%, common desktop sizes and long content. Verify vertical scrolling rather than clipping.

**Required evidence:** Full-page screenshots and keyboard navigation.

**PASS criterion:** No domains/actions are unreachable or visually cut off.

**Default failure severity:** CRITICAL

### UX-RV-005 — Actual Edge 95 execution

**Procedure:** Run critical viewer/admin workflows, save, conflict, large image and error states in Edge 95 where available.

**Required evidence:** Exact Edge version, video and console.

**PASS criterion:** Critical workflows pass in Edge 95. Otherwise mark NOT TESTED/FAIL; modern Chromium cannot substitute.

**Default failure severity:** CRITICAL

### UX-RV-006 — Non-developer recovery drill

**Procedure:** Give an administrator only the documentation and a disposable corrupt copy. Observe backup validation and clean restore.

**Required evidence:** Time, errors, completed restore and post-restore hashes.

**PASS criterion:** Recovery succeeds without code editing or undocumented knowledge.

**Default failure severity:** CRITICAL

### REG-RV-001 — One reproducible critical regression command

**Procedure:** Create or identify a single script that runs the automated critical gates without modifying production data and exits non-zero on failure.

**Required evidence:** Command, logs and machine-readable result.

**PASS criterion:** Another auditor can rerun it against a clean QA copy.

**Default failure severity:** CRITICAL

### REG-RV-002 — Run the full existing 107-case matrix

**Procedure:** Import/preserve every original test ID. Execute all applicable tests; do not silently omit cases. Map each targeted RV case to related original IDs.

**Required evidence:** Complete matrix with status, date, environment and evidence link.

**PASS criterion:** All 107 cases are accounted for as PASS/FAIL/BLOCKED/NOT TESTED/INCONCLUSIVE/N/A.

**Default failure severity:** CRITICAL

### REG-RV-003 — Preserve QA evidence and harness

**Procedure:** Keep tests, scripts, logs and evidence in a QA package. Produce a separate clean deployment package if required.

**Required evidence:** QA tree and release tree manifests.

**PASS criterion:** Reproducibility is preserved without shipping unnecessary test dependencies to users.

**Default failure severity:** CRITICAL

### REG-RV-004 — Independent claim-to-evidence review

**Procedure:** For every prior Gemini claim, Codex finding and remediation claim, cite current executed evidence and classify Confirmed, Refuted, Partially Confirmed or Not Tested.

**Required evidence:** Reconciliation matrix with evidence paths.

**PASS criterion:** No prior narrative is carried forward without current proof.

**Default failure severity:** CRITICAL

### REG-RV-005 — Sixty-minute multi-session soak

**Procedure:** Run at least two writers and three viewers with scripted/randomized edits, refreshes, searches and image opens. Compare final operation ledger to canonical state.

**Required evidence:** Operation ledger, final canonical diff and error logs.

**PASS criterion:** No missing, duplicated, cross-linked or silently overwritten operation.

**Default failure severity:** CRITICAL

### REG-RV-006 — Update and rollback procedure

**Procedure:** Test replacing code with a new version against a copied dataset, cache/version handling and rollback to the prior release.

**Required evidence:** Version screenshots, data/schema checks and rollback result.

**PASS criterion:** Code and data versions do not become mixed or unrecoverable.

**Default failure severity:** CRITICAL

### REG-RV-007 — Operational logging

**Procedure:** Verify save failures, conflicts, restore, corrupt-state detection and helper startup failures produce actionable logs without exposing sensitive content.

**Required evidence:** Log samples and retention/location documentation.

**PASS criterion:** A support person can diagnose incidents without developer-only context.

**Default failure severity:** CRITICAL

### REG-RV-008 — Final cross-platform-ready release decision

**Procedure:** Apply the normalized scoring and coverage rules below; list every unresolved and untested gate.

**Required evidence:** Scores, coverage, confidence, findings and decision.

**PASS criterion:** The decision can be reproduced from evidence and does not depend on the auditor's preferred tone.

**Default failure severity:** CRITICAL

## 9. Full 107-Case Baseline Requirement

After targeted revalidation, execute every applicable case from the existing Gemini/Codex 107-case baseline. Preserve the original IDs OFF, SYNC, CNT, SRCH, IMG, AUTH, REC, CACHE, PERF and UX. Add the RV IDs above. Do not omit cases because they were previously reported as PASS. For tests requiring unavailable physical environments, use BLOCKED or NOT TESTED and list the exact environment needed.

## 10. Mandatory Evidence Rules

- Every PASS must identify command/procedure, environment, timestamp, input fixture and evidence path.

- For saves: compare authoritative files before/after, reopen and verify from another isolated session.

- For concurrency: maintain a high-resolution operation ledger and repeat timing-sensitive cases at least 20 times.

- For recovery: use disposable copies and prove canonical state plus image hashes after clean restore.

- For permissions: include Windows account, ACL and direct endpoint results. Hidden buttons do not prove access control.

- For images: report original bytes, Base64/payload bytes, total state size, UI/server timings and second-session result.

- For Edge 95: report the exact browser version. Static syntax checks and modern Chromium automation are supplemental only.

- Do not delete the test harness or evidence. Create a separate clean release package if necessary.



## 11. Normalized Scoring and Release Rules

Report three separate headline measures. Never collapse them into one reassuring number.

1. Verified Product Quality Score (0-10): weighted category assessment based on executed evidence and confirmed static findings.
2. Evidence Coverage (0-100%): percentage of weighted applicable tests actually executed. PASS and FAIL both count as executed; NOT TESTED and BLOCKED do not.
3. Release Readiness Score (0-10): combines product quality with mandatory-gate completeness and operational proof.

Mandatory score caps:
- Any unresolved BLOCKER or CRITICAL defect: Release Readiness maximum 4.0 and decision NO GO.
- Any mandatory data-integrity, synchronization, authorization, 15 MB image or clean-restore gate NOT TESTED: Release Readiness maximum 6.0 and no unconditional GO.
- No real second Windows account/ACL test: Security/Permissions maximum 6.0.
- No real two-workstation or defensibly isolated multi-process persistence test: Synchronization maximum 6.0.
- No actual Edge 95 test while Edge 95 remains required: Compatibility component maximum 5.0 and the missing proof must be a release condition.
- Less than 80% weighted evidence coverage: overall Release Readiness maximum 6.0.
- A score of 9 requires at least 95% weighted coverage, all mandatory gates executed and passed, no unresolved Major defect affecting a primary workflow, and reproducible regression evidence.
- A score of 10 requires exceptional complete evidence and should be used rarely.

Categories: Architecture, Offline Operation, Reliability, Data Integrity, Synchronization, Backup/Recovery, Performance/Capacity, Maintainability/Testability, UX, Accessibility/Compatibility, Security/Permissions, Operational Readiness.

Decision rules:
- GO: no unresolved Blocker/Critical; all mandatory gates pass; weighted coverage at least 95%; recovery, concurrency, authorization and 15 MB image handling proven in the stated deployment model.
- GO WITH CONDITIONS: no unacceptable immediate data-loss/security risk, but clearly owned P1 conditions or missing environment proof remain.
- NO GO: any unresolved Blocker/Critical; unproven/failed shared-source recovery; silent overwrite; unauthorized durable write; contradictory deployment model; or failure of the 15 MB requirement.

## 12. Required Final Outputs

- EXECUTIVE_SUMMARY_HE.md — Hebrew management summary with decision, quality score, coverage and confidence.

- TECHNICAL_SUMMARY_EN.md — concise English technical summary.

- CLAIM_TO_EVIDENCE_MATRIX.md — prior Gemini claims, Codex findings, remediation claims and current verdict.

- QA_TEST_MATRIX.csv — every existing 107-case ID plus every RV case, status, environment, date, evidence and finding.

- QA_FINDINGS.md — complete findings with severity, root cause hypothesis, reproduction, business impact and remediation.

- QA_RELEASE_GATES.md — mandatory gate status and exact blockers/conditions.

- ARCHITECTURE_TRUTH.md — launcher, helper/server, bind address, state files, browser storage, write path, revisions, locks and ACL model.

- STATE_AND_RECOVERY_REPORT.md — current state provenance, schema/integrity, backup/restore and failure injection.

- SECURITY_PERMISSION_REALITY.md — UI controls versus endpoint checks versus OS/SMB permissions.

- SYNC_CONCURRENCY_REPORT.md — operation timelines, conflicts, stale state and disconnect/reconnect results.

- IMAGE_PERFORMANCE_REPORT.md — 1-15 MB end-to-end results, payload sizes, timeouts, memory and scale.

- EVIDENCE_INDEX.md — all logs, screenshots, videos, hashes, diffs and commands.

- QA_FINAL_REPORT.md — category scores, evidence coverage, release readiness, top risks, roadmap and GO / GO WITH CONDITIONS / NO GO.



## 13. Required Finding Format

For every finding provide: Finding ID; related test IDs; title; status; severity; likelihood; affected version/environment; prior claim contradicted or confirmed; business impact; technical explanation; root-cause hypothesis; exact reproduction; evidence links; recommended solution; implementation complexity; regression tests required; residual risk; release gate affected.

## 14. Required First Response from Gemini

Before testing, Gemini must list: received files; missing reports/evidence; frozen baseline location and hash plan; actual/available workstations, Windows users and ACLs; actual browser versions; how the loopback helper and shared source will be tested; prepared image fixtures; destructive-test copies; and which mandatory cases are initially at risk of being NOT TESTED. Then begin Phase 0. Do not return a generic reassuring summary.

## 15. Exact Start Instruction

Read the full file `MechLex_Gemini_Post_Remediation_Deep_QA_v3.md`, the current MechLex project, the previous Gemini audit report, all Codex QA outputs, and the Gemini remediation walkthrough before changing anything.

This run is an INDEPENDENT POST-REMEDIATION AUDIT, not a repair session. Freeze and hash the current build. Treat every prior statement as an unverified claim. First create the audit plan and claim-to-evidence matrix. Then execute the mandatory targeted RV tests, followed by every applicable test in the existing 107-case matrix. Use terminal, browser automation, direct API requests, file/hash comparisons, isolated browser profiles/processes, permission tests and controlled failure injection where the environment permits. Do not mark PASS from code inspection alone and do not count NOT TESTED as PASS.

Use the corrected deployment contract: no Internet/cloud/remote service; a packaged per-workstation loopback helper is permitted and must be tested; the shared folder is the sole authoritative state; images through 15 MB are mandatory; Edge 95 remains required unless formally changed.

Do not modify production behavior during this audit. At the end report Verified Product Quality Score, Evidence Coverage, Release Readiness Score, all discrepancies resolved or unresolved, and an explicit GO / GO WITH CONDITIONS / NO GO decision. Begin with baseline preservation and architecture truth.

## 16. Completion Statement Template

I audited MechLex version [VERSION/HASH] after the stated remediation. I executed [N] of [TOTAL APPLICABLE] weighted cases: [PASS] PASS, [FAIL] FAIL, [BLOCKED] BLOCKED, [NOT TESTED] NOT TESTED and [INCONCLUSIVE] INCONCLUSIVE. Verified Product Quality is [X/10], Evidence Coverage is [Y%], and Release Readiness is [Z/10]. The recommendation is [GO / GO WITH CONDITIONS / NO GO]. This conclusion is valid only for the deployment architecture, state revision, browsers, Windows/SMB permissions, workstations, image sizes and recovery procedure explicitly evidenced in this report.
