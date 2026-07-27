# Performance and Capacity

## Browser

- Cold start observed: approximately 0.85 seconds in the isolated QA workspace.
- Responsive layouts at 390px and 768px had no horizontal overflow in tested views.
- Browser UI persisted and decoded 1MB, 3MB and 5MB fixtures.
- The accumulated 8MB UI path timed out/aborted.

## Direct shared API image round-trip

| PNG size | PUT | GET |
|---:|---:|---:|
| 1MB | 196ms | 338ms |
| 3MB | 318ms | 938ms |
| 5MB | 499ms | 2,311ms |
| 8MB | 1,040ms | 3,979ms |
| 10MB | 1,203ms | 4,474ms |
| 15MB | 2,085ms | 9,084ms |

The 15MB Base64 state was approximately 20,973,825 bytes. The browser client has a fixed 5,000ms timeout, so the server-level PASS does not translate to an end-to-end PASS.

**Capacity decision:** FAIL for the required 15MB end-to-end case.

