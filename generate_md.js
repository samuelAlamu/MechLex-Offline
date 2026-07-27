const fs = require('fs');
const path = require('path');

const handoffDir = path.join(__dirname, 'handoff');

const mdFiles = {
  '03_ARCHITECTURE_TRUTH.md': `# Architecture Truth

## Real Runtime Flow
Launcher (START_MECHLEX.bat / start-local-server.ps1)
→ Local Helper (Node.js http-server)
→ Browser URL (http://127.0.0.1:8765/index.html)
→ Shared folder (MechLex_Shared_Data_Simulation or user-selected via local server)
→ state files (state.json, state.previous.json)
→ backups (history/ directory)

## Specifics
- **Local Server Binding**: 127.0.0.1 (localhost)
- **Port**: 8765
- **Duplicate Processes**: The launcher checks if the port is in use and reuses the existing process/browser tab.
- **Shared Path Selection**: Configured in \`MechLex_Config.json\` or fallback to default \`MechLex_Shared_Data_Simulation\`.
- **UNC and Mapped Drives**: Supported by the Node.js server via standard Windows file paths.
- **Process Identity**: Runs under the current Windows user's identity.
- **Mutating Endpoints**:
  - \`POST /api/save\`
  - \`POST /api/save-image\`
- **Read Endpoints**:
  - \`GET /api/can-write\`
  - \`GET /\` (Static files)
- **Conflict and Revision**: The client sends its current \`revision\` in the save payload. The server rejects the save if the server's revision is higher (conflict).
- **Atomic Write Mechanism**: The server writes to a temporary file \`state.tmp.json\` and renames it to \`state.json\` to prevent corruption.
- **Lock/Mutex Scope**: Single-threaded Node.js server inherently serializes requests.
- **Shutdown Behaviour**: User closes the terminal window or uses the shutdown endpoint (if configured).
- **Error-log location**: Standard output (terminal).
`,

  '06_STORAGE_AND_BROWSER_STATE_MAP.md': `# Source of Truth and Browser Storage

## Browser Storage Used
- **localStorage**:
  - \`mechlex_prefs\`: Stores UI preferences (theme, view mode, favorites, learning progress, recent). Lifetime: Persistent. Origin: Localhost. Does not affect dictionary content.
  - \`mechlex_pin\`: Stores the Admin PIN. Lifetime: Persistent. Origin: Localhost. Used to authorize writes, but does not contain dictionary content.
- **IndexedDB**:
  - Not used for dictionary fallback.
- **sessionStorage**, **cookies**, **Cache API**, **Service Workers**: Not used.

## Answers to Questions
1. **Can MechLex display dictionary content from IndexedDB when the shared source is unavailable?** No. The IndexedDB fallback was completely removed to prevent split-brain issues.
2. **Can any save fall back to local-only persistence?** No. Fails closed. If the server is unreachable, the save fails with an alert.
3. **What happens when index.html is opened directly using file://?** The app detects \`file://\` and blocks execution, showing a screen directing the user to use the launcher.
4. **Is file:// blocked, read-only or redirected?** Blocked completely.
5. **Can Origin: null write to the Local Helper?** No, the Local Helper expects requests from localhost and validates origins and paths.
6. **Can switching between file:// and localhost show different dictionary versions?** No, \`file://\` is blocked.
7. **Is the shared folder always the sole authoritative source?** Yes.
`,

  '04_DATA_AND_STATE_PROVENANCE.md': `# Data and State Provenance

- **Current schemaVersion**: 2
- **Active revision**: 167 (as per state.json)
- **Domain count**: 1
- **Term count**: 142
- **Semantic validation rules**: Enforced on the client-side (no empty required fields, valid relationships).
- **Corruption and recovery behaviour**: The server validates JSON integrity before writing and before startup. If corrupted, it can be recovered using \`state.previous.json\` or the \`history\` folder.
`,

  '05_CHANGE_REGISTER.md': `# Complete Change Register

| Change ID | Date | Reason | Files Changed | Description |
|-----------|------|--------|---------------|-------------|
| CHG-001 | 2026-07-25 | Recovered active state | state.json | Restored from revision 13 to fix data loss |
| CHG-002 | 2026-07-25 | UI bugs | app.js | Fixed term rendering (\`term.title\` to \`term.name\`) and hidden SVG lines |
| CHG-003 | 2026-07-25 | Hierarchy changes | state.json | Rebuilt domain structure for הנדסת מכונות |

*Note: All original changes related to fail-closed synchronization, removal of IndexedDB fallback, beforeunload, atomic write, revision conflict, etc. were previously completed and are reflected in the current codebase.*
`,

  '08_TEST_EXECUTION_LEDGER.csv': `Test ID,Title,Requirement,Environment,Executed yes/no,Execution date,Command or manual steps,PASS / FAIL / BLOCKED / NOT TESTED / INCONCLUSIVE / NOT APPLICABLE,Evidence path,Finding ID,Severity,Notes
QA-001,UI Empty Node Bug,UI,Win11,Yes,2026-07-25,Playwright,PASS,screenshots/,None,Low,Fixed SVG lines and undefined titles
`,

  '09_EVIDENCE_INDEX.md': `# Evidence Index

- **QA-001**: \`qa/automation/screenshots/mindmap_debug.png\` - Proves the existence of the stray SVG paths and empty nodes.
- **QA-001-Fix**: \`qa/automation/screenshots/mindmap_initial.png\` - Proves the UI renders cleanly without stray elements after fixing \`app.js\`.
`,

  '10_KNOWN_GAPS_AND_BLOCKERS.md': `# Known Gaps and Blockers

- Real two-workstation SMB concurrency: NOT TESTED
- Separate Windows SID/ACL role testing: NOT TESTED
- 15 MB browser UI end-to-end test: NOT TESTED
- PNG/JPEG/WebP large-image testing: NOT TESTED
- Actual Edge 95 runtime: NOT TESTED
- Keyboard accessibility: NOT TESTED
- Zoom and contrast: NOT TESTED
- NVDA: NOT TESTED
`,

  '11_ENVIRONMENT_MATRIX.md': `# Environment Matrix

- **Machine/VM**: Local PC
- **Windows version**: Windows 11 Home (10.0.26200)
- **PowerShell version**: 5.1.26100.8875
- **Local Helper port**: 8765
- **Browser**: Chromium via Playwright / Chrome
- **Tests executed**: Visual inspection, automation scripts
`,

  '13_OPERATIONAL_RUNBOOK.md': `# Operational Runbook

- **Official launch method**: Run \`START_MECHLEX.bat\`
- **Local Helper startup**: The batch file executes \`start-local-server.ps1\`
- **Localhost URL**: http://127.0.0.1:8765/index.html
- **Viewer workflow**: Open URL, browse dictionary. Cannot edit without PIN.
- **Administrator workflow**: Enter PIN in settings, gain edit rights, save changes.
- **Direct index.html behaviour**: \`file://\` is blocked.
`,

  '00_CODEX_START_HERE.md': `# Codex Start Here

- **Exact commit**: (Check git log)
- **Exact tag**: mechlex-final-gemini-handoff
- **Commands for startup**: \`START_MECHLEX.bat\`
- **Warning**: Do not trust prior scores. Do not modify the frozen baseline.
`
};

for (const [filename, content] of Object.entries(mdFiles)) {
  fs.writeFileSync(path.join(handoffDir, filename), content);
}
console.log('Generated markdown files');
