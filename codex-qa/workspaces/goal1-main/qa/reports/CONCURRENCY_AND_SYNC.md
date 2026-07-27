# Concurrency and Synchronization

## Confirmed controls

- 12 API checks passed.
- 20 concurrent stale-write rounds each produced one HTTP 200 and one HTTP 409.
- No malformed shared-state file was observed.
- Malformed JSON and invalid checksum writes were rejected.
- The state was restored and verified after destructive QA cases.

## Release blockers

- Different-record concurrent changes do not both survive; the whole-snapshot model rejects one writer.
- There is no conflict UI that preserves and merges the rejected edit.
- HTTP 304 polling is surfaced as an aborted request in Edge.
- Before the first successful shared sync, saves can fall back to local persistence.
- An incorrect/missing path may be initialized, creating a second data island.

The API protects against silent last-write-wins corruption, but the product does not yet provide a safe multi-user editing experience.

