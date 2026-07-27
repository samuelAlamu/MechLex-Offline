# Goal 1 findings register

Frozen version: commit `5034fa3f76e4b6da97ca6f23ee055ef3de24e903`, annotated tag `mechlex-final-gemini-handoff`.

Goal 1 was audit-only. No production repair was performed. All mutation tests used guarded disposable copies.

## Release-gate findings

| ID | Severity | Finding | Affected workflows | Durable and restart result | Other session/workstation | Gate |
|---|---|---|---|---|---|---|
| G1-SEC-01 | Critical | `file://` is a functional dictionary and accepts `mechlex_v6_data` from LocalStorage as source `local` | Direct launch, load, search, view and any local editing path | No authoritative file; LocalStorage survives restart of the same Edge profile | Same profile sees it; clean profile/workstation does not, creating split brain | Mandatory FAIL |
| G1-SEC-02 | Critical | Client Super Admin/PIN grants UI authority but not durable server/filesystem authority | Admin entry, privileged controls, save/recovery expectations | Viewer PUT remained 403 and file unchanged | Each client can claim UI state independently; helper identity remains separate | Mandatory FAIL |
| G1-SEC-03 | Critical | Viewer `GET /api/can-write` creates zero-byte `state.json` | Viewer startup/capability probe, empty-share initialization | File survives helper restart and can convert “missing” into corrupt/empty state | Visible to every session sharing the directory | Mandatory FAIL |
| G1-SEC-04 | Major | Unexpected Host is accepted and Origin enforcement is route-specific | Static, health, can-write and API routing | No file mutation in this probe; behavior survives restart | Any local process/browser reaching the helper can observe it | Release-blocking |
| G1-SEC-05 | Critical | No proven server-side relationship between Viewer/Content Expert/Administrator UI roles and Windows SID/SMB authority | All role-sensitive UI, direct API, save and recovery flows | Viewer API denial was durable; UI elevation was only client memory | Full role matrix requires distinct SIDs/ACLs and real SMB | Mandatory FAIL |
| G1-SEC-06 | Critical | Duplicate nested ID and dangling parent are accepted and persisted | Save, import/restore, hierarchy, search, navigation and recovery | PUT 200, revision 168, changed hash; invalid state survived helper restart | Any session/workstation opening the disposable share sees it | Mandatory FAIL |
| G1-SEC-07 | Critical | `saveAll` returns `true` after helper loss although no durable save occurred | All save callers and success messaging | File unchanged; tested marker rolled back from memory, LocalStorage and IndexedDB and does not survive restart | Other session cannot observe the mutation | Mandatory FAIL |
| G1-ARCH-01 | Critical | Active-helper discovery is hard-coded to port 8765 | Startup, capability/role discovery, saves on non-default port | At ports 8785-8787 CSP blocked the 8765 request; admin flow failed open at the UI boundary | Repeats in each client | Mandatory FAIL |
| G1-ARCH-02 | Critical | Existing helper reuse does not verify project version or shared-data identity | Launcher/startup and all later reads/writes | Wrong helper can be selected; read-only accidental reuse was observed and the real-share guard then proved 44/44 paths unchanged | Affected clients can target the same wrong helper | Mandatory FAIL |
| G1-UX-01 | Major | Special-character search query `A | B` returned the entire 142-term catalogue | Search | No file/storage effect; deterministic after reload | Every session reproduces it | Release-blocking |
| G1-UX-02 | Major | Dirty edit closes without warning | Content editing | Unsaved data is discarded; no durable file | Other session cannot see discarded edit | Release-blocking |
| G1-A11Y-01 | Major | Active tab ARIA state is inconsistent and eight hidden sidebar controls remain tabbable on mobile | Keyboard, screen-reader and mobile navigation | UI-only; repeats after restart | Every session reproduces it | Release-blocking |
| G1-PERF-01 | Major | Valid PNG reads from 5–15 MiB took 5.449–9.240 seconds | Image load/preview | Files persisted correctly; latency repeats on local audit host | Likely visible to all clients; real SMB not measured | Release-blocking pending target |
| G1-MNT-01 | Major | Frozen package lacks referenced `package.json`, test set and manifest; versions disagree | Repeatable QA, support, upgrade and release identification | Package remains internally inconsistent | Every installation inherits it | Release-blocking |
| G1-SYNC-01 | Critical | Modern Edge treats the polling 304 response as `ERR_ABORTED`; repeated polling can enter read-only/error handling | Shared-state polling and live synchronization | No file corruption was observed; client reliability is degraded | Every modern Edge client can reproduce | Mandatory FAIL |

## Exact reproduction and raw proof

The complete workflow, file result, browser memory/storage result, restart result, second-session scope, impact and required regression for G1-SEC-01 through G1-SEC-07 are recorded in [security/storage findings](evidence/goal1/security-storage/FINDINGS.md). Raw browser, request and filesystem evidence is indexed in [security/storage evidence](evidence/goal1/security-storage/EVIDENCE_INDEX.csv).

Additional raw proof:

- Browser core and polling: [browser-qa-results.json](evidence/goal1/browser-core/browser-qa-results.json)
- UX/keyboard edge cases: [ux-edge-cases.json](evidence/goal1/ux-accessibility/ux-edge-cases.json)
- Axe results: [axe-results.json](evidence/goal1/ux-accessibility/axe-results.json)
- Concurrency/recovery/performance: [RESULTS_SUMMARY.md](evidence/goal1/concurrency-recovery-performance/RESULTS_SUMMARY.md)
- Architecture/static truth: [ARCHITECTURE_AND_TRUTH_MAP.md](evidence/goal1/catalogue-architecture/ARCHITECTURE_AND_TRUTH_MAP.md)

## Goal 2 regression requirements

1. Block or redirect `file://` before any dictionary loads; preseed LocalStorage/IndexedDB and verify no dictionary renders.
2. Remove PIN/client role as authority; bind every privileged workflow to server-issued effective capability and enforce every write at the helper/filesystem boundary.
3. Make every GET/HEAD capability request byte-for-byte side-effect free under Viewer, missing-state, read-only and malformed-state conditions.
4. Enforce Host and Origin policy consistently on every route/method, including absent, `null`, hostile host, alternate loopback hostname and wrong port.
5. Execute UI, API and filesystem role matrix under distinct Viewer, Content Expert and Administrator SIDs, including revocation.
6. Add recursive schema and semantic validation: global IDs, parents, cycles, cross-references, images and valid mixed four-level hierarchies; reject before history/disk mutation.
7. Make failed save return/reject failure, expose an accessible error, never report success, and verify file, memory, both browser stores, restart and second session.
8. Discover and verify helper port, project/version and canonical shared path before reuse; fail closed on mismatch.
9. Replace or correctly handle polling 304 behavior in supported browsers.
10. Add deterministic regressions for special-character search, dirty-close warning, mobile focus exclusion and correct tab ARIA state.
11. Establish and test explicit image latency targets for valid JPEG/PNG/WebP through at least 15 MiB.

