# Goal 1 — Security and Storage Investigation

Frozen product revision: `5034fa3f76e4b6da97ca6f23ee055ef3de24e903`  
Mode: audit-only. All writes were confined to guarded disposable copies and this evidence directory. The real organizational share was not used.

## G1-SEC-01 — Functional `file://` dictionary accepts LocalStorage as authority

**Result:** Independently reproduced. **Severity: Critical. Mandatory release gate: FAIL.**

- Workflows affected: direct HTML launch, offline/fallback opening, dictionary load, subsequent search/view/edit of locally injected content.
- Reproduction: open the disposable `index.html` by `file://` in a clean persistent Edge profile; verify 4 domains/8 terms; replace the first domain in `mechlex_v6_data`; reload; close the browser context; reopen the same profile.
- Persisted file: none.
- Memory/storage: injected content loaded into live `data`; source became `local`; LocalStorage retained the marker.
- Restart/session: survives browser restart in the same profile. A different clean profile does not share the origin storage, so it does not observe it.
- Impact: creates an alternate authoritative dictionary, split-brain data, misleading offline operation, and workstation/profile-specific content.
- Goal 2 regression: direct `file://` must show only a blocking/redirect instruction; no dictionary content may load from LocalStorage/IndexedDB. Repeat with preseeded storage and after browser restart.
- Evidence: `G1-SEC-01-file-localstorage.json`.

## G1-SEC-02 — Client PIN/UI Super Admin is not durable authorization

**Result:** Independently reproduced. **Severity: Critical design/security gap. Mandatory release gate: FAIL.**

- Workflows affected: opening Content Expert/Super Admin UI, all admin controls, direct API mutation, recovery expectations, operator role guidance.
- Reproduction: start the guarded helper as Viewer; set client `state.adminRole="super"`; call `openAdmin("super", settings.superPin)` with the PIN already present in client state; issue a direct unchanged PUT to `/api/shared-state`.
- Persisted file: unchanged; PUT returned 403.
- Memory/storage: Super Admin overlay opened in browser memory. The client PIN provided UI authority only.
- Restart/session: UI state/PIN material is client-side and may be available again from serialized settings, but no durable server authority was gained. Another session is independently governed by its client state and helper identity.
- Impact: UI conveys privileged access without a trustworthy relationship to durable authority; client state is modifiable and must not be credited as authorization.
- Goal 2 regression: every role-sensitive UI flow must be backed by a server-issued/effective capability; tampered client role/PIN must not expose operative privileged workflows; every mutation must independently enforce authority.
- Evidence: `G1-SEC-02-05-07-authority-failure.json`, `G1-SEC-static-scope.csv`.

## G1-SEC-03 — Viewer `GET /api/can-write` creates authoritative `state.json`

**Result:** Independently reproduced. **Severity: Critical. Mandatory release gate: FAIL.**

- Workflows affected: startup capability probing, Viewer launch, empty/new share initialization, monitoring/health checks that call can-write.
- Reproduction: create an empty guarded disposable share; start helper with inherited `MECHLEX_MOCK_ROLE=Viewer`; confirm no state file; GET `/api/can-write`; inspect disk.
- Persisted file: a durable zero-byte `state.json` was created (SHA-256 of empty file) even though response was `{"canWrite":false,"role":"Viewer"}`.
- Memory/storage: no browser storage involved.
- Restart/session: file survives helper restart and is visible to every session/workstation sharing that directory; it can also turn a missing-state condition into a corrupt/zero-byte-state condition.
- Impact: a read-only identity mutates the authority store and may cause denial of service/data-integrity failures.
- Goal 2 regression: GET/HEAD capability checks must be side-effect free under Viewer and on absent, read-only and malformed state paths; assert directory manifest and timestamps unchanged.
- Evidence: `G1-SEC-03-04-runtime.json`, `guard-runtime.json`.

## G1-SEC-04 — Host is accepted; Origin enforcement is endpoint-specific

**Result:** Independently reproduced and scoped. **Severity: Major. Release gate: FAIL pending threat-model repair/evidence.**

- Workflows affected: all static and health requests, `/api/can-write`, and request routing to the loopback helper; shared-state requests have a narrower Origin check.
- Reproduction: send raw requests to loopback with `Host: evil.example`; repeat health with hostile Origin; request shared-state with hostile and `null` Origin.
- Persisted file/storage: none in the Host/Origin probes.
- Results: hostile Host received 200 on health; hostile Host plus hostile Origin also received 200 on health. Shared-state rejected hostile and `null` Origin with 403.
- Restart/session: deterministic server behavior and therefore survives restart; any local browser/process able to reach the loopback port can observe it.
- Impact: weakens DNS-rebinding/request-origin defenses and leaves protection inconsistent across endpoints. The proven Viewer side effect makes unprotected `/api/can-write` especially important.
- Goal 2 regression: reject unexpected Host on every route; define and uniformly enforce Origin policy on every sensitive or side-effecting route; cover absent, `null`, hostile, alternate loopback hostname and wrong port.
- Evidence: `G1-SEC-03-04-runtime.json`.

