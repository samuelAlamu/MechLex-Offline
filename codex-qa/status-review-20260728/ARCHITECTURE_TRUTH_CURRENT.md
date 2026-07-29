# Architecture Truth (Current)

## Launcher
- BAT file (`START_MECHLEX.bat`) launches PowerShell with in-memory script execution
- Uses `-ExecutionPolicy Bypass` and reads `core\start-local-server.ps1` via `Get-Content -Raw` then `Invoke-Command`
- No EXE launcher exists

## PowerShell Helper
- Custom HTTP server binding to `127.0.0.1` only (loopback)
- Default port 8765, auto-discovers next available port (8766-8785)
- Detects existing MechLex instance via `/api/server-path` and reuses if same root
- Simple Team Mode enabled (`$SimpleTeamMode = $true`)

## Shared Data Path Resolution
1. `-SharedDataPath` parameter
2. `$env:MECHLEX_SHARED_DATA_PATH` environment variable 
3. `SHARED_DATA_PATH.txt` first non-comment line (currently: `..\MechLex_Shared_Data_Simulation`)
4. Fallback: `MechLex_Shared_Data_Simulation` under project root
- Resolved path: `C:\Users\samue\Documents\Projects\Active\MechLex_Shared_Data_Simulation` (EXISTS)
- Creates `$SharedRoot` and `history` subdirectory on startup via `New-Item -Force`

## API Routes
| Route | Methods | Purpose | Side-effect free? |
|---|---|---|---|
| `/api/server-path` | Any | Returns root path for identity check | Yes |
| `/api/shared-health` | GET, HEAD | Health, mode, state existence, writable | Yes (calls write probe internally but cleans up) |
| `/api/can-write` | GET | Role and write capability check | Yes (temp probe file created and deleted) |
| `/api/image-catalog` | GET | Dynamic scan of images/ directory | Yes |
| `/api/shared-state` | GET, HEAD, PUT | Read/write shared state | PUT modifies state.json atomically |
| Static files | GET, HEAD | Serves files under project root with path boundary check | Yes |

## Browser Architecture
- `index.html` loads: `data/mechlex-data.js` (embedded base catalog), `app.js`, `core/integrity.js`, `core/persistence.js`, `core/shared-sync.js`, `core/inline-editor.js`, `core/boot.js`
- NOTE: `images/catalog.js` is NOT loaded by index.html — it exists as dead/unused file
- `app.js` provides core UI, search, rendering, admin PIN dialog
- `core/shared-sync.js` wraps `saveAll` and `init` to add shared-folder sync
- `core/persistence.js` provides save coordination, restore points (in localStorage)
- `core/boot.js` coordinates startup

## Data Source of Truth
**INTENDED**: Shared folder `state.json` via helper server
**IMPLEMENTED**: Shared folder is authoritative WHEN helper is connected and state exists
**OBSERVED RISK**: On first load before sync, `app.js` initializes from `window.MECHLEX_SHARED_DATA` (embedded `mechlex-data.js`) or `localStorage` or `sampleData()`. `shared-sync.js` then overwrites with server state. But if sync fails, the embedded/localStorage data remains active.

## PIN Workflow
- PINs checked client-side only: Content Admin = 1234, Super Admin = 9999 (defaults in `settings`)
- After PIN match, browser checks `/api/can-write` to verify server-side write permission
- Server `/api/can-write` checks folder writability AND `Test-MechLexRole`
- In Simple Team Mode, `Test-MechLexRole` always returns `$true` for Admin/Editor
- Result: PIN → client role unlock → server confirms write access → admin panel opens

## Save Workflow
- `saveAll()` wrapped by `shared-sync.js` → detects change → `queuePublish()` → PUT to `/api/shared-state`
- Server validates: origin, method, headers, JSON, schema version, semantic validation, role, revision conflict
- Atomic write: temp file → flush → File.Replace → history copy
- On conflict (409): rollback to committed snapshot, toast error
- On failure: rollback, switch to read-only mode

## Image Discovery
**INTENDED**: Automatic filename matching from image catalog
**IMPLEMENTED**:
- Server: `/api/image-catalog` dynamically scans `images/` directory each request
- Browser: `fetchImageCatalog()` called at init → populates `IMAGE_CATALOG` Set
- `imageCandidatesForTerm(term)` checks: `term.imageName`, `term.name`, `term.visualTitle` against catalog using stem/extension matching
**OBSERVED GAP**: `images/catalog.js` (static file with empty arrays) is NOT loaded by HTML — correct behavior since dynamic API is used instead. However, `images/` directory currently contains only `mechlex-icon.svg` and documentation files — no actual term images exist.

## Mismatches Between Intended and Observed
1. `images/catalog.js` exists but is dead code (not loaded)
2. No actual term images exist in `images/` directory for testing auto-match
3. localStorage still stores restore points and preferences (not dictionary data when sync active)
4. Embedded `mechlex-data.js` still loaded and used as initial data source before sync
5. Stale `.tmp` file found in shared data simulation directory (`state.31256...tmp`)
