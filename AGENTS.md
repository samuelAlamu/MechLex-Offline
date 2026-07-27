
# AGENTS.md — MechLex QA operating rules

## Mission
Perform an evidence-based, adversarial QA, repair and release audit of MechLex. The repository and executed tests are the source of truth. Do not optimize for producing reassuring prose.

## Read first
- `CODEX_QA_GOAL.md`
- `MechLex_Codex_Goal_Driven_QA_Master.md`
- project README, change log, version file and launcher
- all source, data, image, backup and prior QA files

## Non-negotiable rules
- Preserve the original baseline and create SHA-256 hashes before destructive work.
- Write QA assets only under `qa/` and `.logs/` unless making a registered patch in an isolated branch/worktree.
- Audit before repair. Reproduce and register a defect before changing production behavior.
- Add a regression test or deterministic reproduction for every repaired defect when feasible.
- Do not weaken tests or product requirements to make results pass.
- Do not add Internet, cloud, remote API, local-server or machine-specific runtime dependencies.
- Treat the shared folder as the stated source of truth and challenge whether the code actually supports that model.
- A UI success message is not proof of persistence. Inspect authoritative files and reopen from another process/workstation.
- Playwright may validate browser workflows, but actual Edge 95 proof requires Edge 95.
- Keep progress and evidence under `qa/` and `.logs/`.
- Never merge automatically into the preserved baseline.

## Parallel work
Delegate independent architecture, persistence/concurrency, security, UX/compatibility, performance/media and recovery investigations to subagents when useful. Give each agent a bounded scope and evidence path. Avoid simultaneous edits to the same files. Use worktrees for repair work.

## Iteration
For each failure: observe, reproduce, register, test first, hypothesize, patch minimally, verify, regress, review, decide and log. Continue while a materially distinct evidence-backed path exists. Stop only with a precise blocker.

## Completion
The Master Goal is complete only when all mandatory release gates are evidenced and the final reports exist under `qa/`. A missing environment is NOT TESTED, not PASS.
# AGENTS.md — MechLex Codex QA and Remediation Rules

## Mission

Bring MechLex to an independently evidenced, organization-ready state. The repository, executed tests, persisted files and target-environment evidence are the source of truth. Prior Gemini/Codex scores and prose are claims, not proof.

## Three-goal workflow

1. Goal 1: audit and score only; no production changes.
2. Goal 2: repair in isolated worktrees with tests and evidence.
3. Goal 3: fresh independent audit of a frozen release candidate; no production changes.

Never combine audit and repair in one baseline. Never use Goal 2’s own conclusions as Goal 3 proof.

## Non-negotiable product contract

- Fully offline: no Internet, cloud, remote API, CDN, analytics or external database.
- A per-workstation Local Helper is allowed and must bind only to `127.0.0.1`.
- The organizational shared folder is the sole authoritative dictionary source.
- Browser storage may hold preferences or clearly labelled drafts only; it may not load or save an alternate authoritative dictionary.
- No silent local fallback when the shared source is unavailable.
- `file://` direct execution must be blocked or redirect-only; it must not open a second functional dictionary.
- Viewer is read-only. Content Expert may change content only. Administrator may perform approved administrative/recovery actions. Enforce at the server/filesystem boundary, not only in JavaScript UI.
- Multiple workstations must not silently overwrite, split, corrupt or indefinitely miss data.
- Required valid image support includes JPEG, PNG and WebP through at least 15 MiB unless the user formally changes the requirement.
- Preserve Hebrew, English, Amharic, mixed RTL/LTR and engineering symbols.
- Preserve actual Edge 95 support as a mandatory requirement until the user formally removes it.
- The UI must support deep mixed hierarchies containing terms and subdomains at the same level.
- Preserve all existing user data and history.

## Safety and Git

- Verify the reported commit and tag before work.
- Preserve a recursive frozen baseline and SHA-256 manifest.
- Destructive tests use disposable data copies.
- Goal 2 patches use branches/worktrees; never patch `main` or the frozen tag.
- Never push state files, backups, logs, user images, PINs, credentials or sensitive dictionary data without explicit approval.
- Do not automatically merge.

## Evidence rules

- UI appearance is not persistence proof.
- A test written but not executed is NOT TESTED.
- API simulation is not a full browser end-to-end test.
- Same-host processes are not cross-machine SMB proof.
- Static compatibility review is not Edge 95 runtime proof.
- Hidden controls, a PIN or `/api/can-write` are not sufficient authorization proof.
- PASS requires command/manual steps, environment, date, version, result and evidence path.
- Keep exact counts and preserve original test IDs.

## Defect loop

Observe → reproduce → register → failing test/reproduction → hypothesis and falsifier → minimal patch in worktree → focused verification → persisted-file inspection → related and critical regression → independent diff review → accept/revise/revert → log residual risk.

Do not repeat an unchanged failed approach. Do not increase timeouts, reduce data sizes, remove assertions or alter acceptance criteria merely to create green results.

## Mandatory independent review

Use specialized subagents or separate threads for architecture, persistence/concurrency, security/roles, UI/accessibility, compatibility/performance and independent code review when available. Parallel agents must not edit the same production files.
