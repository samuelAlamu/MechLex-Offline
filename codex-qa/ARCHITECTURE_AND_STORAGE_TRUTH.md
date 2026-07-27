# Goal 1 architecture and storage truth

## Actual runtime closure

`START_MECHLEX.bat` → Windows PowerShell 5.1 `core/start-local-server.ps1` → loopback `TcpListener` → local static assets and API → configured shared filesystem/SMB directory.

Immutable normal assets:

`START_MECHLEX.bat`, `core/start-local-server.ps1`, `SHARED_DATA_PATH.txt`, `index.html`, `style.css`, `data/mechlex-data.js`, `images/catalog.js`, `images/mechlex-icon.svg`, `app.js`, `core/integrity.js`, `core/persistence.js`, `core/shared-sync.js`, `core/inline-editor.js`, `core/boot.js`.

Conditional assets: `core/recovery-wizard.ps1`, `state.json`, `state.previous.json`, `.mechlex-state.lock`, `history/state-r*.json` and referenced JPEG/PNG/WebP images.

Host dependencies are Windows PowerShell/.NET, a browser, and filesystem/SMB access. Node and Playwright were QA-only and are not product runtime dependencies. No Internet/CDN/cloud dependency was observed.

## Configuration and endpoints

Shared path precedence is: explicit `-SharedDataPath` → `MECHLEX_SHARED_DATA_PATH` → `SHARED_DATA_PATH.txt` → sibling `..\MechLex_Shared_Data`.

| Endpoint | Actual role |
|---|---|
| `GET /api/shared-health` | Health/identity response |
| `GET /api/can-write` | Capability response, but currently opens/creates `state.json` before returning |
| `GET /api/shared-state` | Reads authoritative state; known-revision path may return 304 |
| `PUT /api/shared-state` | Whole-state mutation with revision conflict check |
| other GET/HEAD | Static project files |

Loopback binding was proven. Unexpected Host was accepted on health; Origin rejection was narrower and endpoint-specific.

## Actual dictionary copies and behavior

| Location | Observed role |
|---|---|
| Shared `state.json` | Contractual authority and normal helper source |
| Browser IndexedDB | Browser mirror/fallback implementation path |
| `mechlex_v6_data` LocalStorage | Full dictionary copy and functional authority in `file://` mode |
| Embedded `data/mechlex-data.js` | Bootstrap/sample dictionary |

`file://` rendered a functional 4-domain/8-term dictionary. After LocalStorage injection, reload reported source `local`; the injected dictionary survived restart of the same Edge profile. It did not create a shared file and was invisible to a clean profile, proving split-brain authority.

In the tested helper-failure save, `saveAll` returned `true`, no file changed, and the mutation was rolled back/lost from memory, LocalStorage and IndexedDB. Therefore the broader H0 lead “remains only in memory” was not reproduced, but false success without durability was.

## Actual roles

| Layer | Roles/authority |
|---|---|
| Client UI | Viewer, Content Expert, Super Admin; PIN/client state controls UI |
| Helper | Viewer, Editor, Admin from process token/group checks or `MECHLEX_MOCK_ROLE` |
| Filesystem/SMB | Helper process SID plus share/NTFS ACL |
| Recovery | Separate PowerShell/filesystem authority |

There is no proven authenticated mapping from client role/PIN to helper SID or SMB authority. Client PIN receives zero durable-authorization credit. Viewer direct PUT was denied 403, yet Viewer `GET /api/can-write` created `state.json`.

Detailed line-level map: [ARCHITECTURE_AND_TRUTH_MAP.md](evidence/goal1/catalogue-architecture/ARCHITECTURE_AND_TRUTH_MAP.md). Dependency inventory: [RUNTIME_DEPENDENCY_CLOSURE.csv](evidence/goal1/catalogue-architecture/RUNTIME_DEPENDENCY_CLOSURE.csv).

