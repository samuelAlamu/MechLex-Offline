# Current Findings

| ID | Title | Severity | Status |
|---|---|---|---|
| F-001 | No actual term images exist for auto-match testing | MAJOR | OPEN |
| F-002 | images/catalog.js is dead code (not loaded by HTML) | MINOR | OPEN |
| F-003 | Stale .tmp file in shared data directory | MINOR | OPEN |
| F-004 | OpenOrCreate used for lock file (not state.json) — acceptable | INFORMATIONAL | RESOLVED |
| F-005 | Empty catch block in /api/can-write (line 399) swallows errors | MAJOR | OPEN |
| F-006 | catch{} in outer request loop (line 564) swallows inner errors | MINOR | OPEN |
| F-007 | QA workspace copies contain old hardcoded port 8765 URLs | INFORMATIONAL | ACKNOWLEDGED |
| F-008 | Embedded data (mechlex-data.js) used before sync could become stale | MAJOR | OPEN |
| F-009 | PIN validation is client-side only | MAJOR | BY DESIGN (Simple Team Mode) |
| F-010 | settings including PINs stored in shared state.json | CRITICAL | OPEN |
| F-011 | Restore points stored in localStorage (limited scope - not dictionary) | MINOR | BY DESIGN |
| F-012 | 304 polling response causes ERR_ABORTED in modern Edge (Goal 1 finding G1-SYNC-01) | CRITICAL | OPEN |
| F-013 | Documentation does not describe Simple Team Mode | MAJOR | OPEN |
| F-014 | No package.json or test runner exists | MAJOR | OPEN |
| F-015 | Edge 95 compatibility untested at runtime | MAJOR | BLOCKED |
| F-016 | Multi-workstation SMB behavior untested | CRITICAL | BLOCKED |
| F-017 | False save success possible if shared-sync publish fails before rollback | CRITICAL | OPEN (inherited from G1-SEC-07) |
| F-018 | file:// mode blocks sync but embedded data still renders as functional dictionary | MAJOR | OPEN (inherited from G1-SEC-01) |
| F-019 | Test term מאמץ does not exist as exact standalone term; embedded data has מאמץ נורמלי | MAJOR | OPEN |
| F-020 | State.json contains corrupted/forensic copies in shared directory | INFORMATIONAL | OPEN |

## Detailed Findings

### F-001: No actual term images exist for auto-match testing
**Severity:** MAJOR
**Status:** OPEN
**Description:** The `images/` directory only contains an SVG icon and documentation. Real term images are needed to test the auto-matching logic correctly.

### F-002: images/catalog.js is dead code (not loaded by HTML)
**Severity:** MINOR
**Status:** OPEN
**Description:** The file `images/catalog.js` exists but is not referenced in `index.html`. It should be removed to avoid confusion, since the dynamic API `/api/image-catalog` is used instead.

### F-003: Stale .tmp file in shared data directory
**Severity:** MINOR
**Status:** OPEN
**Description:** Stale `.tmp` files (e.g. `state.31256...tmp`) were observed in the shared data directory, indicating failed atomic writes that weren't cleaned up.

### F-004: OpenOrCreate used for lock file (not state.json) — acceptable
**Severity:** INFORMATIONAL
**Status:** RESOLVED
**Description:** The use of `OpenOrCreate` is limited to the lock file, which is an acceptable concurrency strategy and does not affect the actual `state.json`.

### F-005: Empty catch block in /api/can-write (line 399) swallows errors
**Severity:** MAJOR
**Status:** OPEN
**Description:** An empty `catch` block prevents debugging of file system permission errors during the write probe.

### F-006: catch{} in outer request loop (line 564) swallows inner errors
**Severity:** MINOR
**Status:** OPEN
**Description:** A general `catch` in the request processing loop makes it harder to identify server crashes.

### F-007: QA workspace copies contain old hardcoded port 8765 URLs
**Severity:** INFORMATIONAL
**Status:** ACKNOWLEDGED
**Description:** Some QA scripts refer to `localhost:8765`, which may fail if the server auto-binds to a higher port.

### F-008: Embedded data (mechlex-data.js) used before sync could become stale
**Severity:** MAJOR
**Status:** OPEN
**Description:** If sync fails or is slow, the user sees initial data from `mechlex-data.js`, which may be outdated compared to the shared network drive.

### F-009: PIN validation is client-side only
**Severity:** MAJOR
**Status:** BY DESIGN (Simple Team Mode)
**Description:** Access control relies purely on client-side JS checking the PIN. Accepted risk in Simple Team Mode.

### F-010: settings including PINs stored in shared state.json
**Severity:** CRITICAL
**Status:** OPEN
**Description:** `state.json` contains plain-text PINs (1234, 9999). This allows any read-access user to discover the admin PINs.

### F-011: Restore points stored in localStorage (limited scope - not dictionary)
**Severity:** MINOR
**Status:** BY DESIGN
**Description:** Local backup points are in localStorage. Not a flaw for preferences, but dictionary history should be server-side.

### F-012: 304 polling response causes ERR_ABORTED in modern Edge (Goal 1 finding G1-SYNC-01)
**Severity:** CRITICAL
**Status:** OPEN
**Description:** A polling bug causing network failures in Edge due to mishandled 304 Not Modified responses.

### F-013: Documentation does not describe Simple Team Mode
**Severity:** MAJOR
**Status:** OPEN
**Description:** Project documentation is out of date and lacks explanation of the new Simple Team Mode constraints.

### F-014: No package.json or test runner exists
**Severity:** MAJOR
**Status:** OPEN
**Description:** The project lacks formal dependency management and automated testing, limiting QA capabilities.

### F-015: Edge 95 compatibility untested at runtime
**Severity:** MAJOR
**Status:** BLOCKED
**Description:** The target production environment is Edge 95, but testing is currently running on modern versions.

### F-016: Multi-workstation SMB behavior untested
**Severity:** CRITICAL
**Status:** BLOCKED
**Description:** We cannot confidently assert that file-locking and atomic writes work over SMB without a multi-client test environment.

### F-017: False save success possible if shared-sync publish fails before rollback
**Severity:** CRITICAL
**Status:** OPEN (inherited from G1-SEC-07)
**Description:** A race condition exists where the UI reports "Saved" before the server confirms the PUT request.

### F-018: file:// mode blocks sync but embedded data still renders as functional dictionary
**Severity:** MAJOR
**Status:** OPEN (inherited from G1-SEC-01)
**Description:** Running from `file://` fails to sync but masks the failure by serving the embedded data.

### F-019: Test term מאמץ does not exist as exact standalone term; embedded data has מאמץ נורמלי
**Severity:** MAJOR
**Status:** OPEN
**Description:** Search test cases fail because the exact term "מאמץ" doesn't exist, only "מאמץ נורמלי".

### F-020: State.json contains corrupted/forensic copies in shared directory
**Severity:** INFORMATIONAL
**Status:** OPEN
**Description:** Stale or broken copies of `state.json` were found during forensic inspection of the shared directory.
