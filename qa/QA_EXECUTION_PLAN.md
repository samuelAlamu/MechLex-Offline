# MechLex 10.1.0 — QA Execution Plan

Date: 2026-07-25  
Audit mode: Pass A — independent audit and reproduction  
Production-code mutation: prohibited  
Primary specification: `MechLex_Codex_Goal_Driven_QA_Master.md`

## Scope and preserved baseline

- Audit the supplied `MechLex_Visual_Admin_Fork` folder as version 10.1.0 / schema 2.
- Preserve SHA-256 hashes of every supplied file before QA assets are added.
- Keep production behavior unchanged. All generated tests, copies, logs, screenshots and reports live under `qa/` or `.logs/`.
- Use disposable copies for writes, failure injection, restore tests, path moves and concurrency.
- No upload, cloud service, remote API or Internet dependency will be introduced.

## Available environment

- Windows 11 Home 64-bit, build 26200.
- Microsoft Edge 150.0.4078.83.
- Google Chrome 150.0.7871.182.
- Bundled Node.js and Python runtimes supplied by Codex.
- Local PowerShell loopback server and a local simulated shared folder.

## Missing or limited prerequisites

- Actual Microsoft Edge 95 is not installed. Static compatibility checks will run, but UX-001 remains NOT TESTED without an Edge 95 environment.
- No second physical workstation, SMB/UNC server, mapped network drive, restricted Windows account or organizational ACL set was supplied.
- Six workstation roles will be simulated with isolated browser contexts and separate loopback server processes where feasible; this is not equivalent to six physical machines over SMB.
- Long network outage/latency and true power-loss tests can only be simulated on disposable local copies.
- A representative non-technical external tester is unavailable; UX-010 and REC-014 can only receive an auditor walkthrough, not independent-user proof.

## Isolated test copies

- `qa/workspaces/baseline-preserved`: immutable audit copy of supplied production files.
- `qa/workspaces/normal`: normal functional and browser tests.
- `qa/workspaces/concurrency-a` and `qa/workspaces/concurrency-b`: independent app copies sharing one disposable state folder.
- `qa/workspaces/destructive`: corruption, read-only, missing-file, lock and restore tests.
- `qa/workspaces/moved-path`: renamed/deep-path portability checks.

The shared-folder simulation will use isolated app copies and server processes with a common disposable shared-state directory. Browser profiles/contexts will be separate so they do not share IndexedDB, localStorage or in-memory state.

## Workstreams

1. Main QA orchestrator: baseline, harness, evidence, browser execution, regression gate, scoring and final decision.
2. Architecture review: entry points, modules, data flow, offline references, Edge 95 static risk and maintainability.
3. Persistence/security review: atomicity, conflict handling, stale state, permissions, backup and failure handling.
4. UX/performance review: RTL/LTR, accessibility, responsive behavior, image limits, search/startup and documentation contradictions.

Independent reviewers are analysis-only and may not change production files.

## Repository-specific commands

```powershell
# Syntax
node --check app.js
node --check core\boot.js
node --check core\integrity.js
node --check core\persistence.js
node --check core\shared-sync.js
node --check core\inline-editor.js
node --check data\mechlex-data.js
node --check images\catalog.js

# Local runtime
powershell -NoProfile -ExecutionPolicy Bypass -File .\core\start-local-server.ps1 -NoBrowser

# Critical regression gate created by this audit
powershell -NoProfile -ExecutionPolicy Bypass -File .\qa\scripts\run-critical-regression.ps1
```

## Evidence convention

- Baseline: `qa/evidence/baseline/`
- Hashes: `qa/evidence/hashes/`
- Command logs: `qa/evidence/commands/`
- Runtime and console logs: `qa/evidence/logs/`
- Browser screenshots: `qa/evidence/screenshots/`
- Persistence/concurrency diffs: `qa/evidence/diffs/`
- Performance results: `qa/evidence/performance/`
- Recovery artifacts: `qa/evidence/recovery/`

Every test matrix row records status, date, environment, evidence path, linked finding and limitation. PASS requires executed evidence. Missing environments are NOT TESTED.

## Release gates

- Baseline preserved and inventory complete.
- Startup and normal content workflows run locally with no external request.
- Shared-state write is durable, checksummed, revisioned and readable from a second isolated process.
- Concurrent stale writes do not silently overwrite current state.
- Read-only/locked/corrupt/interrupted scenarios fail safely without false success.
- Viewer/Expert/Super Admin boundaries match both UI behavior and the documented OS trust boundary.
- Images at 1, 3, 5, 8, 10 and 15 MB are accepted, persisted/reopened and measured, or a clear critical failure is registered.
- Backup is validated and restored into a clean copy with semantic comparison.
- Browser workflows cover desktop, 100/125/150% zoom equivalents, 390/768/1440 widths, keyboard and RTL/LTR.
- Static Edge 95 risks are reported; actual Edge 95 remains a separate mandatory gate.
- Final reports include all scores, Top 10 risks, Top 20 improvements and an explicit GO / GO WITH CONDITIONS / NO GO decision.

## Stop and escalation rules

Any silent loss/overwrite, false-save confirmation, Viewer persistent write, broken clean restore, malformed authoritative state, active Internet dependency or failure of the required 15 MB image is immediately registered as Blocker/Critical. Testing continues only on disposable copies and only while a materially distinct safe experiment remains.
