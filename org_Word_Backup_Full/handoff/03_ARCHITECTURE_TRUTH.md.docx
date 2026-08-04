# Architecture Truth

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
- **Shared Path Selection**: Configured in `MechLex_Config.json` or fallback to default `MechLex_Shared_Data_Simulation`.
- **UNC and Mapped Drives**: Supported by the Node.js server via standard Windows file paths.
- **Process Identity**: Runs under the current Windows user's identity.
- **Mutating Endpoints**:
  - `POST /api/save`
  - `POST /api/save-image`
- **Read Endpoints**:
  - `GET /api/can-write`
  - `GET /` (Static files)
- **Conflict and Revision**: The client sends its current `revision` in the save payload. The server rejects the save if the server's revision is higher (conflict).
- **Atomic Write Mechanism**: The server writes to a temporary file `state.tmp.json` and renames it to `state.json` to prevent corruption.
- **Lock/Mutex Scope**: Single-threaded Node.js server inherently serializes requests.
- **Shutdown Behaviour**: User closes the terminal window or uses the shutdown endpoint (if configured).
- **Error-log location**: Standard output (terminal).
