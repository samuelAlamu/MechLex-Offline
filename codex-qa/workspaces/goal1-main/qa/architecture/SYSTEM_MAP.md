# MechLex 10.1.0 — System Map

## Executable path

```text
START_MECHLEX.bat
  -> powershell.exe core/start-local-server.ps1
  -> loopback HTTP server on 127.0.0.1:8765 (or nearby port)
  -> index.html
  -> data/mechlex-data.js
  -> images/catalog.js
  -> app.js
  -> core/integrity.js
  -> core/persistence.js
  -> core/shared-sync.js
  -> core/inline-editor.js
  -> core/boot.js
  -> init()
```

The script order is exact and was verified against `index.html`. The application is vanilla HTML/CSS/JavaScript, but organizational operation is not serverless: `file://` disables shared synchronization, while normal operation requires the PowerShell loopback server.

## Runtime components

| Component | Responsibility | Key risk |
|---|---|---|
| `app.js` | Global state, search, rendering, UI, roles, CRUD, exports | 3,947-line monolith; globally callable privileged functions |
| `core/integrity.js` | CRUD validation and reference cleanup | Runs only on paths that call the wrapped global functions |
| `core/persistence.js` | IndexedDB, localStorage mirror, backups, restore points | Local state can diverge from shared truth |
| `core/shared-sync.js` | Polling, whole-snapshot publish, revision conflict | 304/Fetch aborts; no merge of independent edits |
| `core/start-local-server.ps1` | Static files and shared-state API | Local server is mandatory; weak schema validation |
| `core/inline-editor.js` | Super Admin visual editing | Authorization depends on mutable browser state |
| `data/mechlex-data.js` | Embedded fallback catalog | 4 domains, 8 terms; not automatically authoritative |
| external `state.json` | Intended shared source of truth | Current configured file is an unsigned schema-1 performance fixture |

## Current authoritative-path reality

`SHARED_DATA_PATH.txt` resolves to:

`C:\Users\samue\Documents\Projects\Active\MechLex_Shared_Data_Simulation`

The active `state.json` is not a valid schema-2 `MechLexSharedState`. It has no format, revision or checksum and contains 2,000 terms under `subtopics[].items`, a location ignored by the current client normalizer. The preserved `state.previous.json` is revision 13, schema 2, app 10.1.0 and has a valid checksum.

## External dependencies

- No active CDN, remote API, analytics or remote font dependency was found.
- Loopback HTTP and PowerShell are required for the supported shared workflow.
- External links may be present in rich content, but are not runtime dependencies.

## Version and release artifacts

- Runtime: 10.1.0.
- `CHANGELOG_HE.txt`: starts with 10.1.1.
- Installation guide: 9.6.1.
- Initial backups: app version 9.5.0.
- Documented `package.json`, `tests/` and `MANIFEST_SHA256.txt` are absent from the runnable folder.

