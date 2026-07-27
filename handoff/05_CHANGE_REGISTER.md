# Complete Change Register

| Change ID | Date | Reason | Files Changed | Description |
|-----------|------|--------|---------------|-------------|
| CHG-001 | 2026-07-25 | Recovered active state | state.json | Restored from revision 13 to fix data loss |
| CHG-002 | 2026-07-25 | UI bugs | app.js | Fixed term rendering (`term.title` to `term.name`) and hidden SVG lines |
| CHG-003 | 2026-07-25 | Hierarchy changes | state.json | Rebuilt domain structure for הנדסת מכונות |

*Note: All original changes related to fail-closed synchronization, removal of IndexedDB fallback, beforeunload, atomic write, revision conflict, etc. were previously completed and are reflected in the current codebase.*
