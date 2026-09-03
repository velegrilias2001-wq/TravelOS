# TravelOS Current State

Snapshot date: 2026-09-03

This file describes verified implementation, not intended behavior. Unknown or unverified capabilities are called out explicitly.

Evidence classes used throughout:

- **Implemented in code** — present in the native repository at HEAD.
- **Automated-test evidence** — covered by committed Node tests. Handoff verification of `npx tsc --noEmit`, `npm test`, and `server` `npm test` is recorded under Testing and release readiness when those commands were run. Device tests are never implied by unit-test evidence.
- **Android/device verified** — claimed only where an earlier milestone recorded an emulator rehearsal. Those claims stop at UX Refinement V1 unless restated.
- **Not re-verified on device** — later milestones exist in git and code, but this pass did not install, launch, or smoke-test a native build. Empty later commit bodies are not treated as device evidence.

## Repository checkpoint

- Current development branch: `docs/expo-sqlite-rehearsal-7-15`
- Branch point: `6987ce3` — chore: add non-interactive ESLint config and baseline CI
- Phase 1 remaining trip-core V1 is implemented on this branch: migration version 16 persists destination `place_id` / `timezone_source`, traveler FX rates with as-of provenance, and an optional trip-owner membership. Timezones are accepted only from a provider result, catalogue handoff, or traveler IANA choice. Foreign expenses enter accounting totals only through an explicit traveler rate. Booking amount and currency must be saved together. Archive remains reversible status; delete remains irreversible on-device. Automated tests exist (258 application tests). No native device rehearsal of version 16. iOS was not exercised.
- Day clock V1 is implemented on this branch: when exactly one TripDay is assigned to a destination with a valid IANA timezone and that timezone’s local date is the day’s date, Companion uses that city as the clock. Two cities claiming today, an unassigned day, or a city without a timezone keep the trip-level or device fallback. Destination order is never a clock. Automated tests exist. No device rehearsal.
- Home day clock V1 is implemented on this branch: Home featured-trip phase uses the same assigned-city clock as Companion, loading TripDays in one batched query. Missing days degrade to trip-level timezone. Zustand still does not own days. An active featured trip shows today’s assigned city when one exists. Automated tests exist. No device rehearsal.
- Stop-boundary refresh V1 is implemented on this branch: while Companion stays open with reliable timing, one timer also fires at the next canonical stop start or end on the current local date. Untimed times are ignored. After the last timed boundary it returns to local midnight. Automated tests exist. No device rehearsal.
- Stop lived phase V1 is implemented on this branch: Companion can mark a planned stop done or skipped without rewriting Plan times. Delayed is derived when a timed stop’s start has passed and the traveler has not marked it. `TripRuntimeState` is written only as a pointer to the last explicit lived stop. Migration version 17. Automated tests exist. No device rehearsal.
- Map day framing + directions V1 is implemented on this branch: Map frames the assigned city and that day’s mapped stops when Companion has a display day. View all still fits every saved destination and stop coordinate. Directions open Apple Maps or Google Maps on the saved pin only. No route, ETA, or accommodation coordinates. Automated tests exist. No device rehearsal.
- Companion plan-change notice V1 is implemented on this branch: when saved trip dates, day city assignment, stops, bookings, or stays change while Companion is already showing that trip, a dismissible notice states that NOW/NEXT and related context follow SQLite. First load, a different trip, done/skipped marks, memories, and clock-only refresh do not claim a plan change. Lived phases are not auto-rewritten. Session-only; not a second durable store. Automated tests exist. No device rehearsal.
- Offline essential context V1 is implemented on this branch: SQLite remains the only durable trip/booking/stay/map-pin cache. `expo-network` 57.0.1 observes reachability; unknown does not claim online or offline. Companion and Map name when facts are on-device, when live tiles/lookup need a network, and when stops have no saved coordinates. Directions still use a saved pin, not a cached route. No offline tiles, no second store, no IP lookup. Automated tests exist. A native rebuild is required; no device rehearsal.
- World planned vs lived V1 is implemented on this branch: World labels destinations planned or lived from explicit done-stop marks plus Day → Destination IDs. Trip.status is no longer the visited filter. A completed trip without done stops stays planned. Skipped stops and unassigned days do not invent a city. Same destination names on different trips stay separate cards. Wishlist is not World history. Automated tests exist. No device rehearsal.
- World archive V1 is implemented on this branch: lived World cards can show memory counts and a saved photo cover when memories attach through explicit day or stop IDs. A note written on a planned city does not become a visit or an archive. Memories without day/stop IDs stay off World. Automated tests exist. No device rehearsal.
- Memory media contract V1 is implemented on this branch: photo copies under `travelos/memories/` are the owned files; gallery originals are never deleted. There is no backup or export. Copies remain available offline. Memory and trip deletion update SQLite first, then best-effort delete owned files. Automated tests exist. No device rehearsal.
- Local-dev AI boundary V1 is implemented on this branch: there is no production AI provider. `EXPO_PUBLIC_TRAVELOS_AI_URL` is used only when it is loopback; a cloud host is ignored. Advice cannot write SQLite or bookings. Unreachable AI still degrades. Automated tests exist. No device rehearsal.
- A 2026-09-03 Pixel 8 pass closed remaining import-extractor, wishlist, journey Create Trip, multi-destination, and Day → Destination device rehearsals on the installed `com.travelos.app` client. Import zip/PDF/Office/image files opened HIGH CONFIDENCE · PENDING reviews without writing bookings. Wishlist saved and then removed Slow days in Porto. Lisbon and Porto prefilling Create Trip with both cities; Trip Details then added Coimbra through the native location picker. Plan assigned Lisbon to Day 1. An isolated `Lisbon` trip (3 Sept 2026) remains on device after delete confirmation was cancelled. iOS was not exercised.
- Expo SQLite Android rehearsal 7–15 is implemented on this branch: the installed Pixel 8 `com.travelos.app` client upgraded through migrations 7–15. Live `PRAGMA user_version` is 15 with Memory `trip_id` / `day_id` / `stop_id` foreign keys. The first upgrade failed because v15 dropped `memories` while v7 itinerary unlink triggers still pointed at that table; the rebuild now drops those guards first. Existing trips remained listed. iOS was not rehearsed.
- Lint / baseline CI V1 remains on the parent history: committed Expo SDK 57 `eslint-config-expo` flat config, a non-interactive `eslint .` lint script, and a GitHub Actions workflow that runs `npx tsc --noEmit`, `npm test`, lint, and the AI server tests on Node 22. Existing React Compiler lint findings stay warnings so the gate does not require rewriting screens. There is still no usable git remote, so the workflow has not run on GitHub.
- Archive coverage V1 remains on the parent history: Node tests cover remaining recovery-archive paths that previously only existed as code. Migration v3 retargets Memory and TripRuntimeState from an archived duplicate day. Migration v5 archives a booking whose stop is missing. Migration v6 archives missing Accommodation booking/stop IDs. Migration v7 archives a Memory whose day and stop IDs are missing. Automated tests exist. No native device rehearsal of the archive tables themselves.
- Memories day/stop FK V1 remains on the parent history: `memories.day_id` and `memories.stop_id` have declared foreign keys (`ON DELETE SET NULL`). Dangling historical IDs are cleared; the Memory is kept. Travel Book memberships survive the table rebuild. Same-trip ownership remains in the existing v7 triggers. Migration version 15. Automated tests exist. An Android Pixel 8 Expo SQLite rehearsal on 2026-09-03 reached live `user_version = 15` after the unlink-trigger drop fix.
- Stop-day same-trip V1 remains on the parent history: a TripStop day must belong to the same trip. Invalid historical mismatches are archived and the stop is deleted so Booking unlinks can run; stop content is kept in the archive, not moved onto another trip. Migration version 14. Automated tests exist. Version 14 ran on the same Android upgrade path; no separate stop-mismatch fixture was planted on device.
- TripRuntimeState integrity V1 remains on the parent history: optional `current_day_id` / `current_stop_id` must belong to the same trip, and a stop must belong to the assigned day when both are set. Invalid historical links are archived and cleared. Deleting a day or stop unlinks the reference instead of deleting the runtime row. Migration version 13. Stop lived phase V1 now writes this row only as a last explicit lived-stop pointer. Automated tests exist. Version 13 ran on the same Android upgrade path; lived progress itself was not rehearsed on device.
- Trip list batch read V1 remains on the parent history: listing trips loads destinations and traveler memberships in two batched queries instead of repeating those reads per trip. Home, Trips, World, Profile, and Import share that list. Automated tests exist. An Android Pixel 8 development-build rehearsal on 2026-09-02 reloaded the existing `com.travelos.app` client from Metro and opened Home, Trips, World, and Profile. Import was not opened in that pass.
- Memory / Travel Book workspace invalidation V1 remains on the parent history: Memories create/edit/delete and Travel Book save/delete go through TripWorkspace actions that invalidate and reload the shared aggregate. More and other Trip Space tabs cannot remain stale after those writes. Missing or cross-trip records fail closed. Automated lifecycle tests exist. No native device rehearsal was run for this wiring.
- Day → Destination V1 remains on the parent history: a Plan day can be assigned to an existing trip destination by exact ID, or left unassigned. Companion’s active hero shows today’s assigned city or “City not set for today”. Removing a destination clears day assignments rather than deleting days. Trip destination saves upsert by ID so assignments survive Trip Details. Day clock V1 uses that assignment as a clock only when the city has a valid IANA timezone and is uniquely today. Automated tests exist. An Android Pixel 8 rehearsal on 2026-09-03 assigned Lisbon to Day 1 of an isolated Lisbon–Porto trip; Companion then showed LISBON for that day instead of the combined destination line. The later day-clock resolver was not rehearsed on device.
- Multi-destination authoring V1 remains on the parent history: Create Trip and Trip Details can add, reorder, and remove up to eight real map destinations. A trip cannot drop to zero destinations once it has one. New destinations require a picker selection. Removing a destination does not delete stops, bookings, or stays. Journey extra catalogue cities can prefill Create Trip. Automated tests exist. An Android Pixel 8 rehearsal on 2026-09-03 prefilled Lisbon and Porto from a journey, then added Coimbra through the native location picker on Trip Details.
- Import image-embedded iCalendar V1 remains on the parent history: JPEG, PNG, GIF, and WEBP files yield a calendar only when metadata or file bytes contain a `BEGIN:VCALENDAR` block, including compressed PNG zTXt and text split across chunks. Ticket photos without a calendar fail closed. There is no OCR and no AI parsing of confirmation prose. Automated tests exist. An Android Pixel 8 rehearsal on 2026-09-03 chose `e2e-image-ferry.png` from Downloads and opened review as HIGH CONFIDENCE · PENDING for `E2E Image Ferry` without writing a booking.
- Import Office-embedded iCalendar V1 remains on the parent history: Word/Excel/PowerPoint Open XML packages yield a calendar only when visible text contains a `BEGIN:VCALENDAR` block, including text split across Office runs. Automated tests exist. An Android Pixel 8 rehearsal on 2026-09-03 chose `e2e-office-ferry.docx` from Downloads and opened review as HIGH CONFIDENCE · PENDING for `E2E Office Ferry` without writing a booking.
- Import PDF-embedded iCalendar V1 remains on the parent history: a chosen PDF can yield a calendar only when it actually contains a `BEGIN:VCALENDAR` block, including FlateDecode streams. Confirmation PDFs without a calendar fail closed. Automated tests exist. An Android Pixel 8 rehearsal on 2026-09-03 chose `e2e-pdf-ferry.pdf` from Downloads and opened review as HIGH CONFIDENCE · PENDING for `E2E Pdf Ferry` without writing a booking.
- Import calendar ZIP V1 remains on the parent history: a chosen zip can contain `.ics` files, emails with a calendar part, or mixed non-calendar members. Nested zips are skipped. Extraction feeds the same review queue. Automated tests exist. An Android Pixel 8 rehearsal on 2026-09-03 chose `e2e-zip-ferry.zip` from Downloads and opened review as HIGH CONFIDENCE · PENDING for `E2E Zip Ferry` without writing a booking.
- Import email-wrapped iCalendar V1 remains on the parent history: paste or a chosen file may be a raw `.ics`, UTF-16 calendar bytes, or an email that contains a `text/calendar` part. Extraction feeds the same review queue. An Android Pixel 8 rehearsal on 2026-09-02 chose `e2e-email.eml` from Downloads and opened review as HIGH CONFIDENCE · PENDING without writing a booking.
- Import ICS file picker V1 remains on the parent history: the Import screen can choose a local file through `expo-document-picker` and feed the same review queue as paste. Non-iCalendar files still fail closed. An Android Pixel 8 development-build rebuild on 2026-09-02 autolinked `expo-document-picker` 57.0.1. Choosing `e2e-ferry.ics` from Downloads opened review as HIGH CONFIDENCE · PENDING without writing a booking. Automated tests exist. iOS was not rebuilt.
- Import Review Queue V1 remains on the parent history: local iCalendar paste becomes durable `import_batches` / `import_claims` rows. Claims are not Bookings until the traveler accepts one onto an existing trip. Review lives at `/import/review/[batchId]`. An Android Pixel 8 development-build rehearsal on 2026-09-02 ran the paste → review → accept → delete path.
- Wishlist V1 remains on the parent history: durable `saved_places` rows for grounded Discover destination and journey identities, distinct from Trips and World history. An Android Pixel 8 rehearsal on 2026-09-03 saved Slow days in Porto, opened it under Saved ideas, then removed it back to NOTHING SAVED YET.
- Best time V1 remains on the parent history. An Android Pixel 8 development-build rehearsal on 2026-09-02 verified Home, Discover hybrid results, a live Porto explanation, Create Trip persist/delete, Companion/Plan/Map/Bookings/More, Memories, Travel Book, World, Profile/Travel DNA, and Plan free-time advice. A later same-day Pixel 8 pass also opened Best time, Ready-made journeys, and the empty Saved ideas list without creating or saving anything. A 2026-09-03 pass opened Lisbon and Porto journey detail, prefilling Create Trip with both cities.
- Phase 0A checkpoint: e5ffbb1 — Harden TravelOS persistence and migrations
- Phase 0B checkpoint: 7135262 — Add reactive TripWorkspace lifecycle
- Budget & Expenses checkpoint: 65b7f33 — Add native trip budget and expenses
- Trip Details and More checkpoint: ac21422 — Add native trip details and management hub
- Booking ↔ Stop checkpoint: f6d09c5 — Connect bookings with itinerary stops
- Accommodation checkpoint: cc180f2 — Add canonical trip accommodation flow
- Travelers checkpoint: 3dcb7d8 — Add reusable trip travelers
- Time & Runtime Truth checkpoint: 81c4f20 — Establish canonical trip time and runtime truth
- Companion V1 checkpoint: 97f6a19 — Add deterministic TravelOS Companion
- Canonical Destination Authoring checkpoint: 3ed225c — Add canonical destination authoring
- UX Refinement V1 checkpoint: b5b0bf9 — Complete TravelOS UX refinement V1
- Memories V1 checkpoint: ca0308a — Add Memories V1 with durable media and integrity guards
- Travel Book V1 checkpoint: fc4ca5e — Add Travel Book V1
- Shared trip readiness checkpoint: f135569 — refactor: share trip readiness selection
- Travel DNA V1 checkpoint: 3d780c5 — feat: add Travel DNA V1
- Trip Intent + Pace V1 checkpoint: e22d6ea — feat: add trip intent and pace V1
- Flexible Itinerary / Free Time V1 checkpoint: 2f0fe10 — feat: add flexible itinerary and free time V1
- AI Foundation V1 checkpoint: 27ca9e9 — feat: add AI foundation V1
- Discover Architecture V1 checkpoint: 210f46d — feat: add Discover Architecture V1
- Discover Experience V1 checkpoint: f714127 — feat: add Discover Experience V1
- Cursor handoff checkpoint: 735c964 — chore: complete Cursor project handoff
- Grounded Destination Sourcing V1 checkpoint: bad9d68 — feat: add grounded destination sourcing V1
- The native architecture checkpoint remains ec0b28a — Add native location picker and mapped itinerary stops.
- No Git remote or upstream branch was configured during this snapshot.
- `.env.local` is gitignored. Its contents were not read.

