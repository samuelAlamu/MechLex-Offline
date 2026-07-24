# Remediation Roadmap

## P0 — Freeze, recover, protect

1. Freeze writes from the original application.
2. Copy and hash the entire shared-data directory.
3. Recover verified revision 13 in a controlled, reversible operation.
4. Enforce full schema, revision and checksum validation.
5. Replace the client-only Super Admin boundary with enforceable authorization.

## P1 — Make synchronization and recovery dependable

1. Fix unchanged polling semantics.
2. Fail closed when a shared store is configured but unavailable.
3. Preserve both sides of a conflict and add a reconciliation workflow.
4. Implement a shared-source disaster-recovery flow with re-read verification.
5. Move images out of whole-state Base64 JSON or revise the supported limit.

## P2 — Product quality and release proof

1. Fix unsaved-change warning, mobile focus and ARIA tab state.
2. Improve short/special-character search ranking.
3. Unify versions and ship a reproducible test harness.
4. Test on two physical workstations using SMB/UNC and separate Windows accounts.
5. Run network/power fault injection, long-duration soak and complete clean-machine restore.

