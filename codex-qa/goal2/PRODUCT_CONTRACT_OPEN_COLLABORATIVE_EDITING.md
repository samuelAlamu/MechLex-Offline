# MechLex Product Contract Change: Open Collaborative Edit Mode

**Date:** 2026-07-28
**Phase:** Goal 2 Remediation

## 1. Contract Change Rationale

The product owner has formally modified the MechLex access model. MechLex is used by a very small organization with known and trusted employees. 

The outer security boundary is now the **organizational shared folder itself**. If an employee has file system access to the shared folder and its contents, they are authorized to edit the dictionary.

## 2. Removed Requirements

The following security and authentication mechanisms are **intentionally removed** from the product contract:
- PIN 1234 (Content Admin authentication)
- PIN 9999 (Super Admin authentication)
- `MechLex_Admins` Windows group enforcement
- `MechLex_Editors` Windows group enforcement
- SID-to-role mapping
- Windows Administrator elevation requirements
- "Run as administrator" requirements
- A separate privileged Administration center login

## 3. Approved Replacement Model: Open Collaborative Edit Mode

- **Default State:** Browsing and searching are available. Editing controls are hidden.
- **Entry to Edit Mode:** A clearly visible button "מעבר למצב עריכה" shows a simple confirmation dialog ("You are about to edit the shared organizational dictionary. Changes will be visible to all users after saving."). This is informational, not authentication.
- **Active Edit Mode:** Shows a persistent banner ("מצב עריכה פעיל"), the current shared revision, shared-folder connection state, and optional editor name input.
- **Exit Edit Mode:** A button "יציאה ממצב עריכה".
- **Read-Only Fallback:** If the shared folder is read-only for the user, editing remains disabled and a clear "Read-only" message is shown.

## 4. Retained Data-Integrity Protections

Removing passwords/roles does **not** weaken data integrity. The following remain **mandatory**:
- One authoritative shared state (`state.json`) via Local Helper.
- No LocalStorage/IndexedDB dictionary authority.
- No functional alternate `file://` dictionary mode.
- Atomic durable writes with `File.Replace`.
- `expectedRevision` conflict detection.
- Safe locking.
- Recursive semantic validation of all hierarchy levels.
- Backup history and safe recovery.

## 5. Legacy QA Test Adjustments

Legacy tests designed solely to prove the removed requirements (PINs, Roles, Elevation) are now classified as **NOT APPLICABLE** due to this contract change. 

Unrelated security or data-integrity failures are **not** exempted.

*The full updated test matrix for Goal 2 will replace these legacy tests with new tests for Edit Mode confirmation, normal-user editing, conflict handling, and visual collaborative editing.*
