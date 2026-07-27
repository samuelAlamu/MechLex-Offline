# Goal 1 evidence index

## Catalogue and control

- [Goal status](GOAL_STATUS.md)
- [Execution control](evidence/goal1/GOAL1_EXECUTION_CONTROL.md)
- [Catalogue source analysis](evidence/goal1/catalogue-architecture/CATALOGUE_SOURCE_ANALYSIS.md)
- [Catalogue sources and hashes](evidence/goal1/catalogue-architecture/CATALOGUE_SOURCES.csv)
- [Complete 180-case catalogue](QA_TEST_CATALOGUE.csv)
- [Complete execution matrix](QA_TEST_EXECUTION_MATRIX.csv)
- [Category counts](QA_CATEGORY_COUNTS.csv)

## Baseline and real-data safety

- [H0 handoff verification](HANDOFF_VERIFICATION.md)
- [Goal 1 baseline evidence directory](evidence/goal1/baseline/)
- Real organizational share guard: H0 recursive baseline and post-test verification passed for all 44 tracked paths/hashes/timestamps.
- All mutation suites recorded `realSharedPathUsed=false` and used `codex-qa/workspaces` disposable copies.

## Architecture, storage and dependencies

- [Architecture/truth map](evidence/goal1/catalogue-architecture/ARCHITECTURE_AND_TRUTH_MAP.md)
- [Runtime dependency closure](evidence/goal1/catalogue-architecture/RUNTIME_DEPENDENCY_CLOSURE.csv)
- [Goal 1 consolidated truth map](ARCHITECTURE_AND_STORAGE_TRUTH.md)
- [Static audit](evidence/goal1/static/static-audit.json)
- [JavaScript syntax results](evidence/goal1/static/js-syntax-results.json)

## Security, authority and persistence

- [Seven scoped investigations](evidence/goal1/security-storage/FINDINGS.md)
- [Security/storage evidence index](evidence/goal1/security-storage/EVIDENCE_INDEX.csv)
- File mode/LocalStorage: `evidence/goal1/security-storage/G1-SEC-01-file-localstorage.json`
- PIN/role/save-failure: `evidence/goal1/security-storage/G1-SEC-02-05-07-authority-failure.json`
- Viewer side effect/Host/Origin: `evidence/goal1/security-storage/G1-SEC-03-04-runtime.json`
- Nested validation: `evidence/goal1/security-storage/G1-SEC-06-shallow-validation.json`

## Browser, UX and accessibility

- [Core browser results](evidence/goal1/browser-core/browser-qa-results.json)
- [UX edge cases](evidence/goal1/ux-accessibility/ux-edge-cases.json)
- [Axe results](evidence/goal1/ux-accessibility/axe-results.json)
- Screenshots and helper logs are retained in their respective evidence directories.

## Concurrency, recovery, performance and capacity

- [Results summary](evidence/goal1/concurrency-recovery-performance/RESULTS_SUMMARY.md)
- [Machine-readable results](evidence/goal1/concurrency-recovery-performance/goal1-crp-results.json)
- [Detailed evidence index](evidence/goal1/concurrency-recovery-performance/evidence-index.csv)

The complete Goal 1 evidence tree contains 590 files. Profile directories, generated media and disposable shared states are retained as raw reproduction evidence and are not production assets.