Recent native milestones include the repository/service foundation, native navigation, create trip, itinerary planning, bookings, Google Maps on Android, the location picker, persistence hardening, the shared TripWorkspace lifecycle, Budget & Expenses, Trip Details, explicit Booking ↔ Stop relationships, native Accommodation management, reusable canonical Traveler identities with explicit trip membership, centralized date/time/runtime truth, the first deterministic Companion surface, canonical real-destination selection plus legacy destination upgrades, UX Refinement V1, Memories V1, Travel Book V1, shared trip-readiness selection, Travel DNA V1, trip-specific intent and pace, flexible itinerary free-time/conflict derivation, a local AI foundation for free-time advice, Discover architecture, and Discover Experience V1.

## Stack and runtime

| Area | Verified implementation |
| --- | --- |
| Framework | Expo SDK 57.0.15, React Native 0.86.2, React 19.2.3 |
| Language | TypeScript 6.0.3 with strict checking |
| Navigation | Expo Router 57 |
| Persistence | expo-sqlite 57, local database travelos.db |
| UI/session state | Zustand 5 |
| Maps | react-native-maps 1.27.2 |
| Place selection | expo-location-picker 1.0.2 |
| Network reachability | expo-network ~57.0.1 |
| Native runtime | expo-dev-client development build |
| Native date input | @react-native-community/datetimepicker 9.1.0 |
| Memory media | expo-image-picker, expo-file-system, expo-image |
| Import files | expo-document-picker 57, then the existing iCalendar review queue |
| Optional local AI backend | `server/` Express package (`travelos-ai-server`) with a client `AIAPIClient` |
| Styling | Local design tokens and React Native StyleSheet-based screen styling |

The package currently has start, Android, iOS, web, reset-project, lint, and automated test scripts. Lint uses a committed Expo SDK 57 `eslint.config.js` and `eslint .` (non-interactive). A GitHub Actions workflow exists for typecheck, tests, lint, and AI-server tests. There is still no git remote, so CI has not run on GitHub. There is no EAS configuration.

## Architecture

The codebase has a sensible layered direction:

1. Domain entities define the travel model.
2. Repository interfaces describe persistence operations.
3. SQLite repositories implement those interfaces.
4. Services coordinate aggregate workflows.
5. Zustand holds the global trip-list cache and its loading state; it no longer holds a redundant active-trip snapshot. A separate Discover store holds only a temporary Discover Brief for the current session.
6. A route-scoped TripWorkspace provider owns one ephemeral aggregate snapshot for the active trip and exposes service-backed mutations for trip, stop, booking, accommodation, traveler, and budget writes.
7. Expo Router Trip Space screens render the shared snapshot and mutate it through the provider while SQLite remains authoritative.

TripService builds a TripWorkspace aggregate from the canonical Trip and related records, including memories and the optional Travel Book. Companion, Plan, Map, Bookings, Accommodation, Budget, Travelers, More, Trip Details, Memories, and Travel Book consume one provider above the nested Trip Space tabs instead of maintaining independent durable copies. Successful TripWorkspace actions invalidate and reload that aggregate from SQLite. Focus refreshes are revision-aware, so current data does not trigger an unnecessary database reload. Trip edits and deletion also refresh the Zustand-backed global trip-list cache after SQLite and the workspace have been updated.

Memory and Travel Book writes now go through the same TripWorkspace action/invalidation contract as stops, bookings, accommodations, travelers, and budget. Memories still keep a local list that follows `workspace.memories`. Travel Book drafts follow `workspace.travelBook` and `workspace.memories` instead of issuing a second SQLite read on focus.

Travel DNA is a singleton local profile loaded through `TravelDNAService`. It is not part of the trip aggregate and is not inferred from trip data.

Pure time utilities define calendar dates, local wall-clock values, compatible historical date-times, timezone resolution, and an injectable-clock Trip runtime resolver. Companion and Home derive live phase from those utilities rather than durable workflow status. A pure Companion selector adds transient relevance without creating durable Companion state. Shared `selectTripReadiness` supplies canonical in-range days and preparation counts to Companion. The Companion screen recomputes on focus, foreground return, the exact next resolved local calendar boundary, and the next saved stop start or end, using a calculated timer rather than polling. A session-only plan-change notice names saved itinerary, booking, or stay edits that happen while that surface is already open. SQLite is the offline cache for those facts; `expo-network` only observes reachability and does not copy trip records.

Discover ranking uses a grounded multi-pack corpus plus a session Discover Brief. It does not write candidates into SQLite. A grounded Create Trip handoff uses Expo Router params, not a competing persistence layer.

A read-only `AIContextService` builds a deterministic context snapshot from the trip workspace, Travel DNA, runtime truth, Companion selection, and derived free-time/conflict data. Plan may send that snapshot to a local AI HTTP backend for free-time suggestions. Suggestions are displayed only; they do not become stops unless the traveler later uses the existing stop editor.

## Canonical domain model

Verified domain entities include:

- Trip, including optional trip-specific `intent` and `pace`
- TripDay
- TripStop
- Booking
- Accommodation
- Budget and budget items
- Traveler
- TravelDNA
- Discover Brief / candidate types (session/catalogue, not durable trip rows)
- TripRuntimeState
- Memory
- TravelBook
- SavedPlace (wishlist identity, not a Trip)
- ImportBatch / ImportClaim (review-queue calendar claims, not Bookings)

Entities use explicit IDs. The model distinguishes the trip's accounting currency from destination currency concepts. `Booking.stopId` is the canonical optional relationship to an itinerary stop: each booking has zero or one stop, while each stop can have zero, one, or many bookings. Each Trip has zero or many Accommodations; an Accommodation belongs to exactly one Trip and may link to zero or one Booking and zero or one TripStop. A Booking or TripStop may be referenced by multiple Accommodation records, and every relationship must remain within one Trip. Links are never inferred from names, addresses, or other text.

Trip destinations now have explicit authoring states. A native selection has a stable TravelOS destination ID plus a provider-returned display name, validated latitude/longitude, and optional returned country code, IANA timezone, and local-currency code. Historical name-only destinations remain valid legacy records until the user explicitly upgrades them. The installed native picker returns coordinates and reverse-geocoded place context, but does not expose a stable provider place ID, timezone, or currency; TravelOS does not fabricate those facts.

Traveler identity is independent from Trip. One canonical Traveler may belong to multiple Trips through `trip_travelers`, whose composite primary key prevents duplicate membership. Removing a Traveler from a Trip deletes only that membership. Deleting a Trip cascades its memberships but preserves the reusable Traveler rows. The current planning flow deliberately permits zero Travelers so an unfinished Trip can exist; enforcing an eventual one-or-more party rule remains a product decision tied to Create Trip and owner identity.

Travel DNA is a single local preference profile (`pace`, interests, travel style, budget style, daily rhythm, typical party). V1 stores only user-selected values. It is not a Trip, not copied into a Trip, and not generated by AI. Trip intent and trip pace are optional, trip-specific fields. They are not inferred from Travel DNA.

A Memory belongs to exactly one Trip and may optionally reference a TripDay and/or TripStop by ID. Editable product types are photo and note; `video` remains on the domain type but is not an authoring path in the Memories screen. A Travel Book belongs to exactly one Trip (`trip_id` unique) and contains an ordered list of Memory IDs from that same trip.

Discover types distinguish a session Brief, curated or provider-sourced candidates, and grounded destination facts. AI is not a destination source.

## Time and runtime semantics

- `Trip.startDate`, `Trip.endDate`, and `TripDay.date` are strict `YYYY-MM-DD` calendar dates, not instants. Calendar arithmetic uses date parts and never round-trips them through UTC in a way that can shift the selected day.
- `TripStop.startTime` / `endTime` are optional `HH:mm` local wall-clock values. Accommodation check-in/out and newly entered Booking start/end values are local date-times without an invented timezone or offset.
- Historical Booking values containing `Z` or an explicit offset remain absolute instants and are preserved exactly until intentionally replaced or cleared. Invalid historical values remain visible and untouched during unrelated edits.
- `createdAt` and `updatedAt` remain true ISO timestamp instants.
- Runtime timezone resolution uses a saved valid IANA timezone when one destination supplies it, every saved destination supplies the same one, or exactly one assigned day city is locally today. Missing, invalid, differing trip-level timezones, two cities claiming today, or an unassigned day produce an explicit device-calendar fallback; destination order is never temporal authority.
- The deterministic resolver derives upcoming, active, completed, or unknown phase, the calendar date used, timezone provenance, and an exact current TripDay only when its date matches. Its clock is injectable for boundary tests.
- Durable `Trip.status` remains organizational and cannot override runtime date truth. Persisted `TripRuntimeState` is not required by the resolver. Explicit done/skipped stop progress lives in `trip_stop_lived_states`; `TripRuntimeState` stores only the last traveler-recorded lived stop, never clock-inferred NOW.
- Multi-destination Trips can assign an optional Day → Destination ID. When that city has a valid IANA timezone and is uniquely today in that timezone, Companion uses it as the clock. Otherwise runtime timezone still uses a shared destination timezone or an explicit device-calendar fallback.
- Knowable free-time gaps are derived only between consecutive same-day stops when the earlier stop has a valid end time, the later stop has a valid start time, and itinerary order agrees with those times. TravelOS does not invent free time before the first stop, after the last stop, or across untimed moments.
- Time conflicts are derived only from overlapping known start/end ranges on the same day.

## SQLite and migrations

The database is the current durable source of truth. Verified characteristics include:

- SQLite WAL mode and foreign-key enforcement are enabled.
- The current database version is **17** (`DATABASE_VERSION` in `src/data/database/migrations.ts`).
- The core schema contains 20 tables: trips, trip_destinations, trip_days, trip_stops, travelers, trip_travelers, travel_dna, bookings, accommodations, budgets, budget_items, trip_fx_rates, trip_runtime_states, trip_stop_lived_states, memories, travel_books, travel_book_memories, saved_places, import_batches, and import_claims. Migrations also add recovery archives for reconciled duplicate TripDays, invalid historical Booking ↔ Stop links, invalid historical Accommodation links, and invalid historical Memory / Travel Book links.
- Repository queries use bound parameters.
- Historical version 1 and version 2 migration behavior remains unchanged.
- Migration version 3 converges the accommodation stop relationship and index even when a version-2 database reflects the earlier baseline drift.
- Migration version 3 archives duplicate TripDay rows before consolidating their stop, memory, and runtime references.
- Migration version 3 normalizes TripDay numbers and stop positions before adding unique indexes for trip/date, trip/day-number, and day/position.
- The migration adds focused relationship and ordering indexes without rebuilding core tables or adding constraints that could reject preserved databases.
- Application transactions now use serialized, transaction-scoped exclusive Expo SQLite connections.
- Automatic TripDay generation creates only missing canonical dates, repairs canonical day numbers, preserves existing valid IDs/content, and is atomic and repeated-call safe.
- Stop reorder validates the complete TripDay stop set and changes only ordering metadata in one atomic transaction.
- Migration version 4 adds a nullable user-selected expense date to budget items without fabricating dates for legacy records.
- Migration version 4 adds indexes for trip/date expense reads and optional booking/stop relationships.
- Migration version 5 archives and unlinks only invalid historical booking links whose stop is missing or belongs to another trip; valid and unlinked bookings are preserved.
- Migration version 5 adds database triggers that reject new or updated cross-trip Booking ↔ Stop links. Repository and service validation provide earlier application-level errors for the same invariant.
- Migration version 6 archives invalid historical Accommodation → Booking and Accommodation → TripStop relationships, then unlinks only the invalid relationship. Every Accommodation row and all valid links are preserved.
- Migration version 6 adds database triggers that reject new or updated cross-trip Accommodation links. Repository and service validation provide earlier application-level errors for the same invariant.
- Deleting a linked stop is one atomic SQLite delete. Existing `ON DELETE SET NULL` behavior preserves every linked booking and unlinks it; deleting a booking never deletes or mutates its stop.
- Each trip can persist one budget header, protected by the existing unique trip relationship. Plan updates preserve the canonical budget ID and existing expenses.
- Budget expense create, edit, and delete preserve original currency, explicit booking/stop IDs, and the user-selected expense date.
- Canonical Trip updates persist the trip row, upsert ordered destination records by ID, and rewrite traveler links in one transaction while preserving destination IDs and metadata. Optional intent and pace persist on the trip row. Days that referenced a removed destination have `destination_id` cleared rather than being deleted.
- Trip deletion remains one atomic SQLite statement and relies on verified foreign-key cascades for trip-owned data. Independent traveler records survive because only trip membership belongs to the deleted trip. The Travel DNA singleton is not trip-owned and is not deleted with a trip.
- Accommodation create and update validate required stay facts, real local date-time values, `checkInAt <= checkOutAt`, and same-trip optional booking/stop IDs. Deleting an Accommodation does not delete or mutate its linked Booking or TripStop; deleting a linked Booking or TripStop unlinks the Accommodation through `ON DELETE SET NULL`.
- Traveler creation plus first membership is atomic. Existing identities are added only through an exact selected Traveler ID, duplicate membership is rejected, canonical edits are visible in every Trip that contains that ID, and membership removal never deletes the identity.
- Travelers required no dedicated migration when that flow shipped: the released schema already has independent `travelers` rows, a composite `(trip_id, traveler_id)` membership primary key, and foreign keys that delete memberships—but not identities—when a Trip is deleted. Migration version 7 was later used for Memory / Travel Book integrity, not travelers.
- Time & Runtime Truth requires no migration: existing Trip and TripDay dates remain canonical text calendar values, stop and Accommodation values remain local wall-clock data, compatible Booking values retain their stored semantics, and metadata timestamps remain true instants.
- Canonical Destination Authoring requires no migration: `trip_destinations` already stores destination identity, ordered Trip membership, name, country code, latitude, longitude, timezone, and destination currency. Existing name-only rows remain readable and are upgraded only by an explicit user selection.
- Migration version 7 archives invalid Memory → TripDay / TripStop links and invalid Travel Book → Memory memberships, then unlinks only those invalid relationships. Memory and Travel Book content survives. Triggers reject cross-trip or day/stop-mismatched Memory links and cross-trip Travel Book memberships. Deleting a linked day or stop unlinks the Memory rather than deleting it.
- Migration version 8 creates the singleton `travel_dna` table (`singleton_key = 1`).
- Migration version 9 adds nullable `intent` and `pace` columns to existing `trips` rows. Existing trips keep both fields unset. Fresh schema already includes the columns; the migration checks before altering.
- Migration version 10 creates `saved_places` for grounded Discover candidate identities. Rows are not Trips and do not copy destination coordinates. Existing trip rows are unchanged.
- Migration version 11 adds `import_batches` and `import_claims` for the Import review queue.
- Migration version 12 adds optional `trip_days.destination_id` with `ON DELETE SET NULL`, same-trip insert/update triggers, and a destination-id index. Existing days stay unassigned. Fresh schema already includes the column; the migration checks before altering.
- Migration version 13 protects optional TripRuntimeState day/stop IDs with declared foreign keys (`ON DELETE SET NULL`), same-trip and day/stop-consistency triggers, and an invalid-link archive. It does not invent runtime rows or activate lived Companion progress.
- Migration version 14 requires a TripStop day to belong to the same trip. Invalid historical mismatches are archived and deleted; linked Bookings are unlinked. Stop content is not moved onto another trip.
- Migration version 15 declares Memory day and stop foreign keys (`ON DELETE SET NULL`). Dangling historical IDs are cleared. Travel Book memberships are copied through the table rebuild. Same-trip Memory ownership remains in the v7 triggers.
- Migration version 16 adds destination `place_id` and `timezone_source`, optional `trip_travelers.role` with at most one owner, and traveler-supplied `trip_fx_rates`. Historical fixtures that omit later tables skip those ALTER/CREATE statements.
- Migration version 17 adds `trip_stop_lived_states` for explicit done/skipped stop progress. Plan stop times are not rewritten. Delayed is not stored. Cross-trip rows are rejected. Deleting a stop cascades the lived row. Historical fixtures that omit `trips` / `trip_stops` skip CREATE.

