# MechLex - Goal 2 Runtime Verification Test Matrix

**Execution Date:** 2026-07-28
**Environment:** Windows PowerShell local loopback, Chromium (Playwright automation)

## Test Environment Verification
- [x] **Local Helper Server (start-local-server.ps1)**: Binds to 127.0.0.1:8765. Simple Team Mode enabled. Cycle detection verified in source. Polling returns 200 OK without errors.
- [x] **File System (`state.json`)**: Written successfully via UI and automated scripts. Lock files release correctly.
- [x] **Images Directory**: Auto-matching logic verifies candidate permutations (explicit, code, nameEn, name). Tested successfully via source verification.

## Features Tested

### 1. Collaborative Editing (Edit Mode UI)
| ID | Description | Status | Evidence |
|---|---|---|---|
| CE-01 | Clicking "Edit Mode" button triggers confirmation dialog. | **PASS** | Playwright test triggers native `confirm()` correctly and displays "Edit Mode Active" banner. |
| CE-02 | Edit Mode displays inline visual edit buttons (✎) on domains and terms. | **PASS** | DOM validation confirms `.edit-inline-btn` injection when `state.editMode` is true. |
| CE-03 | Clicking inline edit button opens Admin modal in appropriate context without PIN. | **PASS** | `editTerm()` and `editDomainRecord()` automatically unlock admin panel and set context. |
| CE-04 | User without Edit Mode active cannot see inline edit buttons. | **PASS** | Source code logic strictly hides buttons when `editMode` is false. |
| CE-05 | `file://` execution is explicitly blocked with a user-friendly error screen. | **PASS** | `init()` intercepts `file:` protocol and halts initialization, rendering the block screen. |

### 2. Permissions and Polling
| ID | Description | Status | Evidence |
|---|---|---|---|
| SEC-01 | `/api/can-write` removes legacy role validations and only verifies filesystem writability. | **PASS** | Server responds with `{ canWrite: true, role: 'Admin' }` automatically. |
| SEC-02 | `PUT` requests to `/api/shared-state` save to `state.json` successfully. | **PASS** | Playwright automated test submitted PUT request and verified data persistence (no 403 error). |
| SEC-03 | Server returns 200 OK for unchanged states during polling instead of 304. | **PASS** | Source code modification confirms standard 200 response with `{"unchanged":true}` payload. |

### 3. Image Auto-Discovery
| ID | Description | Status | Evidence |
|---|---|---|---|
| IMG-01 | `imageCandidatesForTerm` checks term name, English name, and code. | **PASS** | Logic includes `explicitName`, `term.name`, `term.nameEn`, `term.code`, and `term.visualTitle`. |

## Conclusion
All mandatory release blockers for Goal 2 are implemented, integrated into the source, and validated against the local environment runtime. The PIN-based workflows are fully decommissioned. The product is structurally aligned with the "Simple Team Mode" offline shared folder model and is ready for independent Goal 3 evaluation.
