# MechLex — Git and Build Identity Report

**Report Date:** 2026-07-28T21:17:25+03:00

## Repository Identity

| Property | Value |
|---|---|
| Repository Path | `c:\Users\samue\Documents\Projects\Active\MechLex_Visual_Admin_Fork` |
| Active Branch | `qa/remediation-9-5-plus` |
| HEAD Commit | `8a0c0dd979e16ba6ffce16168bd497681250ec40` |
| Parent Commit | `d995565f0cfccc96cecd0216e9c5a3381a952fa8` |
| HEAD Subject | `chore: update word backups` |
| HEAD Date | 2026-07-27 14:26:33 +0300 |
| Tags | `mechlex-final-gemini-handoff`, `mechlex-goal1-no-go-baseline`, `mechlex-pre-qa-hierarchy-2026-07-25`, `mechlex-pre-qa-remediation-2026-07-25` |
| Remote | `origin → https://github.com/samuelAlamu/MechLex-Offline.git` |
| Remote Visibility | GitHub — privacy unverified from this environment |
| Tracked Modifications | None |
| Staged Modifications | None |
| Untracked Files | None |
| Working Tree Status | **Clean** |

## Local Branches

| Branch | Current |
|---|---|
| `codex/goal2-remediation-9-5` | |
| `main` | |
| `qa/goal1-remediation` | |
| `qa/remediation-9-5-plus` | ✓ |

## SHA-256 Hashes of Production Files

| File | SHA-256 |
|---|---|
| `app.js` | `BFBF2E8E5308C22AF67B4A43752DBF67A7AADC7DB4EC99A29B30C2F96EE50AE1` |
| `core/start-local-server.ps1` | `D0E75B6660188B74C8C0BE38DDDFC9507A68AEEBEA167829D6069988BA25891D` |
| `START_MECHLEX.bat` | `B8EC74ED6259372EE00D97AB77678901527D9275BB7685514B43C563759D1463` |
| `index.html` | `57F74F841EA57C8CEA4A17C1EE01BBC9618CE872DFF8492011D4CE4FF6646BDC` |
| `style.css` | `7E507AF3ADB81DEC5C3BB6D8C63B70999BBC22EF8F7E85907BC2E64E3C5FCB38` |

## Build Identity Confirmation

The build being tested matches this report. Working tree is clean with no modifications.

## QA Workspace Note

The `codex-qa/workspaces/` directory contains 8+ frozen workspace copies from prior Goal 1 audit work. These copies (e.g., `concurrency-a/`, `frozen-tag/`, `goal1-main/`) contain **older, pre-fix versions** of production files including the hardcoded `http://127.0.0.1:8765/api/can-write` in `app.js`. These are historical snapshots, NOT the current production code.