Important remaining gaps:

- Cross-table invariants now require a TripStop day to belong to the same trip, with migration version 14 triggers and an invalid-stop archive.
- Runtime state is written only when the traveler records done or skipped stop progress. It points at that last explicit lived stop and does not become clock-inferred NOW/NEXT.
- Memory and Travel Book product mutations are TripWorkspace actions, so More and other Trip Space tabs reload the shared aggregate after those writes.
- Trip-list loading reads trips, destinations, and traveler memberships in three queries rather than repeating related-data queries per trip.
- Relationship cardinality and service aggregation still need explicit decisions for runtime state and some remaining aggregates. Booking ↔ Stop, Accommodation, Memory, and Travel Book relationships are now explicit.
- TripDay records outside an edited trip date range are preserved and placed after the canonical range; no product flow exists yet for resolving them.
- Multi-destination Trips now persist an optional Day → Destination ID. When that city has a valid IANA timezone and is uniquely today in that timezone, Companion uses it as the clock for the current date, current day, and NOW/NEXT. Runtime calculations otherwise still use a destination timezone only when every relevant saved destination has the same valid IANA timezone; otherwise the resolver reports an explicit device-calendar fallback. Destinations may store an IANA timezone from a provider result, catalogue handoff, or traveler choice, with `timezoneSource` provenance. The installed picker still does not return a timezone. A Google Time Zone API or other live enrichment path remains later work and must not reuse the Android Maps key for a client-side web-service call. Two assigned cities claiming today are not resolved by destination order.
- Archived migration-v3 duplicate-day metadata and migration-v7 invalid-link archives are retained for recovery but have no user-facing inspection tool.
- An Android Pixel 8 Expo SQLite rehearsal on 2026-09-03 upgraded the installed development database through versions 7–15. Live `PRAGMA user_version` is 15, and `memories` has declared `trip_id`, `day_id`, and `stop_id` foreign keys. Equivalent iOS rehearsals, including migration version 3, are still outstanding. Migrations 16 and 17 exist in code and Node tests only.

Historical migrations must not be edited to repair remaining issues. Corrections require new migrations.

## Implemented native flows

### Global navigation

The primary tab structure is:

- Home
- Trips
- Discover
- World
- Profile

Home, Trips (plus Import a calendar), Discover (Find me somewhere, Best time, Ready-made journeys, Saved ideas, plus Create Trip entry), World, and Profile (Travel DNA, Saved ideas, plus local stats) are functional product surfaces. Profile still labels notifications and account/sync as future.

### Trips and trip creation

Implemented behavior includes:

- Persisted trip list loaded with batched destination and traveler-membership reads.
- Creating a trip with title, one or more real native-selected destinations, native validated start/end calendar dates, accounting currency, and optional trip intent and pace. Free-form destination creation is no longer accepted.
- Opening a trip-specific workspace.
- Automatic TripDay creation from the trip date range.
- Editing the canonical trip title, dates, accounting currency, lifecycle status, intent, and pace from Trip Details, plus adding, reordering, removing, replacing, or upgrading destinations through the same native real-location picker.
- Deleting a trip through a destructive native confirmation that names the related local data being removed.
- Create Trip can be prefilled from Discover when the traveler accepts a curated destination or journey. Prefill uses route params for grounded destination facts, optional extra journey cities, and optional exact dates, intent, and pace. Flexible Discover timing is not converted into canonical trip dates.
- Home, Trips, and Bookings can open `/import` to choose an `.ics` file, a zip of calendars, a PDF, Office, or image file that embeds a calendar, or paste iCalendar text. Extracted events enter a review queue and do not become bookings until accepted onto an existing trip.

Create Trip and Trip Details use the shared native calendar field, validate real `YYYY-MM-DD` dates plus `start <= end`, and persist the selected calendar day without UTC or device-timezone shifting. Accounting currency uses a validated three-letter code rather than a complete currency selector.

### Trip Space navigation

Each trip exposes:

- Companion
- Plan
- Map
- Bookings
- More

Companion, Plan, Map, Bookings, and More have working functionality. The existing `/trip/[tripId]` route remains the canonical first tab, so the former Today route has backward-compatible navigation while its product label and implementation are now Companion. More is a native trip hub with canonical Trip Details, Budget, Accommodation, Travelers, Memories, and Travel Book navigation. Companion, Plan, Map, and Bookings remain primary bottom tabs and are not repeated as hub rows. A dedicated Trip readiness checklist is still labelled as coming later on More, even though Companion already uses shared readiness selection.

### Trip Details and More

Implemented behavior includes:

- A dedicated native Trip Details route reached from More.
- Canonical title editing, status selection, native date editing, accounting-currency editing, optional intent/pace editing, and structured destination replacement through TripService and TripWorkspace.
- Strict real-calendar `YYYY-MM-DD` validation and rejection of reversed ranges before persistence.
- Location-aware replacement preserves the destination ID and order while atomically replacing the selected place facts. Unrelated Trip metadata, travelers, accounting currency, and created timestamp remain intact. Destination add, remove, and reorder keep destination IDs; removing a destination clears Day → Destination assignments instead of deleting days, stops, bookings, or stays.
- Historical name-only destinations stay visible and loadable, and can be upgraded only through an explicit map selection. Structured destinations are not editable as disconnected text.
- Manual status choices cover draft, planned, completed, and archived. An existing active status is preserved, but a future trip cannot be manually marked active because active truth needs date/runtime derivation.
- Accounting currency cannot be changed once a persisted Budget exists. No amount is relabelled, converted, or assigned an invented exchange rate.
- Trip deletion uses a destructive native confirmation, routes safely back to Trips, refreshes the global list cache, and leaves the deleted workspace in not-found state rather than retaining stale data. Copy distinguishes archive (reversible `Trip.status`) from delete (irreversible on this device). There is no backup or export.

Current limitations include no backup/export for deletion, and no complete currency selector. Intent and pace editing exist in code; they were not re-verified on a device during this documentation pass.

### Canonical Destination Authoring

Implemented behavior includes:

- One provider-neutral destination-authoring service validates real coordinates and optional country, timezone, and currency codes without inferring missing facts.
- Create Trip requires the existing native picker and persists one or more real selected destinations, up to eight. Trip Details uses the same picker to add another destination, replace a structured destination, or upgrade a historical name-only destination while preserving its TravelOS ID. Reorder and remove keep destination IDs; a trip that already has destinations cannot be saved with zero. Removing a destination does not delete itinerary stops, bookings, or stays; it clears Day → Destination assignments for that city.
- Picker-returned locality/region/name/address and country context produce the saved display label. A stable place ID or timezone is persisted only when the provider result actually includes one. The installed picker still does not, so those fields stay unknown unless a catalogue or traveler supplies a timezone.
- SQLite hydration and persistence round-trip the full existing destination record losslessly. Destination rows are upserted by ID on trip save so Day → Destination links survive unrelated Trip Details edits. Optional day assignment itself required migration version 12. Provider identity and timezone provenance required migration version 16.
- Map frames every mapped destination together with every mapped itinerary stop and renders distinct destination markers. Plan uses a destination coordinate as picker context only when exactly one mapped destination makes that context unambiguous.
- Companion uses calm missing-timezone fallback copy and never shows exact NOW/NEXT timing without a saved reliable IANA timezone.
- Trip-space headings use the full saved destination context instead of silently treating the first destination as authoritative.
- Trip Details can set a traveler IANA timezone on a destination. Replacing a map pin preserves that timezone unless the new selection includes one.

Current limitations include no stable provider place ID in the installed picker result, and no destination-currency source. Two assigned cities claiming today still fall back to the device calendar. Provider enrichment and iOS verification remain future work.

### Budget & Expenses

Implemented behavior includes:

- One persisted budget per trip, denominated in the Trip's accounting currency.
- Planned amount updates that preserve existing expenses.
- Actual expense add, edit, and delete with title, positive amount, original currency, category, explicit date, optional notes, and optional booking/stop links by ID.
- Service validation that linked bookings and stops belong to the same trip.
- Planned, spent, remaining, progress, category breakdown, and a dated expense list.
- Accounting totals that include only paid expenses whose currency matches the Trip accounting currency, plus foreign paid expenses that have an explicit traveler FX rate for that pair.
- Foreign-currency paid expenses without a matching rate stay grouped in their original currencies, with explicit copy that they are kept outside the accounting total.
- Converted totals show original amount, converted amount, rate, as-of date, and `traveler` provenance. There is no live market feed.
- Legacy planned or committed budget items remain persisted and visible but are not represented as actual spend.
- A dedicated native Budget screen reached from More, with native date selection and shared TripWorkspace loading, refresh, error, and not-found behavior.

Current limitations include no live FX-rate provider, no receipt/media capture, no recurring/shared/split expense model, no decimal-minor-unit money type, and no iOS runtime rehearsal. Currency entry uses validated three-letter codes rather than a complete currency selector.

### Accommodation

Implemented behavior includes:

- A dedicated native Accommodation screen reached from More with loading, empty, ready, refresh, recoverable-error, and trip-not-found handling from TripWorkspace.
- Multiple stays per trip, sorted by check-in date/time with undated legacy records retained after dated stays.
- Add, edit, and delete for name, type, address, check-in/out, optional lodging Booking, optional TripStop, phone, website, and notes.
- Native date/time selection with validated destination-local wall-time persistence and `check-in <= check-out` enforcement. TravelOS does not invent timezone conversion from coordinates or apply an offset that was not persisted.
- Optional link, relink, and unlink behavior using exact IDs. The UI offers accommodation-type Bookings and real TripStops from the same Trip; existing explicit historical links remain editable without silently rewriting them.
- Booking reservation/provider/confirmation/payment facts remain owned by Booking. Accommodation owns stay facts, address/contact, and notes.
- Accommodation deletion preserves linked Booking and TripStop records. Booking or stop deletion preserves the Accommodation and unlinks only the deleted relationship.
- Restrained exact-link context in Companion, Bookings, and Map. Map shows stay context only through an explicitly linked TripStop that already has real coordinates; no Accommodation coordinates are guessed or copied.

Current limitations include no Day → Destination timezone mapping for multi-destination stay context, no provider import, no room/guest policy model, no booking creation from Accommodation, no dedicated place picker for accommodation coordinates, and no iOS runtime rehearsal.

### Travelers

Implemented behavior includes:

- A dedicated native Travelers screen reached from More with TripWorkspace loading, refresh, recoverable-error, and trip-not-found behavior.
- A reusable canonical Traveler identity with first name, optional last name, adult/child/infant type, optional email, optional phone, and existing avatar storage support. The UI intentionally does not collect passport, health, document, or inferred profile data.
- Explicit many-to-many Trip membership through stable Traveler IDs. Names are presentation only and are never used for matching or deduplication.
- Atomic create-and-add, exact selection of a saved identity for another Trip, canonical edit, and membership-only removal workflows.
- Duplicate membership prevention in both repository behavior and the existing composite SQLite primary key.
- Clear UI copy that canonical edits appear in every Trip containing that Traveler and that removal affects only the current Trip.
- Traveler counts and current membership on More and Travelers refresh through the shared TripWorkspace lifecycle after every mutation.
- Optional local trip owner: a member can be marked owner, at most one owner per trip. Planning trips may have no owner.

Current limitations include no default “Me” identity, no invitations, permissions, reservation ownership, expense splitting, emergency contacts, or global identity-library management. Create Trip still starts with zero Traveler memberships; the empty state is intentional for planning, while any future one-or-more enforcement must be designed together with accounts. Canonical identity deletion is not exposed in the product UI. No iOS runtime rehearsal has been completed.

### Memories V1

Implemented in code:

