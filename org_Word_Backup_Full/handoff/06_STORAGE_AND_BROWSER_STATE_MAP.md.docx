# Source of Truth and Browser Storage

## Browser Storage Used
- **localStorage**:
  - `mechlex_prefs`: Stores UI preferences (theme, view mode, favorites, learning progress, recent). Lifetime: Persistent. Origin: Localhost. Does not affect dictionary content.
  - `mechlex_pin`: Stores the Admin PIN. Lifetime: Persistent. Origin: Localhost. Used to authorize writes, but does not contain dictionary content.
- **IndexedDB**:
  - Not used for dictionary fallback.
- **sessionStorage**, **cookies**, **Cache API**, **Service Workers**: Not used.

## Answers to Questions
1. **Can MechLex display dictionary content from IndexedDB when the shared source is unavailable?** No. The IndexedDB fallback was completely removed to prevent split-brain issues.
2. **Can any save fall back to local-only persistence?** No. Fails closed. If the server is unreachable, the save fails with an alert.
3. **What happens when index.html is opened directly using file://?** The app detects `file://` and blocks execution, showing a screen directing the user to use the launcher.
4. **Is file:// blocked, read-only or redirected?** Blocked completely.
5. **Can Origin: null write to the Local Helper?** No, the Local Helper expects requests from localhost and validates origins and paths.
6. **Can switching between file:// and localhost show different dictionary versions?** No, `file://` is blocked.
7. **Is the shared folder always the sole authoritative source?** Yes.
