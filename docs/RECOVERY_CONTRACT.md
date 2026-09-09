# Local recovery contract — R1 inventory, 2026-09-08

Status: R1A input/identity safeguards and rollback verification plus R1B.1 consistent export snapshot implemented; R1 is not complete. Format remains `travelos.local-export.v1`, schema remains 23. This is a logical JSON export, not an encrypted database image or a full media backup.

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
- Validation errors identify the problem class, not private titles, IDs or field contents. Secret/environment values are never backup content. See the final configuration opt-out correction below for the development-tooling boundary.

## Evidence and limits

Node tests cover malformed/duplicate graphs, scalar corruption, direct-call preflight, post-request input mutation, UTF-8 byte limits, repeated restore and late injected SQL failure. The rollback test compares every non-internal SQLite table before/after failure and retries successfully.

Android: an isolated `com.travelos.app.hardening` fixture exercised successful round-trip, duplicate rejection, injected failure after replacement began, AI-off preservation and successful retry through Expo SQLite. The native file picker rejected a synthetic document containing a null traveler before restore. The fixture trip was cleaned, the synthetic Downloads file deleted, and the temporary route removed. The original app/database was untouched.

## R1B.1 snapshot boundary and evidence

The export collector instantiates the existing repository classes on one transaction-scoped reader, never the global repository registry. The read-only adapter rejects write/initialization/nested-transaction methods. All hydration queries share that connection. File serialization, filesystem writes and sharing occur after the transaction closes. Sequential per-trip collection avoids launching unbounded concurrent work; it does not establish large-archive performance readiness. The connection-scoped behavior follows [Expo SQLite SDK 57 transaction guidance](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/#withexclusivetransactionasynctask).

Node tests use real repository classes and SQLite (only the native singleton is replaced by a fail-on-use sentinel). A second WAL connection commits trip/traveler/day/booking changes after the first trip read; the export retains the earlier coherent graph, and the next collection sees the new one. Empty export writes no records. A linked-entity fixture including budget/foreign expense/explicit FX, stays, runtime, media URI and Travel Book links survives export/restore without field loss. Injected late read failure returns no snapshot and the next attempt succeeds.

Android rehearsal used actual Expo SQLite scoped transactions and a separate temporary database: concurrent committed trip/booking changes, two bookings for one stop, failure/retry and restore round-trip passed. That database was closed/deleted and the temporary route removed. No original user database was replaced. Full Profile successful file picking/sharing remains a separate gate.

## R1B.2 continuation evidence — 2026-09-09

Semantic preflight additionally rejects unknown durable fields, unsupported enums/Travel DNA interests, malformed currency codes and wall clocks, invalid recorded timestamps, and conflicting Memory/Runtime day–stop pairs. Supported legacy booking wall/absolute times are preserved rather than normalized. Historical descriptive `contract` metadata is ignored as authority (including old `restoreAvailable: false`); it is not durable trip data. Explicit allowlists need updates alongside future domain fields. Current coverage is not proof that all historical malformed databases can export successfully.

Restore commit and subsequent list refresh have separate outcomes. A refresh failure after commit produces a successful-restore warning with reopen guidance, not a replacement retry. Tests cover ordered success, SQL failure/no refresh, and refresh failure/no second replacement. Broader cache/notification reconciliation remains open.

Android Profile export opened the system share sheet; it was cancelled without sharing externally. The exact generated synthetic JSON was transferred to Downloads to make it selectable. The system picker, Profile replacement confirmation and successful restore were exercised. After force-stop and development-client reconnection, the original trip title, stop ID, explicit booking link and USD currency persisted. This is a successful local-file recovery rehearsal, not a cloud share-target delivery test. No original user database was replaced. The fixture trip was deleted, with zero remaining trips asserted in the previously empty isolated app; its export, matching picker cache copy (SHA-256 equality), Downloads file and temporary route were removed. Another pre-existing picker cache file was intentionally retained.

## Remaining R1B.2 work / release gates

### Final local verification — 2026-09-09

After a successful replacement, retained routes remount through a session generation; trip-list, Discover Brief and chat state are cleared. Superseded list reads and pre-restore chat responses cannot restore old session content. Notifications receive a fresh reconciliation pass even when an older pass is active; failures are reported as post-commit refresh warnings. Profile's synchronous operation gate spans the picker, confirmation and replacement, preventing overlapping export/restore actions. Native picker cancellation released its busy overlay without a database write.

The isolated Android test database was first inspected read-only: one exact synthetic trip, two days, one synthetic missing-photo reference, all other affected canonical tables empty. The real restore runtime remounted the test screen, advanced the generation and produced matching restored SQLite/list state. Cold relaunch passed schema 23, persistence self-test and bootstrap; the restored trip was visible. Missing-photo fallback displayed honestly without changing its stored URI. No release APK was rebuilt and iOS was not tested.

A representative archive with 1,000 extra stops (1,428,459 UTF-8 bytes) preserved every generated ID, order and note through Node SQLite replacement; standalone preparation/migration/restore took approximately 180 ms on this host. This is not Android latency or peak-memory evidence. Full suite: 442 passing tests.

Configuration review found that the custom config loader ignored Expo's dotenv opt-out; earlier config evaluation therefore did not guarantee no env-file access. It now checks `EXPO_NO_DOTENV=1` before filesystem access, backed by a sentinel test. No secret values were output or copied. Subsequent Metro runs used the opt-out with a non-secret placeholder and the unchanged installed native configuration.

### Outstanding gates

R1B.2 progress: `prepareLocalDataBackupText` validates the exact pretty-printed JSON and UTF-8 size before the runtime creates a directory or writes a file. Both directions support at most 8 MiB; no truncation or automatic splitting. The export writer uses a locally generated filename timestamp. Profile discloses unencrypted private data and unavailable photo-file portability. Tests cover boundary bytes (including multibyte/escaped text), unchanged output, invalid links and v1 files without packing preserving wall/absolute booking times. Android synthetic native write/read and no-write rejection passed; the temporary file and route were cleaned. This establishes size/preflight symmetry, not exhaustive semantic restorable-data coverage.

1. Benchmark large-archive collection time/memory and extend edge-case fixtures; consistency is now covered, not unlimited size/performance.
2. Expand domain/legacy compatibility fixtures and validate evolution of the current enum/field allowlists, currencies/time policies and optional entities. Current checks are not a complete schema for every field or every historical database.
3. Extend rich round-trip/media metadata coverage and verify supported share-target delivery/retrieval when a target is explicitly selected. Native Profile local-picker replacement and cold relaunch now pass; no external recipient was used.
4. Larger-than-8-MiB backup/package support remains unavailable. Output-size symmetry is implemented; memory/latency benchmarking and complete semantic coverage are still needed before claiming every supported graph is recoverable.
5. Extend verification to real reminder delivery, native failure-injected notification reconciliation and confirmation cancel/repeated-action stress. Session remount/list agreement, operation-gate unit cases and native picker cancellation now pass; these are not an exhaustive concurrent mutation rehearsal.
6. Supported JSON/photo-reference disclosure and missing-file UX are implemented; portable photo bytes and iOS/device coverage remain unavailable. A JSON restore is never a complete photo backup.