- A dedicated native Memories route reached from More, using TripWorkspace loading/not-found behavior, focus refresh, and create/edit/delete actions that invalidate the shared workspace.
- Create, edit, and delete for note and photo memories attached to the open Trip by ID.
- Optional exact TripDay and TripStop links from that Trip. Names are presentation only.
- Photo capture or library selection through `expo-image-picker`, with copies persisted under app document storage (`travelos/memories/`). TravelOS does not invent coordinates or capture times beyond the saved record. Gallery originals stay in the system library.
- Deleting a memory, replacing its photo, or deleting the trip removes owned copies only after SQLite is updated. Gallery URIs and path-traversal paths are not deleted. A leftover file must not fail the SQLite write.
- Honest Memories copy states that photo copies stay on this device, work offline, and have no backup or export yet. Video remains a domain type without an authoring path.
- Grouping by linked day when a valid day ID exists; unlinked memories remain visible.

Automated-test evidence: migration version 7 archives invalid historical Memory links, preserves valid memories, and rejects new cross-trip or mismatched day/stop links. Memory media ownership tests cover owned vs gallery URIs, path traversal, trip-delete URI collection, photo replacement, and an explicit no-export/no-backup contract. A dedicated Memories product-flow test file is not present.

Android-verified on 2026-09-02: Memories list on the Nagawa trip showed 2 memories, 1 photo, 1 note, with a Day 1 note linked to the tokyo stop. Camera/library capture, media copy durability across relaunch, owned-file cleanup after delete, and More-count refresh after a new write were not exercised.

Current limitations include no video authoring, no cloud backup or export of media, possible leftover files if filesystem cleanup fails after SQLite, and no iOS rehearsal.

### Memory media contract V1

Implemented in code:

- Owned media means an app-document copy under `travelos/memories/`. Unknown storage, gallery originals, nested paths, and `..` paths fail closed.
- Backup is none. Export is unavailable. Offline means the local copy already on this device. Video authoring is still absent.
- `MemoryService` discards the previous owned copy after a successful replace or delete. `TripService.deleteTrip` lists memory URIs, deletes the trip in SQLite, then best-effort deletes owned files. The Memories screen still copies a picker photo before save and still deletes a staged copy if that save fails.

Automated-test evidence: `tests/memory-media-ownership.test.cjs`. No native device rehearsal.

### Travel Book V1

Implemented in code:

- A dedicated native Travel Book route reached from More. Save and delete go through TripWorkspace actions and reload the shared aggregate.
- One Travel Book per Trip.
- Title, optional summary, optional cover image taken only from a selected photo memory's saved media URI, ordered Memory membership from the same Trip, and a local `isPublished` flag.
- Cover and membership validation refuse memories from another trip and refuse a cover URI that is not among the selected photo memories.
- `isPublished` is a local library flag. It is not a cloud publish, share, or export pipeline.

Automated-test evidence: migration version 7 covers invalid Travel Book membership cleanup. A dedicated Travel Book screen test is not present.

Android-verified on 2026-09-02: Travel Book opened as a local draft for Nagawa with honest V1 copy that it uses only saved Memories. Cover selection and publish were not exercised.

Current limitations include no export, no print/PDF, no shared publishing, and no iOS rehearsal.

### Shared trip readiness selection

Implemented in code:

- Pure `selectTripReadiness` derives canonical in-range TripDays and counts for accommodations, non-cancelled bookings, populated itinerary days, travelers, and whether a planned budget amount exists.
- Companion consumes that selector rather than duplicating readiness arithmetic.
- More still describes a dedicated pre-departure checklist as coming later. Readiness V1 is a shared selector, not a separate Trip Space screen.

Automated-test evidence: `tests/trip-readiness.test.cjs`.

Not re-verified on device as a distinct milestone.

### Travel DNA V1

Implemented in code:

- Singleton SQLite profile created by migration version 8.
- Native `/travel-dna` screen reached from Profile.
- Explicit editable pace, interests, travel style, budget style, daily rhythm, and typical party. Empty/unspecified values remain unspecified.
- Discover personalization may use Travel DNA only as fallback when the current Discover Brief does not supply the same preference. Trip intent/pace are not overwritten by Travel DNA.

Automated-test evidence: `tests/travel-dna-service.test.cjs` and `tests/travel-dna-migration.test.cjs`.

Android-verified on 2026-09-02: Travel DNA opened from Profile; Discover showed “Travel DNA is helping” and used DNA fallbacks (Food/Culture, Couple, Mix, Flexible) while trip-specific Romantic/Slow outranked them. The DNA form was not saved during this rehearsal.

Current limitations include no inferred traits, no scores, no AI-generated profile, no account identity, and no sync of the profile across devices.

### Trip Intent + Pace V1

Implemented in code:

- Optional `Trip.intent` and `Trip.pace` with database CHECKs matching the TypeScript unions.
- Create Trip and Trip Details expose those fields. Discover Brief can carry them for matching and Create Trip prefill.
- Values are trip-specific and optional. Existing trips remain unset until the traveler chooses them.

Automated-test evidence: `tests/trip-intent-migration.test.cjs` and Create Trip tests that persist intent/pace.

Not re-verified on device during this documentation pass.

### Companion V1

The former Today surface is now the first deterministic Companion. It consumes the centralized runtime resolver and the route-scoped TripWorkspace, then derives transient relevance through a pure selector with an injectable clock. SQLite remains durable truth. Zustand is not used as a second trip database. Explicit done/skipped stop progress is persisted in `trip_stop_lived_states`; `TripRuntimeState` is a pointer to the last traveler-recorded lived stop, not clock-inferred NOW.

Implemented truth rules and behavior are:

- A single valid destination IANA timezone, one valid timezone shared by every destination, or exactly one assigned day city that is locally today, supplies exact travel-local date and time. Missing, invalid, or differing trip-level timezones, two cities claiming today, or an unassigned day produce an explicit device-calendar fallback; destination order is never temporal authority.
- Upcoming Trips show a deterministic calendar-day countdown, first canonical TripDay preview, next safely dated local check-in, bounded early unlinked Booking context, and preparation signals derived only from Accommodation, Bookings, populated itinerary days, Travelers, and Budget data. Missing optional modules are not errors.
- Active Trips use only the TripDay whose canonical date exactly matches runtime truth and show `Day X of N`. The hero shows that day’s assigned city when one exists, or “City not set for today”; destination order is not substituted. When canonical timezone truth exists, a stop is `NOW` only if exactly one valid start/end range contains the local clock time and the traveler has not marked that stop done or skipped. `NEXT` is the first remaining canonical-order stop with a valid start at or after that time. A timed stop whose start has passed without a lived mark is delayed. Skipped and done stops keep their Plan times. Untimed stops are never called current.
- When exact active timing cannot be proven, Companion suppresses NOW/NEXT and active unlinked Booking claims, retains the canonical Plan order, and explains the timezone limitation. Missing active TripDays and invalid trip dates render explicit safe states instead of substituting another day.
- Relevant stop Booking context uses exact `Booking.stopId` relationships, ignores cancelled Bookings, and exposes restrained status/provider/payment context. Unlinked Bookings are shown only when their local calendar context can be derived safely; no fuzzy relationship is created.
- Current-stay language requires exactly one Accommodation whose canonical local check-in/out interval contains the reliable trip-local time. Otherwise only safely dated check-in/check-out context is shown. Historical absolute-offset stay values are preserved but are not reinterpreted as local live-stay truth.
- Map actions appear only for stops that already have persisted numeric coordinates. The Map route can focus the exact requested stop and visually distinguish its existing marker. Directions open the system maps app on that saved pin. No route, ETA, or coordinate is invented.
- Completed Trips leave live mode, show saved counts and final-day history, and no longer present an active stop or stay as current. Memories / Travel Book now have product routes; Companion completed copy should be read against those shipped surfaces rather than as “future work only.”
- Runtime truth refreshes on route focus, app foreground return, the next resolved local calendar-date boundary, and the next saved stop start or end while Companion stays open. The boundary calculation is DST-safe and uses one cleaned-up timer rather than polling.
- Trip-level loading, refresh, not-found, and recoverable read-error behavior remains shared with the other Trip Space screens.

Current Companion V1 limitations include no picker-returned timezone (a traveler or catalogue may still supply one), no live provider data, notifications, in-app routes, ETAs, weather, traffic, opening hours, recommendations, or AI. Mapped stops can hand a saved pin to Apple Maps or Google Maps. Delayed remains derived rather than a persisted phase. NOW/NEXT also refreshes at the next saved stop start or end while the screen stays open, then returns to the calendar-boundary timer. A dismissible plan-change notice appears when saved itinerary, booking, or stay facts change while Companion is already open; it is session-only and does not rewrite lived skip/done marks. When the device is offline, Companion and Map name that trip, booking, stay, and saved-pin facts remain on this device; live map tiles and lookup still need a network. Unknown reachability stays silent. There is no offline tile pack and no cached route. The Android rehearsal verified upcoming, incomplete/fallback, active canonical-day, linked Booking, mapped-stop, tab/lifecycle persistence, and completed non-live behavior with isolated data, then removed only that isolated trip. Exact canonical-timezone NOW/NEXT and Accommodation date-picker creation could not be exercised end-to-end because the current native destination provider does not return a timezone and the emulator diverted the native Accommodation picker into a system settings surface; deterministic selector tests cover those rules. Existing pre-test trip data survived, and bootstrap plus the persistence self-test passed after cold relaunch. Stop lived phase V1, Map day framing + directions V1, Companion plan-change notice V1, and Offline essential context V1 have Node tests and no device rehearsal. iOS verification remains outstanding.

### Plan

Implemented behavior includes:

- Day-by-day itinerary rendering with an optional city assignment per day from the trip’s existing destinations. Unassigned is valid. Assignment uses destination IDs, never names or destination order.
- TripStop create, edit, delete, and reorder.
- UI support for place, activity, food, and transport stop types.
- Native real-location selection.
- Persisted stop name, address, latitude, and longitude.
- Optional native `HH:mm` local wall-clock start **and end** time input with centralized validation (`stop-time`) and no invented timezone or conversion.
- Derived free-time gaps between consecutive knowable timed stops, shown on the day.
- Derived overlapping time conflicts, shown as explicit warnings rather than silently rewritten times.
- Optional “ask TravelOS” free-time advice that calls `AIContextService` plus `AIAPIClient.suggestForFreeTime`. The client posts to `{baseUrl}/ai/free-time`. Suggestions render in Plan and do not mutate the itinerary. If the gap changes before the response returns, the client rejects the advice. On failure, Plan reports that AI is unavailable and that the plan has not changed.
- The AI client uses `EXPO_PUBLIC_TRAVELOS_AI_URL` only when that value is a loopback URL. Any other host is ignored and the client stays on `http://127.0.0.1:8789`. The local `server/` package defaults `PORT` to `8787` unless configured. The 2026-09-02 Android rehearsal started the server with `PORT=8789` and `adb reverse tcp:8789 tcp:8789`. The default mismatch remains in code.

Current limitations include limited stop-type UI, no route or transit model, no place-provider ID persisted from the picker, no automatic insertion of AI suggestions as stops, and large screen-level implementations with duplicated presentation patterns. Plan shows a restrained booking count and a contextual action for relationships resolved by exact stop ID. The 2026-09-02 Android rehearsal opened Plan on the existing Nagawa trip, derived a 13:00–14:30 free-time gap, received two TRAVELOS IDEAS from live Qwen, and left the itinerary unchanged.

### Flexible Itinerary / Free Time V1

Implemented in code as the Plan capabilities above plus `src/services/itinerary-flexibility.ts`.

Automated-test evidence: `tests/itinerary-flexibility.test.cjs` and `tests/stop-time.test.cjs`.

Android-verified on 2026-09-02 for the Nagawa itinerary free-time gap and live advice rendering. iOS was not exercised.

### AI Foundation V1

Implemented in code:

- Deterministic, provider-agnostic `AIContextSnapshot` built from canonical workspace data, Travel DNA, runtime truth, Companion selection, and derived free-time/conflicts. The snapshot is read-only.
- Native `AIAPIClient` that validates free-time advice payloads (provider/model, verified gap, known activity types, unique suggestions) and Discover retrieve payloads (provider/model plus grounded `source:id` identities).
- Local `server/` Express app with `/health`, `/ai/health`, `/ai/free-time`, `/ai/discover-retrieve`, and `/ai/discover-explain`, using an Ollama provider module, a structured free-time advisor parser, precomputed Discover corpus embeddings, and a grounded Discover explanation parser. The server default chat model is `qwen3:4b` via `OLLAMA_MODEL`. The Discover embedding candidate is `bge-m3` via `OLLAMA_EMBED_MODEL`. Those defaults are a local foundation, not a production architecture commitment.
- Plan remains the only native caller of free-time advice. Discover results may call `/ai/discover-retrieve` for extra grounded identities and `/ai/discover-explain` for an opt-in catalogue explanation of one existing candidate. Those paths cannot invent destinations or write SQLite.

Automated-test evidence: `tests/ai-context.test.cjs`, `tests/ai-context-service.test.cjs`, `tests/ai-api-client.test.cjs`, `server/tests/free-time-advisor.test.js`, `server/tests/discover-retrieve.test.js`, and `server/tests/discover-explain.test.js`.

Android-verified on 2026-09-02: `adb reverse` to `127.0.0.1:8789`, live `bge-m3` Discover retrieve on device, live Qwen Discover explanation for Porto, live Qwen Plan free-time advice. The Rome explanation fail-closed on device when Qwen used a fit tag the catalogue record does not carry. iOS was not exercised.

Current limitations include no production cloud AI provider, no on-device model, no Discover reranking, and no silent conversion of advice into canonical stops. Local-dev AI boundary V1 keeps the client on loopback and ignores a non-local `EXPO_PUBLIC_TRAVELOS_AI_URL`.

### Local-dev AI boundary V1

Implemented in code:

- Production provider is none. Shipping is local-dev only. Backup/retention in a cloud AI service is none. Billed cost is none.
- Advice, retrieve, and explain cannot mutate SQLite or write bookings. Unreachable AI degrades instead of inventing results.
- `EXPO_PUBLIC_TRAVELOS_AI_URL` is accepted only for loopback hosts (`127.0.0.1`, `localhost`, `::1`). A cloud or LAN URL is ignored and the local `127.0.0.1:8789` fallback is used. Credentials in the URL fail closed.
- Plan copy states that TRAVELOS IDEAS stay ideas and are not saved as stops.

Automated-test evidence: `tests/ai-local-dev-contract.test.cjs`. No native device rehearsal.

### Discover Architecture V1 and Discover Experience V1

Implemented in code:

