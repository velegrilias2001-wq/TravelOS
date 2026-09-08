# Local recovery contract — R1 inventory, 2026-09-08

Status: R1A input/identity safeguards and rollback verification implemented; R1 is not complete. Format remains `travelos.local-export.v1`, schema remains 23. This is a logical JSON export, not an encrypted database image or a full media backup.

## Coverage observed in code

| Data | Export / replacement behavior |
| --- | --- |
| Trips, destination IDs, origin, preferences, dates, accounting currency | Serialized canonical Trip; restored through existing trip persistence |
| TripDays and TripStops | IDs, ordering, optional location/time/notes and destination/day links retained |
| Bookings and Accommodation | Saved fields and explicit stop/booking links included; sensitive reservation/contact data may be in JSON |
| Budget, items and traveler FX rates | Original currencies/amounts and explicit rates included; no FX inferred by restore |
| Travelers and memberships / owner | Global reusable identities plus per-trip references; inconsistent repeated identity copies now rejected |
| Runtime and lived-stop state | Stored pointers/marks included, not a substitute for derived trip-time truth |
| Memories and Travel Book | Metadata, URI strings and ordered memory IDs included; media bytes are NOT included or recovered |
| Travel DNA and saved Discover ideas | Included and replaced; saved grounded identities must be unique |
| Packing | Included in current exports; older v1 files may omit it, which restores an empty checklist |
| AI / notification preferences | Not exported; existing device choices preserved during replacement |
| Pending import batches / claims | Not exported; review queues are cleared by successful replacement |
| Session-only UI, Discover Brief, editor drafts, caches | Not backed up; not canonical Trip facts |
| Migration recovery archives / schema metadata | Not logical-export content; not wiped by the canonical replacement list |

Existing local media files are not deleted by this JSON restore routine. URI strings do not guarantee availability on a different installation. Missing photo bytes must not be described as recovered media. A portable media package remains a separate design/implementation decision.

## R1A safety boundary

- File selection checks reported size and cached-file size before reading, then checks decoded UTF-8 size before JSON parsing. Supported maximum is 8 MiB; oversized files are rejected, never truncated.
- Preflight checks expected records/lists, required scalar fields, optional text/coordinate types, finite/nonnegative numeric fields, calendar trip/day dates, positive day/stop order, explicit parent IDs, missing/cross-trip relationships, duplicate canonical identities/positions and inconsistent traveler membership copies. It does not fuzzy-match or repair a malformed file.
- Identity validation permits the same traveler on multiple trips only when the repeated facts agree with the global traveler record. Unknown/missing links fail rather than being cleared silently.
- Multiple distinct bookings may reference the same stop, matching the existing one-to-many relationship. A follow-up regression test and Android restore check caught and removed an overly strict uniqueness check before release; booking IDs remain unique.
- The persistence entry point repeats validation before opening its transaction. It owns a detached serialized copy, so caller mutation while queued cannot change the data being restored.
- The existing exclusive transaction still performs replacement. Rejection before it opens changes nothing; SQL failure inside it rolls back the old canonical graph and privacy preferences.
- Validation errors identify the problem class, not private titles, IDs or field contents. No secret/environment configuration is read or included in this work.

## Evidence and limits

Node tests cover malformed/duplicate graphs, scalar corruption, direct-call preflight, post-request input mutation, UTF-8 byte limits, repeated restore and late injected SQL failure. The rollback test compares every non-internal SQLite table before/after failure and retries successfully.

Android: an isolated `com.travelos.app.hardening` fixture exercised successful round-trip, duplicate rejection, injected failure after replacement began, AI-off preservation and successful retry through Expo SQLite. The native file picker rejected a synthetic document containing a null traveler before restore. The fixture trip was cleaned, the synthetic Downloads file deleted, and the temporary route removed. The original app/database was untouched.

## Remaining R1B work / release gates

1. Replace multi-query export collection with a consistent repository-owned read snapshot; add a concurrent-mutation test. Current export can still mix revisions.
2. Complete semantic validation coverage (all enums, currency/time policies, unsupported additional fields and compatibility fixtures) while preserving supported legacy wall/absolute-time strings. Current checks are not a complete schema for every field.
3. Add rich round-trip fixtures covering all optional entities and media metadata, plus full Profile export/share → native picker → confirmation → replacement rehearsal. The R1A picker test covers rejection, not that whole successful workflow.
4. Resolve oversize export behavior: current exporter has no matching 8 MiB output guard or chunk/package strategy. Do not claim every generated file is restorable until this is closed.
5. Verify workspace/session refresh and notifications after replacement, restore cancellation and concurrent user actions; distinguish committed restore from post-commit UI refresh failure.
6. Finalize explicit media portability/missing-file UX, plaintext-backup disclosure and supported device/platform coverage. No iOS rehearsal in R1A.
