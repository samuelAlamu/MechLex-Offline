# TWO_FILE_FIX_VERIFICATION

## Verification Requirements

| Requirement | Expected change | Current implementation | File/function | Status | Runtime evidence | Remaining risk |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Simple Team Mode exists** | YES | `$SimpleTeamMode = $true` | `start-local-server.ps1` (line 19) | COMPLETED BUT NOT VERIFIED | None (code inspection only) | None |
| **Simple Team Mode enabled by default** | YES | Set to `$true` | `start-local-server.ps1` | COMPLETED BUT NOT VERIFIED | None | None |
| **Test-MechLexRole no longer requires Windows groups in Simple Team Mode** | YES | Returns `$true` for Admin/Editor when `$SimpleTeamMode` is true | `start-local-server.ps1` (lines 286-288) | COMPLETED BUT NOT VERIFIED | None | Bypasses actual auth checks |
| **PIN 1234 opens Content Admin** | YES | Checks `settings.contentPin \|\| settings.pin \|\| "1234"` | `app.js` (line 2370) | COMPLETED BUT NOT VERIFIED | None | None |
| **PIN 9999 opens Full Admin** | YES | Checks `settings.superPin \|\| "9999"` | `app.js` (line 2370) | COMPLETED BUT NOT VERIFIED | None | None |
| **Incorrect PINs rejected** | YES | `if (providedPin !== expectedPin)` shows error toast | `app.js` (line 2371) | COMPLETED BUT NOT VERIFIED | None | None |
| **Works without Run as administrator** | YES | Simple Team Mode bypasses Windows identity checks | `start-local-server.ps1` | COMPLETED BUT NOT VERIFIED | None | None |
| **/api/can-write uses side-effect-free write probe** | YES | Creates `.mechlex-write-probe.*.tmp`, writes 1 byte, deletes in finally block | `start-local-server.ps1` (lines 262-283) | COMPLETED BUT NOT VERIFIED | None | Orphan files on crash |
| **/api/can-write does not create state.json** | CORRECT | Only calls `Test-SharedFolderWriteAccess` and `Test-MechLexRole` | `start-local-server.ps1` | COMPLETED BUT NOT VERIFIED | None | None |
| **/api/can-write does not change state.json** | CORRECT | Only calls `Test-SharedFolderWriteAccess` and `Test-MechLexRole` | `start-local-server.ps1` | COMPLETED BUT NOT VERIFIED | None | None |
| **Temporary probe files always removed** | YES | `finally` block disposes stream and removes file | `start-local-server.ps1` (lines 277-281) | COMPLETED BUT NOT VERIFIED | None | Process crash between create and finally |
| **app.js uses /api/can-write with relative path** | YES | `fetch("/api/can-write", { cache: "no-store" })` | `app.js` (line 2378) | COMPLETED AND VERIFIED | Source inspection | None |
| **All other browser API calls use relative paths** | YES | `/api/image-catalog`, `/api/shared-state`, `/api/shared-health` | `app.js`, `shared-sync.js` | COMPLETED AND VERIFIED | Source inspection | None |
| **No hidden reference to port 8765 in browser code** | CORRECT | Grep found zero results for `127.0.0.1`, `8765`, `localhost:` | `app.js` | COMPLETED AND VERIFIED | Source inspection | None |
| **Shared-data folder resolution matches deployed folder** | YES | Resolves to `C:\Users\samue\Documents\Projects\Active\MechLex_Shared_Data_Simulation` which exists | `SHARED_DATA_PATH.txt` | COMPLETED AND VERIFIED | None | None |
| **No absent configuration file required** | CORRECT | `SHARED_DATA_PATH.txt` exists and has valid content. Fallback chain works. | Configuration | COMPLETED AND VERIFIED | None | None |
| **No silent alternate data path** | CORRECT | Fallback chain (param -> env -> file -> hardcoded) is explicit | Configuration | COMPLETED BUT NOT VERIFIED | None | None |
| **Normal-user durable editing succeeds** | NOT TESTED | Code path exists: PIN -> can-write -> admin unlock -> save -> PUT | Application flow | COMPLETED BUT NOT VERIFIED | None | Requires runtime test |
| **Read-only or unavailable shared folder blocks editing** | YES | Fail-closed and rollback. Server returns role=Viewer if probe fails. | `shared-sync.js` (lines 276-286) | COMPLETED BUT NOT VERIFIED | None | None |
| **UI reports correct reason for blocked editing** | YES | Toast messages exist | `shared-sync.js` | COMPLETED BUT NOT VERIFIED | None | None |

## Diff Summary: Old vs. New Files

*   **app.js:**
    *   The QA workspace copies (`codex-qa/workspaces/*/app.js`) contain the OLD `app.js` with hardcoded `http://127.0.0.1:8765/api/can-write` at line 2368.
    *   Current production `app.js` line 2378 uses relative `/api/can-write`.
*   **start-local-server.ps1:**
    *   `OpenOrCreate` was previously used for the `can-write` probe on `state.json` (per Goal 1 finding G1-SEC-03).
    *   Current code uses `Test-SharedFolderWriteAccess` with a temporary file probe.
    *   Simple Team Mode (`$SimpleTeamMode = $true`) was added at line 19.
    *   `Test-MechLexRole` was modified to bypass Windows groups when `$SimpleTeamMode` is true.