- Discover tab with “Start with a place” (Create Trip), “Find me somewhere”, “Best time to go”, “Ready-made journeys”, and “Saved ideas”.
- Find-destination flow collects an explicit Discover Brief: timing (unsure, exact dates, or flexible constraints), optional budget ceiling and currency, intent, pace, interests, and party. Missing values stay unknown.
- Session Brief lives in Zustand only.
- Matching uses a grounded Discover corpus assembled from explicit curated packs with provenance. The matcher ranks only records that include editorial fit. Records without fit remain in the corpus and are not ranked. AI does not invent destinations.
- The default corpus currently contains twelve grounded records across two packs (eleven with fit, one without). Results still show at most five matches.
- Match reasons expose which dimensions matched. Trip-specific Brief values outrank Travel DNA for the same preference. AI does not invent destinations.
- Results can hand a grounded destination to Create Trip through route params. Flexible timing is not turned into invented calendar dates.
- Domain types also include `best_time` and `journey_ideas`. Best time and Ready-made journeys are working Discover screens over the grounded catalogue.

Automated-test evidence: `tests/discover-architecture.test.cjs`, `tests/discover-matcher.test.cjs`, `tests/discover-sourcing.test.cjs`, `tests/discover-semantic.test.cjs`, `tests/discover-best-time.test.cjs`, and `tests/discover-journeys.test.cjs`.

Android-verified on 2026-09-02: Discover tab, Find me somewhere, Travel DNA fallback copy, grounded ranking, Create Trip handoff, persist, and cascade delete of an isolated Barcelona trip. Best time and Ready-made journeys were not part of that rehearsal.

Current limitations include no live place provider as a Discover source, no reranking, and no import of Discover results except through explicit Create Trip confirmation. Grounded records without editorial fit still cannot enter the deterministic ranking; they may appear only as semantic extras when retrieval is available. Opt-in grounded explanations are available when the AI server can paraphrase catalogue facts for one existing candidate. Best time only shows sourced months; destinations without a timing citation stay unknown. Ready-made journeys can prefill extra catalogue cities into Create Trip; they still do not invent an itinerary or dates. Saved ideas persist grounded identities only; they do not become trips or World history.

### Semantic Discover V1

Implemented in code:

- A local embedding benchmark harness (`scripts/benchmark-discover-embeddings.cjs`, run through `npm run benchmark:discover-embeddings`) that embeds the grounded Discover corpus plus paired English/Greek brief-style queries through local Ollama embeddings, scores retrieval against gold sets derived only from the corpus's explicit fit tags, and writes a JSON report to `docs/benchmarks/`.
- A generate script (`npm run generate:discover-embeddings`) that writes a committed server-side artifact at `server/data/discover-corpus-embeddings.json`, keyed by grounded identity `(source, record id)` and a content hash of the current corpus document texts plus embedding-model candidate. The current artifact has 12 `bge-m3` 1024-d vectors. The native app does not bundle or load these vectors. A Node test fails if the artifact hash drifts from the live corpus.
- `POST /ai/discover-retrieve` on the local AI server. The app never talks to Ollama directly. The server embeds the query, ranks the precomputed corpus, and returns only grounded identities plus scores. A content-hash mismatch fails closed as `stale_embeddings`. A missing artifact or unreachable Ollama fails closed as unavailable.
- Hybrid Discover results: deterministic fit matches remain the primary ranked list. Semantic hits may add extra grounded catalogue destinations, including no-fit records such as Bergen, with explicit `SEMANTIC MATCH` provenance. If the AI server is unreachable, Discover degrades to the previous deterministic-only results.

Automated-test evidence: `tests/discover-semantic.test.cjs`, the Discover retrieve cases in `tests/ai-api-client.test.cjs`, and `server/tests/discover-retrieve.test.js`. Those tests do not call Ollama.

Measured on 2026-09-01 with `bge-m3` through local Ollama (1.1 GB disk, ~633 MB loaded, CPU): English recall@3 0.58 / recall@5 0.79 / MRR 0.75; Greek recall@3 0.58 / recall@5 0.92 / MRR 0.67; ~79 ms average query embedding; ~774 ms per document one-time batch; dimension 1024. English and Greek produced nearly identical per-query rankings. Both fjords probe queries ranked Bergen — a grounded record with no fit tags whose document text is only "Bergen, NO" — first in both languages, which is the retrieval value tag matching cannot provide.

Honest read: absolute precision is limited by tag-only document text (documents are near-duplicate tag lists, so cosine scores cluster tightly), not by cross-language quality. V1 therefore keeps deterministic matching primary and treats semantic retrieval as an extra grounded lane, not a replacement ranker. Later reranking is still open. BGE-M3 remains a replaceable candidate; the harness accepts `--models=` for comparators. The benchmark and embedding generation are manual local harnesses requiring a running Ollama and are not part of `npm test`.

Android-verified on 2026-09-02: hybrid Discover results kept deterministic Porto as MATCH #1 and added grounded SEMANTIC MATCH extras (Rome, Krakow, Copenhagen) from live retrieve. The committed embedding artifact must be regenerated after corpus or document-text changes; stale hashes fail closed rather than serving old vectors.

### Discover reranking (benchmarked, not adopted)

Implemented in code:

- A local retrieve-then-rerank harness (`scripts/benchmark-discover-rerank.cjs`, run through `npm run benchmark:discover-rerank`) that ranks the committed grounded embedding artifact, then asks a chat model to reorder only those retrieved identities.
- Fail-closed identity application in `src/services/discover-rerank.ts`: invented identities are rejected; omitted identities keep their original tail order. Server prompt/parser coverage lives in `server/discover-rerank.js`.
- No Discover UI, AI-server route, or SQLite write uses reranking. A BGE reranker was not installed.

Measured on 2026-09-02 against local Ollama 0.33.2: `/api/rerank` returns 404. `qwen3:4b` listwise-reranked the embedding top-8 with 0 parser failures. English recall@3 moved from 0.58 to 0.71 (one query, beach-nightlife-en, pulled Lisbon into the top three); Greek recall@3 and both-language MRR were unchanged. Average chat rerank latency was 3284 ms. Both fjords probes still ranked Bergen first after rerank.

Honest read: Qwen is not a production Discover reranker. The quality lift is narrow and English-only, and more than three seconds per brief is too slow for this surface. A BGE reranker remains the named candidate, but this Ollama build cannot serve one. TravelOS will not pull extra models until a real rerank endpoint can be measured. Discover therefore keeps deterministic matching primary and semantic extras unreordered.

Automated-test evidence: `tests/discover-rerank.test.cjs` and `server/tests/discover-rerank.test.js`. The live Ollama benchmark is not part of `npm test`.

### Grounded AI explanations V1

Implemented in code:

- Opt-in “Ask TravelOS why it fits” on Discover result cards. The request goes to `POST /ai/discover-explain` on the local AI server. The app never talks to Ollama. Nothing is written to SQLite.
- The payload is one grounded identity plus catalogue name/country/fit tags/evidence labels and the explicit Brief/DNA values. Coordinates, prices, and other destination facts are not sent.
- Parser fail-closed rules: identity must match, 1–2 short sentences, no URLs/prices/coordinates, no other catalogue destination names, and no fit-tag words that are not on the grounded record. Unfitted records such as Bergen may only be described as a catalogue place known by name and country.
- If the AI server is unreachable or the model invents facts, Discover shows that the explanation is unavailable and leaves ranking unchanged.

Automated-test evidence: `tests/discover-explain.test.cjs`, Discover explanation cases in `tests/ai-api-client.test.cjs`, and `server/tests/discover-explain.test.js`. Those tests do not call Ollama.

Android-verified on 2026-09-02: Porto accepted a two-sentence FROM THE CATALOGUE explanation from live Qwen. Rome fail-closed with “TravelOS could not explain this from the catalogue. Nothing was saved.” Ranking did not change.

### Discover Best Time V1

Implemented in code:

- Discover tab opens `/discover/best-time` for a known catalogue destination. The picker is the grounded corpus, not a live place provider, because season facts are catalogue citations rather than map results.
- Optional `timing.supportedMonths` plus distinct timing evidence on a catalogue record. Lisbon uses Visit Lisboa traveller-information climate copy covering all four quarters. Bergen uses Visit Norway’s year-round fjord accessibility, including named season months. Other current records have no timing and fail closed as unknown.
- The screen cites the source label and `checkedAt` freshness. Months are never converted into Create Trip start/end dates. Make it a trip still prefills only the grounded destination through `/new-trip`.
- Session Brief uses `mode: 'best_time'` in Zustand only. Nothing is written to SQLite until the traveler confirms Create Trip.
- Adding timing does not change embedding document text, so the committed semantic artifact hash is unchanged.

Automated-test evidence: `tests/discover-best-time.test.cjs`. Android Pixel 8 opened the destination list and Bergen sourced months on 2026-09-02; Create Trip from that screen was not exercised.

Current limitations: only two of twelve corpus destinations have sourced months; remaining destinations show an explicit unknown state. Best time does not rank “best weeks,” invent weather, or compare destinations against each other.

### Discover Ready-made Journeys V1

Implemented in code:

- Discover tab opens `/discover/journeys` for curated journey ideas. Each idea is identified by `(source, record id)` and may only name grounded catalogue destinations.
- Current ideas: Slow days in Porto, Lisbon and Porto, and Bergen for the fjords. Intent and pace are allowed only when they already exist on the primary destination’s catalogue fit. Bergen has no fit tags, so it carries none.
- The screen labels the idea as not a trip. Extra catalogue cities can prefill additional Create Trip destinations. Dates stay empty. Prefill carries optional intent/pace from the primary destination’s catalogue fit.
- Session Brief uses `mode: 'journey_ideas'` in Zustand only. Nothing is written to SQLite until the traveler confirms Create Trip.
- Journeys are not embedding documents. The committed semantic artifact hash is unchanged.

Automated-test evidence: `tests/discover-journeys.test.cjs`. Android Pixel 8 opened the journey list on 2026-09-02 (Porto, Lisbon and Porto, Bergen). Journey detail and Create Trip from a journey were not exercised.

Current limitations: there is no journey day-by-day itinerary. Extra catalogue cities can prefill Create Trip destinations, but days are still not assigned to a city. Journey ideas can be saved as wishlist candidates without becoming trips.

### Discover Wishlist V1

Implemented in code:

- Migration version 10 adds `saved_places`. Each row stores a grounded identity (`curated:…`), kind (`destination` or `journey`), source, and timestamps. Coordinates, itineraries, and calendar dates are not copied.
- Saving is explicit from Discover results, Best time, and Ready-made journeys. Duplicate identities are idempotent. Unknown identities fail closed.
- `/discover/saved` lists saved ideas and can hand a destination or journey to Create Trip. Extra journey cities can prefill additional destinations. Removing a saved idea does not delete trips.
- Profile links to the same Saved ideas list. World still maps only persisted Trip destinations and does not treat wishlist rows as visited or planned.

Automated-test evidence: `tests/saved-place.test.cjs` and `tests/saved-place-migration.test.cjs`. Android Pixel 8 opened the empty Saved ideas list on 2026-09-02. Saving or removing an idea was not exercised.

Current limitations: there is no World wishlist layer, no live provider save path, and no conversion of a saved idea into a Trip without `/new-trip`.

### Import Review Queue V1

Implemented in code:

- Migration version 11 adds `import_batches` and `import_claims`. Import accepts iCalendar (`.ics`) text from paste or a chosen local file. An email that contains a `text/calendar` / `application/ics` part, or a visible `BEGIN:VCALENDAR` block, is extracted first. UTF-16 BOM calendars are decoded. A zip of calendars is unpacked locally with `fflate`; nested zips and members over the 512 KiB cap are skipped. A PDF is accepted only when it contains an iCalendar, including FlateDecode streams. Word/Excel/PowerPoint Open XML packages are accepted only when visible text contains an iCalendar, including text split across Office runs. JPEG, PNG, GIF, and WEBP files are accepted only when metadata or file bytes contain an iCalendar, including compressed PNG zTXt and text split across chunks. Ticket photos without a calendar fail closed. There is no OCR and no AI parsing of confirmation prose. Files larger than 512 KiB fail closed. Non-calendar files fail closed. iCloud entitlements were not enabled.
- Each claim stores extracted title, optional start/end, optional location text, optional UID, confidence, and JSON evidence (fields present, TZID, date-only calendar date). Location is never treated as coordinates. Date-only events do not invent midnight.
- Home, Trips, and Bookings open `/import`. Review is `/import/review/[batchId]`. Accepting writes one planned Booking of type `other` onto a chosen existing trip through the canonical booking write path. Dismissing leaves no booking. Import never creates a Trip or destination.
- Conflicts are evaluated at review time against the selected trip: missing time, overlapping bookings, duplicate UID already accepted, and incomparable local/absolute times. They are shown; they do not silently merge or overwrite bookings.
- Re-pasting or re-choosing the same calendar is idempotent by content hash of the extracted iCalendar, not the email or zip wrapper. A chosen file uses its basename as `sourceLabel`; paste uses `Pasted calendar` or `Pasted email`.

Automated-test evidence: `tests/import-ics.test.cjs`, `tests/import-review.test.cjs`, `tests/import-review-migration.test.cjs`, `tests/import-calendar-file.test.cjs`, `tests/import-calendar-extract.test.cjs`, `tests/import-calendar-zip.test.cjs`, `tests/import-calendar-pdf.test.cjs`, `tests/import-calendar-office.test.cjs`, and `tests/import-calendar-image.test.cjs`. Android Pixel 8 development-build evidence for paste/review/accept/delete, choosing a local `.ics` file, and extracting a `text/calendar` email on 2026-09-02 is recorded under Testing and release readiness. Zip, PDF, Office, and image extractors were rehearsed on Pixel 8 on 2026-09-03 without writing bookings.

Current limitations: image OCR of confirmation photos, itinerary-stop claims, and AI-assisted extraction are still out of scope. A PDF, Office, or image file without an embedded iCalendar fails closed. iOS has not been rebuilt with `expo-document-picker`. Accepted bookings still require the traveler to confirm reservation details in Bookings.

### Bookings

Implemented behavior includes persistent create, edit, delete, status, payment status, amount, currency, reference, location, and date/time fields. Amount and currency must be saved together. A cancelled booking cannot be marked paid. Delete copy states that linked stays keep their facts and the booking cannot be recovered. New local provider times use native calendar/time controls, canonical local date-time persistence, and comparable `start <= end` validation without implicit timezone conversion. Historical values with `Z` or an explicit offset remain absolute instants and are preserved byte-for-byte until intentionally replaced or cleared; invalid legacy values remain visible and do not crash editing. Add/Edit Booking also includes an optional native itinerary-stop selector with real day, date, title, type, and time context. Users can link, relink, or explicitly return a booking to the valid unlinked state. Booking cards show their linked stop and can open its exact Plan context. Accommodation-type Booking cards also show exact linked stays and can open the relevant Accommodation.

The flow is not yet production complete:

- Booking temporal semantics remain a compatibility boundary rather than one fully normalized model; mixed local/absolute ranges must be replaced or cleared before comparison.
- External action links and provider-specific details are absent.
- Destructive and persistence failure states need stronger UX.

### Map and location picker

Implemented behavior includes:

