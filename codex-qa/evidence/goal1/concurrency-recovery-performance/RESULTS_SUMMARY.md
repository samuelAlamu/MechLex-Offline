# Goal 1 — Concurrency, Recovery and Performance Evidence

Audit-only execution against frozen commit `5034fa3f76e4b6da97ca6f23ee055ef3de24e903`.

Environment: one Windows host (`SAMUEL-PC`), Node `v22.17.0`, Windows PowerShell helper, loopback ports 8891–8896, disposable local data directories. `MECHLEX_MOCK_ROLE=Admin` was used solely so the frozen helper would accept API writes in disposable data. This is not role/ACL evidence.

The real shared path guard passed separately for all three target directories before any helper launch. Post-run verification matched all 44 real-share paths, lengths, hashes and timestamps.

## Results

| Test ID | Result | Tier/scope | Evidence and conclusion |
|---|---|---|---|
| SYNC-G1-001 | PASS | Tier 1, same helper | Initialized revision 1 durably. |
| SYNC-004 | PASS | Tier 1, same helper | 20/20 simultaneous same-revision rounds produced exactly one HTTP 200 and one 409. This proves stale-write rejection only, not automatic merge/convergence of different-record edits. |
| SYNC-010 | PASS | Tier 1 | Persisted revision 21, 2,145 bytes, SHA-256 `6670ccd1b645bf83a66cb9a7d07e1550dc4245c4b5958610146759a401609244`. |
| SYNC-G1-002 | PASS | Tier 2, two helpers on one host | Two helper processes on ports 8892/8893 targeting one local directory produced 200/409; both subsequently observed revision 22. Same SID, same host and local filesystem: not SMB or separate-account proof. |
| SYNC-G1-003 | NOT TESTED | Tier 3 | Requires two Windows machines/VMs, distinct SIDs/ACLs and a real UNC SMB share. Disconnect, same/different record, delete/edit, move/edit and image/image convergence remain unproved at tier 3. |
| REC-G1-001 | PASS | Disposable local recovery | 36 writes retained exactly 30 history files; current and previous states were distinct, complete JSON files with recorded hashes. |
| REC-G1-002 | PASS | Disposable local recovery | Recovery wizard ignored a malformed candidate, restored revision 35, made a presafety copy, and a fresh helper process reopened revision 35 with SHA-256 `e3ccc839510e8c3a7e70011329e252366f80fe370fe9cf058da893711bedbb7d`. |
| REC-G1-003 | NOT TESTED | Cross-machine recovery | Authoritative SMB restore, controlled interruption at replacement time, rollback, and second-workstation verification require the missing tier-3 topology. |
| IMG-G1-API | PASS with material limitation | API only | PNG payloads of 1/3/5/8/10 MiB and exactly 15,728,640 bytes persisted and round-tripped. GET exceeded the fixed 5-second client timeout at 5, 8, 10 and 15 MiB (5.449–9.240 s), so this is performance evidence for a release-impacting client-timeout risk, not a full media-workflow PASS. |
| IMG-G1-MANDATORY | NOT TESTED | Full UI | JPEG/WebP, exact 15,000,000 bytes, UI select/preview/save, decode/render after restart, and a second isolated session were not executed. |
| PERF-G1-CAPACITY | PASS with material limitation | API only | Flat snapshots of 100/1,000/5,000/10,000 terms returned 200; PUT times were 823/134/481/1,419 ms. Browser rendering, search, memory and p50/p95 distributions are not proven. |
| HIER-G1-UI | NOT TESTED | Browser workflow | Four-level mixed hierarchy CRUD/move/delete/search/reopen/second-session proof was not produced by this bounded harness. |

Raw result count: 8 PASS, 0 FAIL, 4 NOT TESTED. “PASS with material limitation” rows must not be promoted to the mandatory end-to-end case.

## Findings and scoring implications

1. **Large-media timeout risk — Major / release gate until full UI proof.** API persistence succeeds, but response retrieval exceeded the client’s 5-second timeout starting at the tested 5 MiB PNG and at every larger size. Goal 2 regression must exercise every required size/format through UI, restart, decode/render and second session, and must assert truthful success/failure plus durable-file hashes and p50/p95.
2. **Concurrency scope gap — release-readiness cap.** Tier 1 and limited tier 2 stale-write exclusion worked. No evidence exists for tier 3 real SMB, separate principals, disconnect behavior or convergence across machines. Goal 2/3 requires the exact tier-3 topology above and must not inherit these same-host results.
3. **Recovery scope gap — release-readiness cap.** Same-host clean restore works, but interrupted restore and real-share/second-machine recovery remain NOT TESTED. Regression must validate valid/invalid backup selection, kill at the replace boundary, preservation/rollback, new post-restore revision, and second-machine reopen.
4. **Capacity and hierarchy evidence gap.** A 10,000-term flat API payload is accepted, but this does not prove browser usability, semantic hierarchy integrity, memory limits or mixed hierarchy workflows.

Primary evidence: `goal1-crp-results.json`, `execution.log`, `recovery-wizard.log`, three `guard-*.json` files, `real-shared-post-run-verification.json`, and `evidence-index.csv`.