## G1-SEC-05 — UI roles have no proven binding to Windows/SMB authority

**Result:** Architecture gap reproduced at the available boundary; complete SID/ACL matrix **BLOCKED**. **Severity: Critical. Mandatory release gate: FAIL.**

- Workflows affected: Viewer/Content Expert/Super Admin entry, content saves, structure changes, restore/recovery, direct API writes.
- Available proof: the same browser opened client Super Admin while the Viewer helper rejected PUT. Source shows UI roles `Viewer/Content Expert/Super Admin`, helper roles `Viewer/Editor/Admin`, Windows-group checks, and a production `MECHLEX_MOCK_ROLE` override; no session credential binds them.
- Persisted result: rejected Viewer PUT left the disposable share unchanged.
- Restart/session: helper authorization is process identity/environment; UI authorization is per client state. Another browser session may claim a different UI role without changing the helper’s effective identity.
- Missing proof: separate real Windows SIDs, controlled NTFS/SMB ACLs, Content Expert group mapping, revocation mid-session, and a second machine. These were not simulated as proof.
- Required environment/approval: explicit approval to create/use three Windows test identities and controlled ACL/group assignments, ideally over real SMB.
- Goal 2 regression: full UI + direct API + filesystem matrix for Viewer, Content Expert and Administrator under distinct SIDs; remove/disable mock override in release runtime; verify revocation at write time.
- Evidence: `G1-SEC-02-05-07-authority-failure.json`, `G1-SEC-static-scope.csv`.

## G1-SEC-06 — Nested semantic corruption passes server validation and persists

**Result:** Independently reproduced. **Severity: Critical data-integrity defect. Mandatory release gate: FAIL.**

- Workflows affected: every content/structure save, import/restore paths that reach shared-state PUT, hierarchy navigation/search, second-session load, recovery.
- Reproduction: copy the disposable shared dataset; start Admin helper; GET current state; append a nested item duplicating an existing nested ID and referencing missing parent `MISSING-NESTED-PARENT`; PUT with the current revision; inspect the saved file.
- Persisted file: PUT returned 200/revision 168; file hash changed and the invalid nested marker was present.
- Memory/storage: the request payload contained the invalid nested object; no browser fallback was involved.
- Restart/session: authoritative file persistence means the defect survives helper/browser restart and is visible to another session/workstation using that disposable share.
- Impact: duplicate IDs and dangling semantic references can enter the source of truth, causing ambiguity, broken navigation and later repair/data loss.
- Goal 2 regression: recursive schema/semantic validation for all nested levels, global unique IDs, valid parent/reference/image relations, rejection before any disk/history mutation, plus valid four-level mixed hierarchy acceptance.
- Evidence: `G1-SEC-06-shallow-validation.json`, `guard-validation.json`.

## G1-SEC-07 — `saveAll` returns true after helper failure

**Result:** Independently reproduced with narrower scope than H0. **Severity: Critical reliability/UX contract defect. Mandatory release gate: FAIL.**

- Workflows affected: edits/saves attempted after helper loss, inline edit, content/structure actions that interpret `saveAll` truthiness, save messaging.
- Reproduction: load from guarded shared copy as Viewer; stop helper; mutate first domain in memory; call `saveAll`; inspect live memory, LocalStorage, IndexedDB and shared-file manifest.
- Persisted file: unchanged.
- Memory/storage: `saveAll` returned `true`; in this independent run the mutation was rolled back in memory, LocalStorage and IndexedDB to the prior value.
- Restart/session: marker cannot survive restart and cannot be observed by another session because it was absent from all durable stores.
- Scope correction: the H0 lead that the mutation remains only in memory was **not reproduced** in this run; rollback did occur. The false success return was reproduced and is independently release-gating.
- Impact: caller/UI can treat a failed save as successful even though no durable change exists; users may continue or close believing work persisted.
- Goal 2 regression: after helper loss, `saveAll` must return/reject failure, expose an accessible failure state, preserve an explicitly labelled draft only if product-approved, and never display success; verify file, memory, LocalStorage, IndexedDB, restart and second session.
- Evidence: `G1-SEC-02-05-07-authority-failure.json`.

## Overall boundary conclusion

Five mandatory release-gate failures are proven here: alternate `file://`/LocalStorage authority, client UI/PIN authority separation, Viewer durable side effect, nested invalid state persistence, and false save success. Host/Origin policy is also release-blocking until uniformly defended. The complete role claim remains blocked on distinct SID/ACL and real SMB evidence; same-host/mock-role results are not proof of cross-machine enforcement.
