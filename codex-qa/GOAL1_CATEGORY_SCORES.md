# Goal 1 category scores

Catalogue denominator: 180 unique cases = 107 original + 59 RV + 1 distinct QA case + 13 H0-derived cases. Historical PASS labels were not inherited.

“Evidence” is the count of catalogue rows linked to current frozen-version proof or a documented blocker. Counts are `PASS / FAIL / BLOCKED / NOT TESTED / INCONCLUSIVE`.

| Category | Score | Counts | Evidence | Proven strengths | Open findings / cap | Conditions for ≥9.5 |
|---|---:|---:|---:|---|---|---|
| Architecture | 5.0 | 3/4/0/0/0 | 7/7 | Loopback-only helper; local runtime closure; no remote dependency | Hard-coded port, wrong-helper reuse, multiple browser authorities | Verified helper identity/path/port handshake; one authoritative dictionary; clean-station proof; all architecture cases pass |
| Offline Operation | 4.0 | 2/2/0/5/1 | 5/10 | Cold start and no external traffic passed | Functional `file://`/LocalStorage split brain; five cases not run | Block file mode, no silent fallback, execute all move/rename/UNC/long-path/missing-file cases |
| Reliability | 3.0 | 0/1/0/5/1 | 2/7 | Atomic helper primitives and recovery behavior exist | False save success; 304 polling error; limited catalogue coverage | Failure-accurate save contract, stable polling, restart/soak/update rollback suite all green |
| Data Integrity | 2.5 | 4/5/0/14/1 | 10/24 | Revision/hash rotation and recovery worked on disposable data | Invalid nested/reference state persisted | Recursive semantic validation before disk mutation; execute all content/import/corruption cases |
| Synchronization and Multi-user Safety | 3.0 | 2/2/9/8/4 | 17/25 | Tier 1 races were 20/20 correct; Tier 2 same-host helpers converged | False-save behavior; no Tier 3 SMB evidence | Full Tier 3 distinct-machine/SID SMB suite, reconnect/soak and all 25 cases green |
| Backup and Recovery | 6.0 | 3/1/0/10/0 | 4/14 | 30-entry history rotation; malformed candidate skipped; fresh helper reopened recovered hash | Nested corrupt state accepted; cross-machine/interruption paths absent | All 14 cases, interrupted restore, clean-copy recovery and cross-machine observation pass |
| Performance and Capacity | 5.0 | 0/1/1/26/4 | 6/32 | Flat API datasets through 10,000 terms and PNG persistence through 15 MiB | 5–15 MiB reads exceeded 5 seconds; JPEG/WebP/deep browser coverage missing | Agreed latency budget met for JPEG/PNG/WebP ≥15 MiB and realistic deep hierarchy/SMB load |
| Maintainability | 4.5 | 3/2/0/2/1 | 6/8 | JavaScript syntax 8/8; evidence and catalogue are reproducible | Missing QA runtime assets and version disagreement | One version source, executable packaged suite/manifest, soak/update rollback and release logs pass |
| UX | 4.0 | 4/5/0/10/3 | 12/22 | Core search, no-result and responsive overflow checks passed | False save feedback, dirty-close loss, special-character search | All editing/search/recovery/responsive/zoom workflows pass with accurate durable-state messaging |
| Accessibility | 5.0 | 1/1/0/0/0 | 2/2 | Axe found zero automated violations in sampled views | ARIA/tab mismatch, hidden focus targets; NVDA absent (external cap 5.0) | Fix keyboard/ARIA defects; actual NVDA mixed-language and Edge 95 keyboard evidence |
| Security and Permissions | 2.0 | 3/12/3/2/3 | 21/23 | Viewer PUT denied; sanitizer held | Viewer durable side effect, client authority, Host/Origin, no SID mapping | All mandatory defects fixed plus three real SIDs, ACL/revocation and hostile-request matrix pass |
| Operational Readiness | 3.0 | 1/1/0/0/0 | 2/2 | Explicit evidence-based NO GO exists | Launcher can bind to wrong helper; environment evidence missing | Fail-closed launcher, complete support/runbook/clean-station/role/recovery proof and release gates pass |
| Compatibility | 2.5 | 0/0/4/0/0 | 4/4 | Modern Edge 150 was exercised | Actual Edge 95 and clean workstation blocked (external cap 2.5) | Actual Edge 95 VM plus supported Windows/UNC/mapped-drive and mixed-language runtime suite passes |

Product-quality score: **3.8/10** (rounded mean of the 13 evidence-weighted category judgments).

Release-readiness score: **1.5/10**. This is deliberately lower because mandatory release gates fail regardless of cosmetic or isolated technical strengths.

Machine-readable counts: [QA_CATEGORY_COUNTS.csv](QA_CATEGORY_COUNTS.csv). Full row-level statuses: [QA_TEST_EXECUTION_MATRIX.csv](QA_TEST_EXECUTION_MATRIX.csv).

