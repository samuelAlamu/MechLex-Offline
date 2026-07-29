# AUTOMATIC_IMAGE_STATUS

## Technical Report: Automatic Image Matching

1.  **Image catalog generated in:** `/api/image-catalog` endpoint in `start-local-server.ps1` lines 404-424. Also `fetchImageCatalog()` in `app.js` lines 64-73.
2.  **Generation timing:** Dynamically on every GET request to `/api/image-catalog`. Browser fetches once at init (line 3969).
3.  **Helper scans real images directory:** YES — `Get-ChildItem -LiteralPath (Join-Path $Root "images") -File` (line 413)
4.  **Endpoint:** `/api/image-catalog` — GET only
5.  **Side-effect free:** YES
6.  **Supported extensions:** `.jpg`, `.jpeg`, `.png`, `.webp`, `.svg` (line 412)
7.  **Filename normalization:** Browser uses `normalizeText()` which applies NFKD normalization and strips Hebrew diacritics for stem comparison (`app.js` line 2150)
8.  **Hebrew filename URL encoding:** `encodeURIComponent(safeName)` (`app.js` line 2149)
9.  **Priority order:**
    1.  `term.imageData` (base64 embedded — checked first in loadTermImage, line 2200)
    2.  `term.imageName` (explicit admin-set name — first in requestedNames array)
    3.  `term.name` (Hebrew term name — second in requestedNames)
    4.  `term.visualTitle` (third in requestedNames)
    *Note: term code and nameEn are NOT checked.*
10. **Multiple matches:** All candidates collected, tried sequentially with fallback on error (lines 2207-2219)
11. **No match:** Shows `missingImageMarkup()` placeholder (lines 2136-2137)
12. **Image added after startup:** NOT automatically detected — browser fetches catalog only once at init. Server would return updated catalog on next request, but no re-fetch mechanism exists after init.
13. **Image replaced:** Same issue — stale browser cache possible. No cache-busting mechanism.
14. **Browser cache invalidation:** NONE implemented. No query-string versioning, no ETag, no Cache-Control varies.
15. **Auto-matched image requires state.json change:** NO — auto-matching is purely catalog-based, not stored in state.json
16. **Survives browser restart:** YES — if server is running, `fetchImageCatalog()` runs again on init
17. **Second isolated session:** YES — same mechanism
18. **Fully offline:** If helper is running, YES. Via `file://`, NO (fetch to `/api/image-catalog` fails)
19. **Hebrew filenames:** YES — filename matching uses normalization; URL uses `encodeURIComponent`
20. **15 MiB valid image:** The server serves files via `ReadAllBytes` with 35MB body limit. Browser rendering untested.

## Test Result for מאמץ:

Status: **BLOCKED / INCONCLUSIVE**

**Reasons:**
1.  The exact term "מאמץ" does not exist as a standalone term in the embedded data. The closest is "מאמץ נורמלי" (MEC-001).
2.  No actual image files exist in the `images/` directory (only `mechlex-icon.svg` and README files).
3.  No runtime test was executed.
4.  The auto-match logic WOULD work for "מאמץ נורמלי" if a file named `מאמץ נורמלי.jpg` existed in `images/`, because `imageCandidatesForTerm` checks `term.name` which is "מאמץ נורמלי" and does stem normalization.
5.  The test as specified (exact term "מאמץ" with exact file "מאמץ.jpg") cannot pass because the term doesn't exist with that exact name.
