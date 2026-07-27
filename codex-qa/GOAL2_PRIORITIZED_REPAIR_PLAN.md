# Prioritized Goal 2 repair plan — not activated

Goal 2 remains inactive. This is planning only.

1. **P0 authority and durability:** block file-mode dictionaries; remove LocalStorage/IndexedDB as authority; make can-write side-effect free; eliminate false save success; enforce recursive semantic validation.
2. **P0 helper identity/security:** verified port/project/version/canonical-share handshake; fail closed on mismatch; uniform Host/Origin policy; disable production mock-role override.
3. **P0 roles:** server-issued capability model mapped to Viewer, Content Expert and Administrator; enforce at helper and filesystem boundaries; regression matrix under real SIDs/ACLs.
4. **P1 synchronization:** fix 304 polling handling; test disconnect/reconnect, multiple tabs, two helpers and Tier 3 real SMB without weakening conflict requirements.
5. **P1 data and recovery:** reject invalid restores before history mutation; interruption-safe restore; cross-session/cross-machine verification.
6. **P1 UX/accessibility:** truthful save states, dirty-close warning, special-character search, hidden-focus exclusion, correct ARIA state; NVDA mixed-language audit.
7. **P1 images/performance:** valid JPEG/PNG/WebP at required boundaries through at least 15 MiB; establish latency targets and test over real SMB.
8. **P2 packaging/compatibility:** restore executable QA assets, unify version metadata, clean-workstation proof and actual Edge 95 VM validation.

Every repair must begin with the registered failing reproduction, add a deterministic regression where feasible, use an isolated worktree/branch, preserve persisted-file proof, receive independent diff review and never merge automatically.

