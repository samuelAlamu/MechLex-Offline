# Goal 1 catalogue source analysis

Scope: read-only/static audit of the frozen Goal 1 version. No historical result is promoted to Goal 1 PASS.

## Authoritative original catalogue

The authoritative title-bearing source is:

`C:\Users\samue\Downloads\MechLex_Gemini_Comprehensive_QA_Audit_Prompt.txt`

- Size: 89,621 bytes
- SHA-256: `cb0ff2dbded77875cffd8f902a84d509502803b928939db5422f37df96f7eb95`
- It contains exactly 107 title rows, 107 unique IDs, and 107 unique ID/title pairs.
- IDs are contiguous within their named families:
  - OFF: 10
  - SYNC: 15
  - CNT: 12
  - SRCH: 10
  - IMG: 12
  - AUTH: 8
  - REC: 14
  - CACHE: 6
  - PERF: 10
  - UX: 10
- Total: 107.

The repository file `qa/QA_TEST_MATRIX.csv` also has exactly the same 107 IDs (SHA-256 `16577ae6ebf590c7df713822b26187b753f968bba5c29207ce9d745c95de6d4e`), but it has no title column. It is therefore a historical result matrix, not the authoritative title source. Its statuses must not be inherited as Goal 1 results.

The same 107 title-bearing specification is reproduced in `C:\Users\samue\Downloads\MechLex_Codex_Goal_Driven_QA_Master.md`. The comprehensive prompt is the earlier, focused source and is used for canonical titles; comparison found the same ID/title sequence.

## Legitimate RV catalogue

`qa/MechLex_Gemini_Post_Remediation_Deep_QA_v3.md` is the authoritative RV source:

- Size: 43,174 bytes
- SHA-256: `5d1f51e407e0b3d99c748f70ffc98472ad98dd11d11b7263ebc3aa7392043d99`
- Exactly 59 title rows and 59 unique IDs.
- Families: ARCH-RV 5; STATE-RV 10; AUTH-RV 10; SYNC-RV 10; IMG-RV 10; UX-RV 6; REG-RV 8.
- The `.txt` sibling is byte-identical and is a duplicate representation, not another 59 cases.

The RV specification explicitly says these cases are additional to, not replacements for, the original 107. Semantic overlap therefore creates traceability links, not deletion.

## Post-remediation case

`handoff/08_TEST_EXECUTION_LEDGER.csv` contains one distinct post-remediation case:

- `QA-001` — `UI Empty Node Bug`
- SHA-256 of ledger: `57516d20582a3735177497b1170d74aff137915ac2494ce14bd919cc8d0b951d`

This case is retained as a catalogue row because it names a specific fixed visual regression not represented by an identical ID/title elsewhere. Its historical PASS is only an investigation lead.

## New H0-derived cases

Thirteen cases are defined in `H0_DERIVED_CASES.csv`. They convert the pre-registered H0 leads into frozen-version acceptance tests. They are retained where the required observation boundary is materially distinct even if an original or RV case is related.

## Deduplication rules and exact count

1. Deduplicate exact ID within the same authoritative suite.
2. Treat byte-identical `.md`/`.txt` representations as one suite.
3. Preserve all original 107 IDs and titles.
4. Preserve all 59 RV IDs because their own specification declares them additive.
5. Preserve `QA-001` once; do not count its screenshots, scripts, matrix mentions or report mentions as cases.
6. Add an H0 case only where it has a distinct required boundary/result (for example file-mode reload authority, route-by-route Origin behavior, or persisted-file effects of `can-write`).
7. Similar intent is cross-referenced, not merged, when separate environments or persistence observations are required.
8. Generated `ML-###`, finding IDs (`F-*`), handoff contradictions (`HC-*`), scripts, matrix rows and observations are not tests unless backed by an authoritative title/procedure.

Exact recommended Goal 1 catalogue count:

`107 original + 59 RV + 1 post-remediation + 13 H0-derived = 180 unique cases`.

This is the catalogue count, not an executed count and not a PASS count.

## Conflicts resolved

- The handoff's claimed 108 executed PASS cases is not a catalogue authority. Its ledger contains only `QA-001`.
- The historical matrix contains 107 rows but omits titles; titles are recovered from the original comprehensive prompt without changing IDs.
- The two RV files are byte-identical, so counting both would incorrectly add 118 rather than 59.
- `QA-001` is not the 108th original case; it is a distinct post-remediation case.
- H0 observations are not auto-findings or PASS results. Their new cases require independent Goal 1 execution/evidence.

## Environments that remain required/blocked

- Actual Edge 95 in an isolated VM.
- Two separate Windows machines or VMs over a real SMB share (tier 3).
- Separate Windows principals with controlled group/SID and ACL matrices.
- NVDA runtime.
- GitHub authenticated access if remote privacy/push claims are tested.
- The real organizational shared folder is prohibited; destructive/persistence cases must use guarded disposable shares.