- A native map screen.
- Pins for stops with persisted coordinates.
- Camera framing from real stop and destination coordinates, including a day’s assigned city when that city is mapped.
- System-maps directions handoff from a saved stop pin. No in-app route, travel time, or invented coordinates.
- A native location picker that returns a real selected location.
- Linked booking counts appear only on mapped TripStops resolved through exact IDs. Booking coordinates are not stored, copied, guessed, or invented.
- Linked Accommodation counts and context appear only on mapped TripStops resolved through exact IDs. Accommodation coordinates are not copied or invented.

Platform state:

- Android uses Google Maps through the current app configuration.
- Android location search depends on Google Maps and Places API (New) being enabled for the configured key.
- Create Trip and Trip Details now share the native picker with Plan. Create Trip accepts only a confirmed map selection; Trip Details can explicitly replace or upgrade one existing destination record without changing its ID or position.
- The Trip Map renders every destination that has valid saved coordinates as well as itinerary-stop markers. A multi-destination Trip is not silently reduced to its first destination.
- The API key is injected from GOOGLE_MAPS_API_KEY through app.config.js.

Android-verified on 2026-09-02: Trip Map for Nagawa rendered Google Maps with destination and stop markers and an “1 place” overlay. World showed 3 mapped destinations from saved trip facts.
- Cloud API enablement and key restrictions were not verified because secret configuration was intentionally not inspected.
- iOS currently uses platform-default map behavior rather than a completed Google Maps setup.
- No iOS bundle identifier is configured.
- iOS build, picker behavior, permissions, and release readiness are unverified.
- Routes, travel times, offline map tiles, clustering, and live navigation remain later work. Map day framing uses the assigned Day → Destination city plus that day’s mapped stops, or falls back to every saved coordinate. Directions hand off to the system maps app with the saved pin only. Offline essential context V1 names when pins are on-device and when live tiles need a network.
- Home, Trips, Companion, Plan, Map, Bookings, Accommodation, Travelers, More, Discover, World, and Profile render available destination or trip facts rather than silently treating the first destination as the whole trip. Plan can assign a day to one of those destinations. Map uses that assignment for framing when the city has real coordinates.

### World

Implemented in code:

- Native World tab with a map and destination cards derived from persisted Trip destinations.
- Markers only for destinations that already have real saved coordinates. No coordinates are invented.
- Filters for all / planned / lived.
- Planned vs lived uses explicit done-stop marks on a day assigned to that destination by ID. Durable `Trip.status` is not treated as a visit. Skipped stops, unassigned days, destination titles, and wishlist rows are not lived evidence.
- Lived cards can show an archive of memories linked by explicit day or stop IDs, including a local photo cover when a `mediaUri` exists. Memories do not invent coordinates or mark a visit.

Android-verified on 2026-09-02: World opened with Google Maps, 3 trips / 0 completed / 3 mapped, and destination cards for Nagawa and Strathpeffer. Filters were not clicked through. World planned vs lived V1 has Node tests and no device rehearsal.

Current limitations include no wishlist layer on World, no country statistics independent of saved destinations, and no cloud backup or export of memory media. Saved Discover ideas live on their own list and are not World markers. Memories appear on lived World cards only through explicit day or stop IDs.

### Profile

Implemented in code:

- Native Profile tab with local counts of trips, completed trips (durable status), and mapped destinations.
- Working Travel DNA navigation.
- Honest copy that trip data is currently on-device.
- Notifications and account/sync rows are labelled future.

Android-verified on 2026-09-02: Profile showed 3 trips / 0 completed / 3 mapped and opened Travel DNA without saving changes.

## Persisted modules without product UI

The following still have domain and persistence support but no complete user-facing flow:

- TripRuntimeState as a standalone progress editor. Companion now writes it only as a last-lived-stop pointer when the traveler marks a stop done or skipped.

Memories and Travel Book now have product UI. Their earlier “foundation only” status is no longer accurate.

## State and navigation lifecycle

- Companion, Plan, Map, Bookings, Accommodation, Budget, Travelers, More, Trip Details, Memories, and Travel Book share one route-scoped TripWorkspace lifecycle above the nested tabs.
- Initial loading, ready, refreshing, not-found, and recoverable error states are explicit.
- Stop, booking, Booking ↔ Stop, Trip Details, trip-delete, budget, accommodation, traveler, Memory, Travel Book, and Companion lived-stop mutations invalidate and reload the shared aggregate from SQLite.
- Memories and Travel Book persist through those workspace actions rather than writing around the shared lifecycle.
- Focus-aware refresh retries invalid or failed snapshots but skips database reads when the shared revision is already current.
- Missing and unknown trip IDs render a native not-found state with a safe route back to Trips instead of waiting indefinitely.
- Fatal database, persistence self-test, or initial trip-list bootstrap failures render a retryable root state rather than opening the application against an unverified database.
- Zustand no longer maintains the unused activeTrip/activeTripId path. It remains a UI cache for the global trip list, plus a session-only Discover Brief. Neither is a durable trip database.

Remaining risks include requiring future Trip Space mutations to use the shared action/invalidation contract, the absence of an external-change observer for writes made outside that contract, and the need to test the nested tab lifecycle on iOS and a broader range of Android devices.

## Design system state

The app retains its warm off-white, deep green, brass, restrained teal/coral, Playfair Display, and Inter visual identity. UX Refinement V1 makes Companion the deliberate signature surface while giving utility screens a denser, calmer hierarchy.

Verified UX Refinement V1 changes include:

- A shared compact utility-screen header and summary strip now standardize hierarchy without adding a UI framework.
- Companion leads upcoming trips with destination, departure countdown, and first-day context before showing a compact actionable timing hint. Preparation is now a compact readiness list ordered toward useful missing actions; active NOW/NEXT and completed-history semantics are unchanged.
- Plan uses tighter day spacing, smaller day markers, compact empty-day actions, and accessible collapsible populated days while preserving stop CRUD and button-based reorder behavior.
- Bookings and Accommodation replace three oversized statistic cards with compact summaries, leaving their real records visually primary.
- More is a grouped trip hub for Trip Details, Travelers, Budget, and Accommodation. Companion, Plan, Map, and Bookings are not redundantly repeated because they remain primary bottom tabs. Memories and Travel Book were added to that hub after UX Refinement V1.
- Travelers uses concise human copy for adding, reusing, editing, and removing people. Visible database and identity-model explanations were removed.
- Create Trip, Trip Details, Stop, Booking, Accommodation, Traveler, Budget, and destination-selection helper copy was shortened without changing validation or data semantics.
- Large utility headings, repeated shadows, and card stacking were reduced while preserving Playfair Display for meaningful titles and maintaining 44-point-or-larger primary touch targets or explicit hit slop for compact itinerary actions.

The design system is still incomplete:

- Major screens still contain large local style and interaction implementations.
- Fields, sheets, empty states, alerts, and destructive confirmations are not yet consolidated into stable primitives.
- Dynamic type, contrast, screen-reader order, localization, bidirectional layout, and iOS visual verification remain incomplete.
- Starter Expo components and assets remain in the repository.
- Later Discover, World, Profile, Memories, Travel Book, and Travel DNA screens were not part of the incomplete UX Refinement V1 visual matrix.

## Testing and release readiness

Verified checks through UX Refinement V1 (historical; not re-run in this documentation pass):

- npm test ran sixty-seven automated tests covering persistence, migrations, Budget calculations, Trip Details validation/persistence/cascades, Booking ↔ Stop invariants and deletion behavior, Accommodation validation/persistence/relationships/cascades/day context, Traveler identity/membership behavior, TripWorkspace lifecycle behavior, centralized time/runtime truth, deterministic Companion selection/calendar-boundary behavior, destination selection validation, legacy compatibility, mapped-consumer context, and destination SQLite round trips.
- Fresh database migration, version-2 drift repair, migration rollback, fresh/partial/repeated TripDay generation, concurrent idempotency, and stop reorder rollback are covered.
- Workspace initial loading, not-found behavior, revision-aware refresh, shared-consumer mutation propagation, recoverable retry, and mutation-during-load invalidation are covered.
- The Android debug build compiles, installs, launches, and reaches both the development persistence self-test and bootstrap-ready state on an x86_64 emulator.
- An on-device Expo SQLite rehearsal verified `PRAGMA user_version = 3`, all ten migration/invariant indexes, existing seeded trip survival, canonical TripDay generation/loading, and lossless stop reorder in an isolated database.
- Phase 0B Android runtime verification created and opened an isolated trip, selected and persisted a real mapped stop, observed it and its edited title on Map after tab navigation, preserved a booking across tab changes, and confirmed an unknown trip route reaches the native not-found state. Only the isolated verification trip was removed afterwards; the pre-existing trip remained visible.
- Budget Android runtime verification created an isolated EUR trip, set a €1,000 plan, added accounting- and foreign-currency expenses, verified the foreign amount stayed outside EUR totals, edited an expense to produce €350 spent and €650 remaining, deleted an expense, cold-relaunched the app, and confirmed the budget and edited expense persisted. Expo SQLite reported `PRAGMA user_version = 4` and all three Budget indexes. Only the reserved test trip was removed; the pre-existing trip remained visible.
- Trip Details Android runtime verification edited an existing trip title and date range, rejected an invalid reversed range, safely changed accounting currency on a trip without a persisted Budget, observed the saved values immediately in More and Today, and confirmed them after a cold process relaunch. The original trip values were restored afterwards. A separate `DeleteE2E` trip exercised the destructive confirmation and cascade path; it disappeared from Trips while the original trip and its itinerary remained. A clean restart reported `Persistence self-test: PASS` and `Bootstrap ready`.
- Booking ↔ Stop Android verification used one isolated trip to create two stops, link and relink a confirmed booking, explicitly unlink it, link two bookings to one stop, observe exact relationship context in Bookings, Plan, and Today, and delete the linked stop after an explicit two-booking warning. Both bookings survived unlinked, the other stop remained, and all results persisted through a cold relaunch. The isolated trip was deleted afterwards, while the unrelated existing trip remained visible. The native build compiled and launched, and repeated startup logs reported `Persistence self-test: PASS` and `Bootstrap ready`.
- Accommodation Android verification used one isolated trip to create a real mapped stop, an accommodation-type Booking, and two stays; exercised add, native date/time input, edit, link, unlink, relink, sorted multiple-stay rendering, and deletion; and observed exact stay context in Today, Bookings, and Map. Deleting the linked Booking preserved the stay and its stop link, and cold relaunch preserved the edited Sep 1–3 schedule. The development database reported `PRAGMA user_version = 6`, all four validation triggers and five relevant indexes, and the unrelated existing trip remained visible. The isolated trip was deleted through the app afterwards. The Android debug build compiled, installed, launched, and reported `Persistence self-test: PASS` and `Bootstrap ready`.
- Travelers Android verification used two isolated Trips and two isolated Traveler identities to exercise creation, exact-ID reuse, shared canonical editing, duplicate-free membership, membership-only removal, saved-identity selection, and cold-process persistence. The edited identity appeared in both Trips; the removed identity remained selectable for reuse; deleting one Trip preserved the Traveler and its other membership. Both test Trips and both exact test identities were removed afterwards, while the unrelated existing trip remained visible and loadable. The database remains at version 6 because the existing Traveler and membership schema already provided the required keys and cascades. The Android debug build compiled, installed, launched, and reached the persistence self-test and bootstrap-ready state before the E2E flow.
- Time & Runtime Truth Android verification compiled and launched the debug development build, created one isolated Trip with native dates, rejected an unsaved reversed Create Trip range, added a native-time Stop, added a native local-time Booking linked by exact stop ID, and added an Accommodation linked to the same exact stop. Today showed active Day 1 plus real Booking and Accommodation context, an explicit device-calendar fallback because no destination timezone was saved, a non-active first-day preview after the Trip moved to a future range, and completed-history copy after it moved to a past range. A cold process relaunch preserved the selected dates, local times, links, and unrelated existing Trip; startup reported `Persistence self-test: PASS` and `Bootstrap ready`. Plan, Map, Bookings, Budget, Accommodation, and Travelers all opened on Android. The exact `TimeTruthE2E` Trip and its related isolated data were deleted afterwards, the rejected draft was never persisted, and the existing Japan Trip remained visible.
- Companion V1 Android verification compiled both debug and x86_64 release variants, installed and launched the development build on an Android 16 x86_64 emulator, and again reached `Persistence self-test: PASS` plus `Bootstrap ready`. An isolated active Trip verified exact canonical-day selection, Day 1 of 1, safe missing-timezone degradation, a real picker-selected mapped stop, exact linked Booking context across Companion/Map/Bookings tabs, completed non-live history after a date edit, and cold-process persistence. A pre-existing future Trip verified upcoming countdown/readiness without mutation. The exact isolated Companion Trip and all of its related data were deleted through the named destructive confirmation; the pre-existing Trip survived. Canonical-timezone NOW/NEXT and new Accommodation context could not be completed through this E2E path because no destination-timezone authoring UI exists and the emulator diverted the Accommodation picker to Android settings; those deterministic branches are covered by injected-clock tests.
- Canonical Destination Authoring Android verification compiled and installed the debug development build without clearing app data. One isolated Trip was created from a real Tokyo-area city result, persisted its returned `JP` country context and coordinates, showed an explicit unavailable-timing fallback because no timezone was returned, biased the Plan picker to the single destination, and framed separate destination and mapped-stop markers together. A second isolated historical name-only Trip was upgraded through Trip Details to a real Athens selection while its title, dates, accounting currency, destination ID/order, and unrelated data remained intact. Both selections and the mapped stop survived a cold process relaunch. Companion, Plan, Map, Bookings, Budget, Accommodation, Travelers, More, and Trip Details loaded successfully. Both uniquely named test Trips were deleted through their exact destructive confirmations; the unrelated pre-existing Trip remained visible.
- UX Refinement V1 compiles as an Android debug development build, installs over the existing app without clearing data, launches on the Android 16 x86_64 emulator, and reaches the existing upcoming Trip. The updated Companion first screenful was visually verified with the departure experience ahead of a compact timing action and first-day context. Emulator screenshot/control access ended before the remaining Plan, Bookings, More, Travelers, forms, Map, CRUD, and cold-relaunch visual matrix could be completed, so those scenarios are not claimed as verified for this milestone; their underlying business behavior remains covered by the existing automated suite.
- npx tsc --noEmit passed for the application at the UX Refinement V1 checkpoint.
- npm ls --depth=0 passed at the takeover audit.
- git diff --check is part of the required completion checks.

Automated tests added after UX Refinement V1 (files exist in `tests/` and `server/tests/`):

