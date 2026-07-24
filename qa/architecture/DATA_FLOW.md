# Data Flow

## Startup

1. `data/mechlex-data.js` creates the embedded fallback catalog.
2. `app.js` builds initial state from localStorage/fallback data.
3. `core/persistence.js` opens IndexedDB and may replace the local state with its newest local snapshot.
4. `core/shared-sync.js` calls `/api/shared-health` and `/api/shared-state`.
5. Any returned `shared.data` array is normalized and replaces the local catalog.
6. The shared snapshot is mirrored back into IndexedDB/localStorage.

## Normal shared save

```text
User edit
  -> global CRUD function
  -> integrity wrapper
  -> saveAll()
  -> local IndexedDB/localStorage save
  -> shared-sync snapshot of all data + settings + uiText
  -> PUT /api/shared-state with expectedRevision
  -> server lock
  -> validate only shared.data is an array
  -> temp file
  -> File.Replace / File.Move
  -> state.previous.json + history
  -> revision/checksum response
```

The server rejects stale revisions with 409. In 20 executed concurrent API rounds, exactly one writer won and one received 409. This prevents silent last-write-wins, but independent edits are not merged; one user must repeat the rejected change.

## Read/refresh

The client polls every 1.5 seconds with `knownRevision`. When unchanged, the server sends HTTP 304. Edge 150 reports these requests as `net::ERR_ABORTED`; the client catch path can mark the source unavailable/read-only. This makes refresh state unstable even on the same machine.

## Images

- External image: filename/path in the term, actual bytes under local `images/`.
- Embedded image: Data URL in the term object, copied into every local/shared snapshot and JSON backup.
- External images are not included in shared snapshots or JSON backups.
- A 15MB PNG becomes roughly 20MB in Base64. The server round-trip succeeded, but the GET took 6.9–9.1 seconds, exceeding the client's 5-second request timeout.

## Backup and restore

- Export builds a JSON payload and triggers a browser download.
- New exports have a checksum; bundled initial backups do not.
- Full-admin JSON includes data/prefs/settings but not external image files.
- Browser restore first creates a local restore point, normalizes the JSON and calls `saveAll`.
- If the shared source is corrupt/unreachable before sync initializes, restore can succeed only locally and cannot repair the authoritative shared file.

