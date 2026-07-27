# Persistence and Locking

## Positive controls verified

- IndexedDB is the primary local store; localStorage is a bootstrap mirror.
- Shared PUT includes `expectedRevision`.
- The server uses an exclusive lock file.
- Writes use a temporary file followed by `File.Replace`/`File.Move`.
- A previous copy and up to 30 history files are retained.
- Shared records written by the server include a checksum.
- Twenty concurrent stale-write rounds produced one 200 and one 409 each time; no malformed file was observed.
- Malformed JSON and an invalid checksum produced HTTP 500 and did not silently initialize empty data.

## Release-blocking weaknesses

1. `Read-State` validates checksum only when one exists. Unsigned or wrong-schema state is accepted.
2. PUT validates only that `shared.data` is an array; no format/schema/domain/term semantic validation occurs.
3. Startup auto-creates a missing shared folder and auto-publishes a new initial source, permitting split-brain from a mistyped path.
4. Before the first successful shared connection, `saveAll` may keep edits locally even while the UI says shared storage is read-only.
5. Polling 304 responses are seen by Edge as aborted Fetch requests.
6. A queued snapshot is not permanently bound to its base revision; a remote poll can change `sharedRevision` while a stale snapshot waits.
7. `File.Replace` is followed by history copy/cleanup in the same success path. If archival work fails after replacement, the client can receive 500 although the main state changed.
8. True UNC/SMB atomicity, lock semantics, power loss and two-machine cache visibility were not tested.

## Configured shared-source evidence

| File | Status |
|---|---|
| `state.json` | SHA-256 `648647f7...fd7`; unsigned schema 1 performance fixture; unsafe |
| `state.previous.json` | SHA-256 `d6097871...ce6`; revision 13/schema 2/app 10.1.0; checksum valid |
| history revision 14 | Schema 1 admin test record with one empty domain; not a valid recovery target |
| leftover `.tmp` | Evidence that cleanup is incomplete after at least one prior failed operation |

No source file was repaired or replaced during this audit.