- Migration v7 Memory / Travel Book integrity (`tests/migrations.test.cjs`)
- Travel DNA service and migration
- Trip intent/pace migration and Create Trip persistence
- Shared trip readiness
- Stop time validation and itinerary free-time/conflict derivation
- AI context snapshot/service and AI API client parsing
- Server free-time advisor parsing
- Discover architecture, catalogue validation, matcher, sourcing/corpus identity, Create Trip handoff, hybrid semantic merge/hash, fail-closed rerank identity application, grounded explanation guards, Best time sourced-month guidance, Ready-made journey identity/handoff guards, and saved-place persistence/identity guards
- Server Discover retrieve ranking, request validation, rerank prompt parsing, and explanation prompt parsing

Cursor handoff verification on 2026-09-01 (documentation/rule changes only; no native device testing):

- `npx tsc --noEmit` passed.
- `npm test` passed: 132 tests, 0 failed.
- `cd server && npm test` passed: 12 tests, 0 failed.
- `git diff --check` is part of the handoff staging checks.

A current passing Node count from the 2026-09-02 rehearsal is 160 application tests plus 27 server tests. That does not replace historical Android evidence through UX Refinement V1.

Best time V1 verification on 2026-09-02 re-ran `npx tsc --noEmit` and `npm test` (168 application tests passing, including the new Best time suite) plus `cd server && npm test` (27 tests). `git diff --check` was clean for the changed files. A later same-day Pixel 8 pass opened this screen; see the Import follow-up below.

Ready-made journeys V1 verification on 2026-09-02 re-ran `npx tsc --noEmit` and `npm test` (173 application tests passing, including the new journeys suite) plus `cd server && npm test` (27 tests). `git diff --check` was clean for the changed files. A later same-day Pixel 8 pass opened the journey list. A 2026-09-03 Pixel 8 pass opened Lisbon and Porto detail and Create Trip with both cities prefilled.

Wishlist V1 verification on 2026-09-02 re-ran `npx tsc --noEmit` and `npm test` (180 application tests passing, including the new saved-place suite) plus `cd server && npm test` (27 tests). `git diff --check` was clean for the changed files. A later same-day Pixel 8 pass opened the empty Saved ideas list. A 2026-09-03 Pixel 8 pass saved Slow days in Porto, listed it under Saved ideas, then removed it.

Import Review Queue V1 verification on 2026-09-02 re-ran `npx tsc --noEmit` and `npm test` (191 application tests passing, including the new import-review suite) plus `cd server && npm test` (27 tests). `git diff --check` was clean for the changed files.

A follow-up Android Pixel 8 development-build pass on 2026-09-02 (same installed `com.travelos.app`, Metro, `adb reverse`) found that `pathname: '/import/index'` was captured as the review `[batchId]`. Review was moved to `/import/review/[batchId]`. This route-fix pass re-ran `npx tsc --noEmit` and `npm test` (191 passing). `git diff --check` was clean. After that fix:

- Home still featured Nagawa as HAPPENING NOW with 3 trips / 0 completed.
- `/import` opened REVIEW FIRST. Garbage clipboard text fail-closed with `Import only accepts an iCalendar (.ics) calendar.`
- A typed VEVENT (`E2E TAP to Lisbon`, 15 Sept 2026 08:00–10:30 local, location text Porto Airport) opened review as HIGH CONFIDENCE · PENDING. Accept stayed disabled until a trip was chosen.
- Accepting onto Coullons wrote a planned unpaid booking. Coullons Companion showed EARLY BOOKING CONTEXT for that title. Bookings showed `1 booking`, `0 confirmed`, `0 paid`. The booking was then deleted; Bookings returned to empty and Companion no longer listed it. Nagawa, Strathpeffer, and Coullons remained the only trips.
- Discover opened Best time (Bergen sourced months plus Visit Norway citation, no trip created), the Ready-made journeys list, and empty Saved ideas. World still showed 3 planning places. Profile still showed Travel DNA and Saved ideas. iOS, file picking, `PRAGMA user_version = 11`, saving a wishlist idea, and Create Trip from Best time or a journey were not exercised.

Import ICS file picker V1 verification on 2026-09-02 rebuilt the Android debug development client with `npx expo run:android --no-bundler` after `expo-document-picker` 57.0.1 autolinked. The pass re-ran `npx tsc --noEmit` and `npm test` (194 application tests passing, including the calendar-file suite). `git diff --check` was clean. On Pixel 8, Home still showed Nagawa as HAPPENING NOW with 3 trips / 0 completed. `/import` showed CHOOSE FILE. The system document picker opened, `e2e-ferry.ics` from Downloads produced HIGH CONFIDENCE · PENDING for `E2E Ferry to Split` (20 Sept 2026 09:00–16:00 local, location text Port of Split), and Recent reviews labelled the batch `e2e-ferry.ics`. No booking was written. iOS was not rebuilt.

Import email-wrapped iCalendar V1 verification on 2026-09-02 re-ran `npx tsc --noEmit` and `npm test` (201 application tests passing, including the calendar-extract suite). `git diff --check` was clean. On Pixel 8, choosing `e2e-email.eml` from Downloads opened review as HIGH CONFIDENCE · PENDING for `E2E Email Catamaran` (21 Sept 2026 11:00–15:00 local, location text Hvar harbour). Recent reviews labelled the batch `e2e-email.eml`. No booking was written. iOS was not rebuilt.

Import calendar ZIP V1 verification on 2026-09-02 re-ran `npx tsc --noEmit` and `npm test` (207 application tests passing, including the calendar-zip suite). `git diff --check` was clean. `fflate` 0.8.2 was added as a pure-JS unzip with no native rebuild. A Pixel 8 file-picker rehearsal for `e2e-calendars.zip` did not complete in that pass after adb stalled. A 2026-09-03 Pixel 8 pass chose `e2e-zip-ferry.zip` from Downloads and opened review as HIGH CONFIDENCE · PENDING for `E2E Zip Ferry` (20 Sept 2026 09:00–16:00 local, location text Port of Split) without writing a booking.

Import PDF-embedded iCalendar V1 verification on 2026-09-02 re-ran `npx tsc --noEmit` and `npm test` (212 application tests passing, including the calendar-pdf suite). `git diff --check` was clean. No native rebuild was required. An Android Pixel 8 rehearsal on 2026-09-03 chose `e2e-pdf-ferry.pdf` from Downloads and opened review as HIGH CONFIDENCE · PENDING for `E2E Pdf Ferry` (22 Sept 2026 08:00–12:00 local, location text Korcula quay) without writing a booking.

Import Office-embedded iCalendar V1 verification on 2026-09-02 re-ran `npx tsc --noEmit` and `npm test` (217 application tests passing, including the calendar-office suite). `git diff --check` was clean. No native rebuild was required. An Android Pixel 8 rehearsal on 2026-09-03 chose `e2e-office-ferry.docx` from Downloads and opened review as HIGH CONFIDENCE · PENDING for `E2E Office Ferry` (24 Sept 2026 08:00–12:00 local, location text Korcula quay) without writing a booking.

Import image-embedded iCalendar V1 verification on 2026-09-02 re-ran `npx tsc --noEmit` and `npm test` (223 application tests passing, including the calendar-image suite). `git diff --check` was clean. No native rebuild was required. An Android Pixel 8 rehearsal on 2026-09-03 chose `e2e-image-ferry.png` from Downloads and opened review as HIGH CONFIDENCE · PENDING for `E2E Image Ferry` (25 Sept 2026 08:00–12:00 local, location text Korcula quay) without writing a booking. Ticket photos without an embedded iCalendar fail closed. OCR was not added.

Multi-destination authoring V1 verification on 2026-09-02 re-ran `npx tsc --noEmit` and `npm test` (226 application tests passing, including destination add/reorder/remove and journey extra-city prefill). `git diff --check` was clean. No native rebuild was required. An Android Pixel 8 rehearsal on 2026-09-03 opened Lisbon and Porto from Ready-made journeys, prefilled Create Trip with DESTINATION 1 Lisbon and DESTINATION 2 Porto, created an isolated same-day trip, then added Coimbra through the native location picker on Trip Details and saved.

Day → Destination V1 verification on 2026-09-02 re-ran `npx tsc --noEmit` and `npm test` (232 application tests passing, including day assignment, destination upsert, same-trip triggers, and migration version 12). `git diff --check` was clean. No native rebuild was required. An Android Pixel 8 rehearsal on 2026-09-03 assigned Lisbon to Day 1 of that isolated trip. Plan showed Lisbon on the day. Companion then showed ON THE JOURNEY / LISBON for that assigned city instead of the combined destination line.

Memory / Travel Book workspace invalidation V1 verification on 2026-09-02 re-ran `npx tsc --noEmit` and `npm test` (234 application tests passing, including Memory and Travel Book workspace lifecycle coverage). `git diff --check` was clean. No native rebuild was required. No device rehearsal was run for this wiring.

Trip list batch read V1 verification on 2026-09-02 re-ran `npx tsc --noEmit` and `npm test` (237 application tests passing, including empty-list one-query, two-trip three-query hydration, and single-trip load). `git diff --check` was clean. No native rebuild was required. A later same-day Pixel 8 pass launched the installed development client against Metro (`adb reverse tcp:8081`), logged `Persistence self-test: PASS` and `Bootstrap ready`, and opened Home, Trips, World, and Profile. Home showed Nagawa as HAPPENING NOW with 3 trips / 0 completed. Trips listed Nagawa (Japan, 1–10 Sept 2026), Strathpeffer (16–23 Oct 2026), and Coullons (19–26 Nov 2026). World showed 3 mapped places including Nagawa and Strathpeffer. Profile glance showed 3 trips / 0 completed. Import was not opened. iOS was not exercised.

TripRuntimeState integrity V1 verification on 2026-09-02 re-ran `npx tsc --noEmit` and `npm test` (242 application tests passing, including same-trip triggers, day/stop unlink, invalid-link archive, and migration version 13). `git diff --check` was clean. No native rebuild was required. Runtime state was not activated as lived Companion progress. Version 13 later ran on the 2026-09-03 Android 7–15 upgrade path below.

Stop-day same-trip V1 verification on 2026-09-02 re-ran `npx tsc --noEmit` and `npm test` (245 application tests passing, including same-trip stop/day inserts, cross-trip rejection, and migration version 14 archive/unlink). `git diff --check` was clean. No native rebuild was required. Version 14 later ran on the 2026-09-03 Android 7–15 upgrade path below.

Memories day/stop FK V1 verification on 2026-09-02 re-ran `npx tsc --noEmit` and `npm test` (249 application tests passing, including declared Memory foreign keys, day/stop unlink, Travel Book membership preservation, dangling-ID cleanup, and migration version 15). `git diff --check` was clean. No native rebuild was required. The 2026-09-03 Android rehearsal below is the device evidence for this integrity change.

Recovery-archive coverage V1 verification on 2026-09-02 re-ran `npx tsc --noEmit` and `npm test` (253 application tests passing, including v3 Memory/runtime retarget from an archived duplicate day, v5 missing-stop booking archive, v6 missing Accommodation link archive, and v7 missing Memory day/stop archive). `git diff --check` was clean. No native rebuild was required. No device rehearsal was run. There is still no user-facing archive inspection tool.

Lint / baseline CI V1 verification on 2026-09-02 re-ran `npx tsc --noEmit`, `npm test` (253 application tests passing), and `npx eslint .` (0 errors, existing React Compiler and style findings as warnings). `git diff --check` was clean. The GitHub Actions workflow was not executed on GitHub because there is no remote. No native rebuild was required.

Expo SQLite Android rehearsal 7–15 on 2026-09-03 re-ran `npx tsc --noEmit` and `npm test` (253 application tests passing, including a v15 rebuild fixture that already has the v7 itinerary unlink triggers). `git diff --check` was clean. No native rebuild was required. The installed Pixel 8 `com.travelos.app` development client was launched against Metro (`adb reverse tcp:8081`). The first upgrade failed during `DROP TABLE memories` because v7 `unlink_memories_after_day_delete` still pointed at that table (`no such table: main.memories`). v15 now drops Memory relationship guards before the rebuild and reinstalls them afterwards. After that fix, development logs reported `SQLite user_version 15`, Memory foreign keys `stop_id,day_id,trip_id`, `Persistence self-test: PASS`, and `Bootstrap ready`. Home showed Nagawa as HAPPENING NOW (1–10 Sept 2026) with 4 trips / 0 completed. Trips listed four planned journeys: Nagawa (Japan, 1–10 Sept 2026), Strathpeffer (16–23 Sept 2026), Strathpeffer (16–23 Oct 2026), and Coullons (19–26 Nov 2026). No trip was created or deleted in this pass. iOS was not exercised.

Import extractors, wishlist, journey Create Trip, multi-destination, and Day → Destination Pixel 8 rehearsal on 2026-09-03 used the same installed client. Choosing `e2e-zip-ferry.zip`, `e2e-pdf-ferry.pdf`, `e2e-office-ferry.docx`, and `e2e-image-ferry.png` from Downloads each opened HIGH CONFIDENCE · PENDING without writing a booking. Discover saved Slow days in Porto, listed it under Saved ideas, then removed it to NOTHING SAVED YET. Lisbon and Porto opened Create Trip with both catalogue cities already filled; confirming created an isolated `Lisbon` trip for 3 Sept 2026. Plan assigned Lisbon to Day 1. Trip Details added Coimbra through the native location picker and saved. Delete confirmation was opened then cancelled, so that isolated trip remains on device. iOS was not exercised.

Phase 1 remaining trip-core V1 verification on 2026-09-03 re-ran `npx tsc --noEmit` and `npm test` (258 application tests passing, including destination provenance, traveler FX conversion, booking finance, optional trip owner, and migration version 16). `git diff --check` was clean. No native rebuild or device rehearsal was run for version 16.

Day clock V1 verification on 2026-09-03 re-ran `npx tsc --noEmit` and `npm test` (261 application tests passing, including assigned-city clock, two-city fail-closed, and Companion NOW/NEXT from an assigned timezone). `git diff --check` was clean. No native rebuild or device rehearsal was run.

Home day clock V1 verification on 2026-09-03 re-ran `npx tsc --noEmit` and `npm test` (265 application tests passing, including batched TripDay list reads and Home featured-trip clock coverage). `git diff --check` was clean. No native rebuild or device rehearsal was run.

Stop-boundary refresh V1 verification on 2026-09-03 re-ran `npx tsc --noEmit` and `npm test` (266 application tests passing, including next-stop timer coverage). `git diff --check` was clean. No native rebuild or device rehearsal was run.

Stop lived phase V1 verification on 2026-09-03 re-ran `npx tsc --noEmit` and `npm test` (274 application tests passing, including done/skipped overlay, derived delayed, same-trip lived-state triggers, cascade delete, and a runtime pointer that does not rewrite Plan times). `git diff --check` was clean. No native rebuild or device rehearsal was run for version 17.

