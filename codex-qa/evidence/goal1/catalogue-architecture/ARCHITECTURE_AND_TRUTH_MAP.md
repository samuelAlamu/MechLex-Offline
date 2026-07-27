# Frozen-version architecture and source-of-truth map

This is an independent static verification. Runtime observations from H0 remain investigation leads until separately executed in Goal 1.

## Runtime chain and closure

`START_MECHLEX.bat:4` starts `powershell.exe` with `core/start-local-server.ps1`.

The server declares `[System.Net.IPAddress]::Loopback` at line 10 and constructs `System.Net.Sockets.TcpListener` at line 305. This proves the implementation technology and intended bind address statically; it does not replace a runtime socket/listener observation.

Normal immutable closure:

1. `START_MECHLEX.bat`
2. `core/start-local-server.ps1`
3. `SHARED_DATA_PATH.txt`
4. `index.html`
5. `style.css`
6. `data/mechlex-data.js`
7. `images/catalog.js`
8. `images/mechlex-icon.svg`
9. `app.js`
10. `core/integrity.js`
11. `core/persistence.js`
12. `core/shared-sync.js`
13. `core/inline-editor.js`
14. `core/boot.js`

Conditional closure: `core/recovery-wizard.ps1`; configured `state.json`, `state.previous.json`, `.mechlex-state.lock`, `history/state-r*.json`; dynamically referenced JPEG/PNG/WebP images.

Host dependencies: Windows PowerShell 5.1/.NET, installed browser, and filesystem/SMB access. Node/Playwright are QA-only and are not reached by the product launcher or HTML imports.

## Configuration precedence

`core/start-local-server.ps1:13-31` implements:

1. `-SharedDataPath`
2. `MECHLEX_SHARED_DATA_PATH`
3. root `SHARED_DATA_PATH.txt`
4. sibling default `..\MechLex_Shared_Data`

The path is normalized with `GetFullPath`. This is not proof that aliases resolve to the same physical target; the H0 guard performs stronger canonical safety checks outside production.

## Endpoint map

- `/api/shared-health`: branch begins line 325.
- `/api/can-write`: branch begins line 342.
- `/api/shared-state`: branch begins line 360.
- All other allowed GET/HEAD requests are handled as static files under the project root.

`/api/can-write` opens `state.json` with `FileMode.OpenOrCreate` at line 350 before role evaluation at lines 352-354. Therefore a nominally read-only capability query contains a filesystem mutation path.

`/api/shared-state` PUT classifies settings changes as Admin and content changes as Editor at lines 418-432. Helper authority is derived from `MECHLEX_MOCK_ROLE` or Windows group/built-in Administrator membership at lines 254-266. There is no token/session binding from the client UI role or PIN to that decision.

Origin checking accepts a missing Origin and otherwise only exact loopback origins on the active port (`start-local-server.ps1:249-250`). Static inspection found no Host allowlist. The route placement means Goal 1 must test Origin/Host separately for every endpoint and method.

## Write, lock and history

- Exclusive lock file uses `OpenOrCreate`, read/write, `FileShare.None` (line 191) with bounded retry in the surrounding function.
- Temporary state uses `CreateNew` (line 226).
- Writer and file stream are flushed, including durable `Flush(true)` (lines 229-230).
- Successful state rotation copies history and retains the newest 30 entries (lines 242-245).
- Replacement/rotation behavior must still be validated under interruption and SMB; static primitives do not prove cross-machine correctness.

## Browser truth map

- `index.html:16-17,693-699` loads only local CSS/JS assets.
- `app.js:48` defines dictionary LocalStorage key `mechlex_v6_data`.
- `app.js:810-821` explicitly selects `local`, `legacy-local`, embedded or sample data.
- `core/persistence.js:15` detects `file:` mode.
- `core/persistence.js:222-255` writes the complete dictionary to LocalStorage in file mode and labels storage `file-localStorage`.
- `core/persistence.js:36-172,273-287` implements IndexedDB and a LocalStorage fallback.
- `core/shared-sync.js:241-247` treats file mode as a valid branch rather than blocking or redirecting.
- `core/shared-sync.js:98` labels successful helper data `shared-folder`; line 104 maintains a browser mirror.

Thus the code contains three potential dictionary copies: shared `state.json`, IndexedDB, and LocalStorage/embedded data. The contractual authoritative source is only shared `state.json`; Goal 1 runtime tests must determine which copy wins in each startup/failure/restart workflow.

## Role truth map

- UI labels: Viewer, Content Expert, Super Admin (`index.html:638-683`; `app.js:2359-2415`).
- Helper roles: Viewer, Editor, Admin from process identity/groups or environment override (`start-local-server.ps1:254-266,348-354`).
- Filesystem authority: the helper process token and share/NTFS ACL.
- Recovery authority: separate PowerShell recovery workflow and filesystem access.

No proven server-side relationship maps UI Content Expert/Super Admin state to Windows/SMB authority. Client-side PIN state must receive zero durable-authorization credit.

## Missing proof

Static review cannot prove actual process identity, active socket, file durability after crash, SMB locking across machines, ACL behavior, browser restart behavior, Edge 95 compatibility, or cross-session convergence. Those remain executable or blocked Goal 1 tests, not PASS.

