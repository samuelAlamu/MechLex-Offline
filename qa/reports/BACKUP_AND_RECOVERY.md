# Backup and Recovery

## Passed

- A newly generated Full Admin backup included integrity metadata.
- The backup restored in a second isolated browser context.
- The server retains previous/history snapshots and uses atomic replacement.
- The preserved revision 13 checksum was independently validated.

## Failed or incomplete

- Bundled initial backups are unsigned.
- Full JSON backup does not include external image files.
- Download status does not prove that a file exists or is restorable.
- Browser restore may repair only local state when shared sync is unavailable.
- No clean-machine disaster restore including images was completed.
- No real SMB/network/power failure recovery was tested.

## Safe recovery prerequisite

Before restoring revision 13:

1. Stop all MechLex server/app instances.
2. Copy the complete shared directory to a new dated location.
3. Hash active, previous and history files.
4. Restore only through a logged script that keeps the current active file.
5. Re-read the result from a second process and validate checksum/schema.

This action was intentionally not performed during QA because it overwrites active shared state.