Map day framing + directions V1 verification on 2026-09-03 re-ran `npx tsc --noEmit` and `npm test` (280 application tests passing, including assigned-city day framing, unassigned-day fail-closed, view-all coordinates, and system-maps pin URLs without a route). `git diff --check` was clean. No native rebuild or device rehearsal was run.

Companion plan-change notice V1 verification on 2026-09-03 re-ran `npx tsc --noEmit` and `npm test` (290 application tests passing, including silent first load and lived-progress, plus named notices for dates, day assignment, stops, bookings, stays, and mixed edits). `git diff --check` was clean. No native rebuild or device rehearsal was run.

Offline essential context V1 verification on 2026-09-03 re-ran `npx tsc --noEmit` and `npm test` (299 application tests passing, including unknown-vs-offline reachability, SQLite pin counts without invented coordinates, and Companion/Map notices that do not claim a cached route). `git diff --check` was clean. `expo-network` ~57.0.1 was added; a native rebuild is required before device rehearsal. No native rebuild or device rehearsal was run.

World planned vs lived V1 verification on 2026-09-03 re-ran `npx tsc --noEmit` and `npm test` (306 application tests passing, including completed-trip-is-not-a-visit, skipped and unassigned-day fail-closed, and no title-fusion across trips). `git diff --check` was clean. No native rebuild or device rehearsal was run.

World archive V1 verification on 2026-09-03 re-ran `npx tsc --noEmit` and `npm test` (310 application tests passing, including unlinked and planned-city memories staying off World, lived archive counts from explicit day/stop IDs, and no invented photo cover). `git diff --check` was clean. No native rebuild or device rehearsal was run.

Memory media contract V1 verification on 2026-09-03 re-ran `npx tsc --noEmit` and `npm test` (316 application tests passing, including owned vs gallery URIs, path-traversal fail-closed, trip-delete URI collection, and an explicit no-export contract). `git diff --check` was clean. No native rebuild or device rehearsal was run.

Local-dev AI boundary V1 verification on 2026-09-03 re-ran `npx tsc --noEmit` and `npm test` (319 application tests passing, including loopback-only AI URLs, ignored cloud hosts, and an explicit no-production-provider contract). `git diff --check` was clean. No native rebuild or device rehearsal was run.

Grounded Destination Sourcing V1 verification re-ran `npx tsc --noEmit` and `npm test` (138 application tests passing, including the new corpus/sourcing suite) plus the unchanged server suite. No native device run was performed for that service-layer milestone.

Android Pixel 8 development-build rehearsal on 2026-09-02 (installed `com.travelos.app`, Metro, AI server `PORT=8789`, `adb reverse`, live Ollama `bge-m3` / `qwen3:4b`):

- Home featured the active Nagawa trip as HAPPENING NOW (1–10 Sept 2026) with 3 trips / 0 completed. Companion showed ON THE JOURNEY, Day 2 of 10, without inventing live timing.
- Discover Find me somewhere ranked Porto first from explicit Romantic/Slow plus Travel DNA fallbacks. Hybrid retrieve added grounded SEMANTIC MATCH extras. Porto accepted a FROM THE CATALOGUE explanation. Rome fail-closed. Choosing a destination opened Create Trip with FROM DISCOVER and did not write SQLite until confirm.
- An isolated Barcelona trip (5–8 Dec 2026) was created from Discover, opened as BEFORE THE JOURNEY with a 94-day countdown, then deleted through Trip Details. Trips returned to the original three: Nagawa, Strathpeffer, Coullons.
- Plan showed derived FREE TIME and live TRAVELOS IDEAS without inserting stops. Map, Bookings, More, Memories list, Travel Book draft, World, Profile, and Travel DNA opened. iOS was not exercised. Camera capture, Travel Book cover/publish, and migration `PRAGMA user_version = 9` were not claimed.

Missing release foundations:

- A GitHub Actions workflow is committed, but there is still no git remote, so CI has not run on GitHub.
- Test coverage is intentionally narrow and does not yet cover every repository, cascade, trip-state rule, an iOS database upgrade, or a broad sample of real historical databases.
- Lint is committed and non-interactive. Existing React Compiler findings remain warnings rather than CI failures.
- No EAS build or submit configuration.
- No iOS release configuration.
- No production observability or crash reporting.
- No backup, export, account, or sync mechanism.
- No verified accessibility, device-offline, performance, upgrade, or destructive-migration test plan. Offline essential context V1 has Node tests for reachability and missing pins; it has not been rehearsed on a device without a network.
- Android Expo SQLite now has a live `user_version = 15` rehearsal. Migrations 16 and 17 are in code and Node tests only. iOS still has no recorded migration-3, 7–15, 16, or 17 rehearsal. `expo-network` 57.0.1 is in the package graph and needs a native rebuild before device use.

## Production-quality versus prototype

### Production-oriented foundations

- One canonical Trip domain direction.
- Explicit entity IDs and repository interfaces.
- SQLite as durable local truth with WAL, foreign keys, migrations, and bound queries.
- Domain/repository/service separation.
- Strict TypeScript.
- Expo Router-based native navigation.
- Persisted itinerary and booking CRUD.
- Atomic, idempotent, self-healing canonical TripDay generation.
- Atomic stop reorder that preserves stop identity and content.
- Forward-only migrations through version 17, including duplicate-day archival, Booking/Accommodation/Memory relationship cleanup, Travel DNA, trip intent/pace, saved Discover candidates, Memory day/stop foreign keys, destination place identity and timezone provenance, traveler FX rates, optional trip-owner membership, and explicit done/skipped lived-stop phases.
- A dependency-free automated persistence test baseline, later extended with DNA, Discover, AI-context, and itinerary-flexibility tests. Cursor handoff verification re-ran the current Node suites (see Testing and release readiness).
- A route-scoped, revision-aware TripWorkspace lifecycle that keeps SQLite authoritative and shares current data across Trip Space tabs.
- Explicit trip loading, refresh, not-found, recoverable error, and fatal bootstrap states.
- A deterministic upcoming/active/completed Companion selector with exact-day selection, conservative NOW/NEXT rules, truthful Booking/Accommodation/Map context, and no duplicate durable state.
- A centralized injectable-clock runtime resolver with explicit canonical-destination timezone or device-fallback provenance, exact active TripDay selection, and no first-destination shortcut.
- Shared strict calendar/local-time utilities plus native Create Trip, Booking, and optional Stop start/end date/time controls that preserve compatible historical data.
- Real selected coordinates persisted and rendered as map pins.
- Provider-neutral canonical destination validation, native selection-only Create Trip, explicit ID-preserving legacy/structured replacement, and multi-destination-safe map consumption without invented timezone or currency.
- Separate accounting-currency concept.
- A service-backed Budget & Expenses flow with truthful same-currency aggregation and original-currency preservation.
- A service-backed canonical Trip Details editor with strict date validation, metadata-preserving destination handling, budget-aware accounting-currency safety, optional intent/pace, and verified cascade deletion.
- An explicit zero-or-one Booking → TripStop relationship with same-trip enforcement, zero-to-many reverse cardinality, lossless stop deletion, service/repository validation, and contextual TripWorkspace-backed UI.
- An explicit Trip → Accommodation aggregate with optional same-trip Booking and TripStop IDs, service and database enforcement, lossless unlink/delete behavior, native validated CRUD, and restrained Companion/Bookings/Map context.
- A reusable canonical Traveler identity with explicit many-to-many Trip membership, exact-ID selection, atomic creation, duplicate prevention, shared edits, membership-only removal, and verified Trip-deletion preservation.
- Native Memories and Travel Book flows with same-trip ID links, local media copies for photos, an explicit no-backup/no-export media contract, and migration-v7 integrity guards.
- An explicit local Travel DNA singleton that stores only user-chosen preferences.
- Curated Discover matching that cannot invent destinations, with an explicit Create Trip confirmation handoff.
- A functional More hub that distinguishes implemented navigation from planned modules.
- A coherent early visual language.

These pieces are promising foundations; they do not make the app production-ready on their own.

### Prototype or incomplete implementation

- Day → Destination assignment is implemented for Plan, Companion, and Home featured-trip phase. Remaining gaps are a picker-supplied place ID and a destination-currency source.
- Companion V2 remaining live-data layers. Stop lived phase V1 persists explicit done/skipped marks without rewriting Plan. Delayed is derived. Stop-boundary refresh V1 is implemented for canonical stop start/end times. Companion plan-change notice V1 names saved itinerary, booking, and stay edits while Companion is open, without a second durable store. Offline essential context V1 uses SQLite as the cache and names no-network / missing-coordinate states; it does not cache tiles or routes. Destinations may store an IANA timezone from catalogue, traveler, or a future provider field; the installed picker still does not return one. Two assigned cities claiming today still fall back instead of guessing.
- Discover live provider catalogues and reranking. Best time V1, Ready-made journeys V1, and Wishlist V1 are implemented in code over grounded catalogue identities. Semantic retrieval and opt-in grounded explanations exist as local-dev lanes over those identities.
- Broader import formats. Native import now extracts iCalendar from paste, a chosen file, UTF-16 calendar bytes, an email `text/calendar` part, a zip of those calendars, a PDF that embeds an iCalendar, an Office Open XML document whose visible text contains an iCalendar, or a JPEG/PNG/GIF/WEBP file whose metadata contains an iCalendar. Image OCR of confirmation photos and AI parsing of confirmation prose remain out. Android Pixel 8 rehearsed choosing a local `.ics` file, an `.eml` with a calendar part, a zip, a PDF, a Word document, and a PNG whose metadata contains an iCalendar. iOS was not rebuilt.
- Production AI remains local-dev only. Local-dev AI boundary V1 ignores a non-loopback `EXPO_PUBLIC_TRAVELOS_AI_URL`, does not retain itinerary in a cloud provider, and degrades when the local server is unreachable. There is still no billed production AI provider.
- Advanced accommodation capabilities and the remaining booking actions/provider integrations.
- Map intelligence beyond day framing, in-app routes, travel times, and offline tiles. Map day framing + directions V1 frames the assigned city and that day’s mapped stops, and can hand a saved pin to Apple Maps or Google Maps. Offline essential context V1 names missing pins and that live tiles need a network.
- Traveler owner/role/invitation/permission workflows beyond the local owner V1, and runtime-state UI.
- World lived-history semantics beyond explicit done-stop labels plus ID-linked memories on lived cards. World archive V1 does not use trip status, destination titles, skipped stops, wishlist rows, or unlinked notes as visits. Memory media contract V1 defines backup and export as none; cloud backup remains later.
- Shared UI primitives and accessibility.
- iOS platform setup.
- Tests, CI, EAS, release operations, sync, backup, and observability.

## Overall assessment

TravelOS is a broader native vertical prototype than the 2026-08-23 snapshot described, and still not a production application. Phase 0A protects the highest-risk day-generation, ordering, and migration paths. Phase 0B establishes one reliable reactive lifecycle for the current Trip Space. Budget & Expenses, Trip Details, Booking ↔ Stop, Accommodation, Travelers, Time & Runtime Truth, Companion V1, Canonical Destination Authoring, and UX Refinement V1 remain the earlier completed core. After that, Memories V1 and Travel Book V1 give completed trips an on-device record and story, Memory media contract V1 makes photo-copy ownership, deletion, offline, and no-backup/no-export behavior explicit, shared readiness selection keeps Companion honest about preparation, Travel DNA plus trip intent/pace give Discover and Create Trip explicit preference language, Plan can show knowable free time and conflicts, AI Foundation V1 can advise on free time without writing trip truth, Local-dev AI boundary V1 keeps that client on loopback with no production provider, Discover Experience V1 can recommend grounded destinations that become canonical only after Create Trip confirmation, Grounded Destination Sourcing V1 loads those destinations from explicit provenance-backed packs, and Semantic Discover V1 can add extra grounded catalogue identities from local retrieval without replacing deterministic matching, with opt-in grounded explanations of those catalogue facts. World and Profile are no longer empty tabs. World now distinguishes planned vs lived destinations from explicit done-stop evidence and can show ID-linked memories on lived cards, but it is still thin compared with the trip workspace.

The latest local git work is on `docs/expo-sqlite-rehearsal-7-15`, from Lint / baseline CI V1 (`6987ce3`). An Android Pixel 8 Expo SQLite pass upgraded the installed development database to live `user_version = 15`. Migrations 16 and 17 are implemented in code and covered by Node tests; they have not been rehearsed on device. There is still no usable git remote for push.

The immediate planned product-development sequence is now: Discover reranking remains open until a real rerank serving path can be measured. A BGE reranker is still the candidate and was not installed. Phase 1 remaining trip-core work, Day clock V1, and Stop lived phase V1 are implemented. Semantic Discover V1 retrieval, grounded explanations, Best time V1, Ready-made journeys V1, Wishlist V1, and Import Review Queue V1 are implemented. Multi-destination authoring V1 lets a traveler add, reorder, and remove real destinations on Create Trip and Trip Details, including extra catalogue cities from a journey idea. Day → Destination V1 lets Plan assign a day to one of those cities; Day clock V1 uses that city as the Companion clock when it has a saved timezone and is uniquely today. Home uses the same clock for featured-trip phase. Companion also refreshes NOW/NEXT at the next saved stop start or end while the screen stays open, can mark a stop done or skipped without rewriting Plan, names saved itinerary, booking, or stay edits that happen while Companion is already open, and names when trip facts stay on-device without a network. World labels destinations planned or lived from done-stop marks and Day → Destination IDs rather than trip status, and lived cards can show ID-linked memories. Memory photo copies are owned app-document files with no backup or export; trip and memory deletes clean those copies after SQLite. Memory and Travel Book writes now refresh the shared trip workspace. The trip list loads destinations and traveler memberships in batched queries. Optional TripRuntimeState day/stop IDs are same-trip protected and written only as a last explicit lived-stop pointer. A TripStop day must belong to the same trip. Memory day and stop IDs now have declared `ON DELETE SET NULL` foreign keys. An Android Pixel 8 Expo SQLite rehearsal on 2026-09-03 upgraded the installed database to live `user_version = 15` with those Memory foreign keys. A later same-day Pixel 8 pass reviewed zip/PDF/Office/image calendars without writing bookings, saved and removed a wishlist journey, created an isolated Lisbon trip from Lisbon and Porto with both cities prefilled, assigned Lisbon to Day 1, and added Coimbra through the location picker. That isolated trip remains on device because delete confirmation was cancelled. iOS was not exercised. AI must not become a destination source. BGE-M3, a BGE reranker, and Qwen are candidates to benchmark, not permanent architecture commitments. Important open engineering and release work remains—iOS Expo SQLite rehearsal, remaining visual/accessibility matrix, Companion live-data layers, a live FX feed, picker timezone enrichment, image OCR, CI/EAS, and backup/sync—but that work does not replace the Discover sequence above.
