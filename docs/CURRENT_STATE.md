# TravelOS Current State

Snapshot date: 2026-09-01

This file describes verified implementation, not intended behavior. Unknown or unverified capabilities are called out explicitly.

Evidence classes used throughout:

- **Implemented in code** — present in the native repository at HEAD.
- **Automated-test evidence** — covered by committed Node tests. Handoff verification of `npx tsc --noEmit`, `npm test`, and `server` `npm test` is recorded under Testing and release readiness when those commands were run. Device tests are never implied by unit-test evidence.
- **Android/device verified** — claimed only where an earlier milestone recorded an emulator rehearsal. Those claims stop at UX Refinement V1 unless restated.
- **Not re-verified on device** — later milestones exist in git and code, but this pass did not install, launch, or smoke-test a native build. Empty later commit bodies are not treated as device evidence.

## Repository checkpoint

- Current development branch: `feature/grounded-destination-sourcing-v1`
- Branch point: `735c964` — chore: complete Cursor project handoff
- Discover Experience V1 remains `f714127`
- Grounded Destination Sourcing V1 is the newest milestone and is committed on this branch.
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
| Native runtime | expo-dev-client development build |
| Native date input | @react-native-community/datetimepicker 9.1.0 |
| Memory media | expo-image-picker, expo-file-system, expo-image |
| Optional local AI backend | `server/` Express package (`travelos-ai-server`) with a client `AIAPIClient` |
| Styling | Local design tokens and React Native StyleSheet-based screen styling |

The package currently has start, Android, iOS, web, reset-project, lint, and automated test scripts. There is no CI workflow, EAS configuration, or non-interactive lint configuration.

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

Memory and Travel Book writes currently go through `memoryService` / `travel-book-service` from their screens rather than TripWorkspace actions. Memories then sync local UI from `workspace.memories` when that snapshot changes. Those writes sit outside the shared mutation/invalidation contract, so other Trip Space consumers can remain stale until a later workspace reload. That is an implemented lifecycle gap, not a second database.

Travel DNA is a singleton local profile loaded through `TravelDNAService`. It is not part of the trip aggregate and is not inferred from trip data.

Pure time utilities define calendar dates, local wall-clock values, compatible historical date-times, timezone resolution, and an injectable-clock Trip runtime resolver. Companion and Home derive live phase from those utilities rather than durable workflow status. A pure Companion selector adds transient relevance without creating durable Companion state. Shared `selectTripReadiness` supplies canonical in-range days and preparation counts to Companion. The Companion screen recomputes on focus, foreground return, and the exact next resolved local calendar boundary using a calculated timer rather than polling.

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
- Runtime timezone resolution uses a saved valid IANA timezone only when one destination supplies it or every saved destination supplies the same one. Missing, invalid, or differing timezones produce an explicit device-calendar fallback; destination order is never temporal authority.
- The deterministic resolver derives upcoming, active, completed, or unknown phase, the calendar date used, timezone provenance, and an exact current TripDay only when its date matches. Its clock is injectable for boundary tests.
- Durable `Trip.status` remains organizational and cannot override runtime date truth. Persisted `TripRuntimeState` is not required by the resolver and remains reserved for future explicit companion progress/lived state.
- Multi-destination Trips need an explicit Day → Destination relationship before TravelOS can select different destination timezones across one journey.
- Knowable free-time gaps are derived only between consecutive same-day stops when the earlier stop has a valid end time, the later stop has a valid start time, and itinerary order agrees with those times. TravelOS does not invent free time before the first stop, after the last stop, or across untimed moments.
- Time conflicts are derived only from overlapping known start/end ranges on the same day.

## SQLite and migrations

The database is the current durable source of truth. Verified characteristics include:

- SQLite WAL mode and foreign-key enforcement are enabled.
- The current database version is **9** (`DATABASE_VERSION` in `src/data/database/migrations.ts`).
- The core schema contains 15 tables: trips, trip_destinations, trip_days, trip_stops, travelers, trip_travelers, travel_dna, bookings, accommodations, budgets, budget_items, trip_runtime_states, memories, travel_books, and travel_book_memories. Migrations also add recovery archives for reconciled duplicate TripDays, invalid historical Booking ↔ Stop links, invalid historical Accommodation links, and invalid historical Memory / Travel Book links.
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
- Canonical Trip updates persist the trip row, ordered destination records, and traveler links in one transaction while preserving destination IDs and metadata. Optional intent and pace persist on the trip row.
- Trip deletion remains one atomic SQLite statement and relies on verified foreign-key cascades for trip-owned data. Independent traveler records survive because only trip membership belongs to the deleted trip. The Travel DNA singleton is not trip-owned and is not deleted with a trip.
- Accommodation create and update validate required stay facts, real local date-time values, `checkInAt <= checkOutAt`, and same-trip optional booking/stop IDs. Deleting an Accommodation does not delete or mutate its linked Booking or TripStop; deleting a linked Booking or TripStop unlinks the Accommodation through `ON DELETE SET NULL`.
- Traveler creation plus first membership is atomic. Existing identities are added only through an exact selected Traveler ID, duplicate membership is rejected, canonical edits are visible in every Trip that contains that ID, and membership removal never deletes the identity.
- Travelers required no dedicated migration when that flow shipped: the released schema already has independent `travelers` rows, a composite `(trip_id, traveler_id)` membership primary key, and foreign keys that delete memberships—but not identities—when a Trip is deleted. Migration version 7 was later used for Memory / Travel Book integrity, not travelers.
- Time & Runtime Truth requires no migration: existing Trip and TripDay dates remain canonical text calendar values, stop and Accommodation values remain local wall-clock data, compatible Booking values retain their stored semantics, and metadata timestamps remain true instants.
- Canonical Destination Authoring requires no migration: `trip_destinations` already stores destination identity, ordered Trip membership, name, country code, latitude, longitude, timezone, and destination currency. Existing name-only rows remain readable and are upgraded only by an explicit user selection.
- Migration version 7 archives invalid Memory → TripDay / TripStop links and invalid Travel Book → Memory memberships, then unlinks only those invalid relationships. Memory and Travel Book content survives. Triggers reject cross-trip or day/stop-mismatched Memory links and cross-trip Travel Book memberships. Deleting a linked day or stop unlinks the Memory rather than deleting it.
- Migration version 8 creates the singleton `travel_dna` table (`singleton_key = 1`).
- Migration version 9 adds nullable `intent` and `pace` columns to existing `trips` rows. Existing trips keep both fields unset. Fresh schema already includes the columns; the migration checks before altering.

Important remaining gaps:

- Cross-table invariants do not yet prove that a stop's trip ID matches its TripDay's trip ID.
- `memories.day_id` / `memories.stop_id` still lack declared foreign keys in `DATABASE_SCHEMA`; same-trip and unlink behavior is enforced by migration-v7 triggers rather than SQLite foreign keys. TripRuntimeState day/stop references are still not fully protected by foreign keys.
- Memory and Travel Book product mutations are not yet TripWorkspace actions, so shared-tab invalidation is not automatic for those writes.
- Trip-list loading performs repeated related-data queries and will not scale well.
- Relationship cardinality and service aggregation still need explicit decisions for runtime state and some remaining aggregates. Booking ↔ Stop, Accommodation, Memory, and Travel Book relationships are now explicit.
- TripDay records outside an edited trip date range are preserved and placed after the canonical range; no product flow exists yet for resolving them.
- Multi-destination Trips still lack a Day → Destination relationship. Runtime calculations use a destination timezone only when every relevant saved destination has the same valid IANA timezone; otherwise the resolver reports an explicit device-calendar fallback. The current native picker does not provide timezone data, so securely enriching a selection requires Google Time Zone API enablement and a separately restricted service/server boundary (or a picker/provider that returns a reliable IANA timezone); the Android Maps key is not reused for a client-side web-service call.
- Archived migration-v3 duplicate-day metadata and migration-v7 invalid-link archives are retained for recovery but have no user-facing inspection tool.
- Historical Android Expo SQLite rehearsals verified upgrades through `user_version = 6`. This documentation pass did not re-open a device database, so live `PRAGMA user_version = 9` on an installed development build is **not** claimed. Node tests exist for versions 7–9. Equivalent iOS rehearsals are still outstanding.

Historical migrations must not be edited to repair remaining issues. Corrections require new migrations.

## Implemented native flows

### Global navigation

The primary tab structure is:

- Home
- Trips
- Discover
- World
- Profile

Home, Trips, Discover (Find me somewhere plus Create Trip entry), World, and Profile (Travel DNA plus local stats) are functional product surfaces. Discover still labels Best time and Ready-made journeys as future. Profile still labels notifications and account/sync as future.

### Trips and trip creation

Implemented behavior includes:

- Persisted trip list.
- Creating a trip with title, one real native-selected destination, native validated start/end calendar dates, accounting currency, and optional trip intent and pace. Free-form destination creation is no longer accepted.
- Opening a trip-specific workspace.
- Automatic TripDay creation from the trip date range.
- Editing the canonical trip title, dates, accounting currency, lifecycle status, intent, and pace from Trip Details, plus explicitly replacing or upgrading an existing destination through the same native real-location picker.
- Deleting a trip through a destructive native confirmation that names the related local data being removed.
- Create Trip can be prefilled from Discover when the traveler accepts a curated destination. Prefill uses route params for grounded destination facts plus optional exact dates, intent, and pace. Flexible Discover timing is not converted into canonical trip dates.

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
- Location-aware replacement preserves the destination ID and order while atomically replacing the selected place facts. Unrelated Trip metadata, travelers, accounting currency, and created timestamp remain intact.
- Historical name-only destinations stay visible and loadable, and can be upgraded only through an explicit map selection. Structured destinations are not editable as disconnected text. Destination add, remove, and reorder remain outside this flow.
- Manual status choices cover draft, planned, completed, and archived. An existing active status is preserved, but a future trip cannot be manually marked active because active truth needs date/runtime derivation.
- Accounting currency cannot be changed once a persisted Budget exists. No amount is relabelled, converted, or assigned an invented exchange rate.
- Trip deletion uses a destructive native confirmation, routes safely back to Trips, refreshes the global list cache, and leaves the deleted workspace in not-found state rather than retaining stale data.

Current limitations include the unfinished multi-destination workflow, no Day → Destination timezone mapping, no archive/recovery or backup for deletion, and no complete currency selector. Intent and pace editing exist in code; they were not re-verified on a device during this documentation pass.

### Canonical Destination Authoring

Implemented behavior includes:

- One provider-neutral destination-authoring service validates real coordinates and optional country, timezone, and currency codes without inferring missing facts.
- Create Trip requires the existing native picker and persists one real selected destination. Trip Details uses the same picker to replace a structured destination or upgrade a historical name-only destination while preserving its TravelOS ID and order.
- Picker-returned locality/region/name/address and country context produce the saved display label. The current provider result does not expose a durable place ID, timezone, or currency, so none is invented or silently derived.
- SQLite hydration and persistence round-trip the full existing destination record losslessly. No schema migration was required.
- Map frames every mapped destination together with every mapped itinerary stop and renders distinct destination markers. Plan uses a destination coordinate as picker context only when exactly one mapped destination makes that context unambiguous.
- Companion uses calm missing-timezone fallback copy and never shows exact NOW/NEXT timing without a saved reliable IANA timezone.
- Trip-space headings use the full saved destination context instead of silently treating the first destination as authoritative.

Current limitations include no destination add/remove/reorder UI, no stable provider place ID in the installed picker result, no secure timezone enrichment boundary, no destination-currency source, and no Day → Destination relationship. Provider enrichment, multi-destination authoring, and iOS verification remain future work.

### Budget & Expenses

Implemented behavior includes:

- One persisted budget per trip, denominated in the Trip's accounting currency.
- Planned amount updates that preserve existing expenses.
- Actual expense add, edit, and delete with title, positive amount, original currency, category, explicit date, optional notes, and optional booking/stop links by ID.
- Service validation that linked bookings and stops belong to the same trip.
- Planned, spent, remaining, progress, category breakdown, and a dated expense list.
- Accounting totals that include only paid expenses whose currency matches the Trip accounting currency.
- Foreign-currency paid expenses grouped and displayed separately in their original currencies, with explicit copy that no exchange rate or conversion was assumed.
- Legacy planned or committed budget items remain persisted and visible but are not represented as actual spend.
- A dedicated native Budget screen reached from More, with native date selection and shared TripWorkspace loading, refresh, error, and not-found behavior.

Current limitations include no FX-rate source or conversion provenance, no receipt/media capture, no recurring/shared/split expense model, no decimal-minor-unit money type, and no iOS runtime rehearsal. Currency entry uses validated three-letter codes rather than a complete currency selector.

### Accommodation

Implemented behavior includes:

- A dedicated native Accommodation screen reached from More with loading, empty, ready, refresh, recoverable-error, and trip-not-found handling from TripWorkspace.
- Multiple stays per trip, sorted by check-in date/time with undated legacy records retained after dated stays.
- Add, edit, and delete for name, type, address, check-in/out, optional lodging Booking, optional TripStop, phone, website, and notes.
- Native date/time selection with validated destination-local wall-time persistence and `check-in <= check-out` enforcement. TravelOS does not invent or apply timezone conversion while canonical trip timezone rules remain undefined.
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

Current limitations include no trip owner or default “Me” identity, no roles, invitations, permissions, reservation ownership, expense splitting, emergency contacts, or global identity-library management. Create Trip still starts with zero Traveler memberships; the empty state is intentional for planning, while any future one-or-more enforcement must be designed together with owner identity and Create Trip. Canonical identity deletion is not exposed in the product UI. No iOS runtime rehearsal has been completed.

### Memories V1

Implemented in code:

- A dedicated native Memories route reached from More, using TripWorkspace loading/not-found behavior and focus refresh.
- Create, edit, and delete for note and photo memories attached to the open Trip by ID.
- Optional exact TripDay and TripStop links from that Trip. Names are presentation only.
- Photo capture or library selection through `expo-image-picker`, with copies persisted under app document storage (`travelos/memories/`). TravelOS does not invent coordinates or capture times beyond the saved record.
- Grouping by linked day when a valid day ID exists; unlinked memories remain visible.
- Domain `video` type is retained for compatibility and is not offered as a create/edit type.

Automated-test evidence: migration version 7 archives invalid historical Memory links, preserves valid memories, and rejects new cross-trip or mismatched day/stop links. A dedicated Memories product-flow test file is not present.

Not re-verified on device during this documentation pass: camera/library permissions, media copy durability across relaunch, and More-count refresh after Memory writes.

Current limitations include no video authoring, no cloud backup of media, Memory writes outside TripWorkspace actions, and no iOS rehearsal.

### Travel Book V1

Implemented in code:

- A dedicated native Travel Book route reached from More.
- One Travel Book per Trip.
- Title, optional summary, optional cover image taken only from a selected photo memory's saved media URI, ordered Memory membership from the same Trip, and a local `isPublished` flag.
- Cover and membership validation refuse memories from another trip and refuse a cover URI that is not among the selected photo memories.
- `isPublished` is a local library flag. It is not a cloud publish, share, or export pipeline.

Automated-test evidence: migration version 7 covers invalid Travel Book membership cleanup. A dedicated Travel Book screen test is not present.

Not re-verified on device during this documentation pass.

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

Not re-verified on device during this documentation pass.

Current limitations include no inferred traits, no scores, no AI-generated profile, no account identity, and no sync of the profile across devices.

### Trip Intent + Pace V1

Implemented in code:

- Optional `Trip.intent` and `Trip.pace` with database CHECKs matching the TypeScript unions.
- Create Trip and Trip Details expose those fields. Discover Brief can carry them for matching and Create Trip prefill.
- Values are trip-specific and optional. Existing trips remain unset until the traveler chooses them.

Automated-test evidence: `tests/trip-intent-migration.test.cjs` and Create Trip tests that persist intent/pace.

Not re-verified on device during this documentation pass.

### Companion V1

The former Today surface is now the first deterministic Companion. It consumes the centralized runtime resolver and the route-scoped TripWorkspace, then derives transient relevance through a pure selector with an injectable clock. SQLite remains durable truth, Zustand is not used as a second trip database, and `TripRuntimeState` has not been activated speculatively.

Implemented truth rules and behavior are:

- A single valid destination IANA timezone, or one valid timezone shared by every destination, supplies exact travel-local date and time. Missing, invalid, or differing timezones produce an explicit device-calendar fallback; destination order is never temporal authority.
- Upcoming Trips show a deterministic calendar-day countdown, first canonical TripDay preview, next safely dated local check-in, bounded early unlinked Booking context, and preparation signals derived only from Accommodation, Bookings, populated itinerary days, Travelers, and Budget data. Missing optional modules are not errors.
- Active Trips use only the TripDay whose canonical date exactly matches runtime truth and show `Day X of N`. When canonical timezone truth exists, a stop is `NOW` only if exactly one valid start/end range contains the local clock time. `NEXT` is the first canonical-order stop with a valid start at or after that time. Earlier, later, and untimed stops remain explicit; an untimed stop is never called current.
- When exact active timing cannot be proven, Companion suppresses NOW/NEXT and active unlinked Booking claims, retains the canonical Plan order, and explains the timezone limitation. Missing active TripDays and invalid trip dates render explicit safe states instead of substituting another day.
- Relevant stop Booking context uses exact `Booking.stopId` relationships, ignores cancelled Bookings, and exposes restrained status/provider/payment context. Unlinked Bookings are shown only when their local calendar context can be derived safely; no fuzzy relationship is created.
- Current-stay language requires exactly one Accommodation whose canonical local check-in/out interval contains the reliable trip-local time. Otherwise only safely dated check-in/check-out context is shown. Historical absolute-offset stay values are preserved but are not reinterpreted as local live-stay truth.
- Map actions appear only for stops that already have persisted numeric coordinates. The Map route can focus the exact requested stop and visually distinguish its existing marker; no route, ETA, or coordinate is invented.
- Completed Trips leave live mode, show saved counts and final-day history, and no longer present an active stop or stay as current. Memories / Travel Book now have product routes; Companion completed copy should be read against those shipped surfaces rather than as “future work only.”
- Runtime truth refreshes on route focus, app foreground return, and the next resolved local calendar-date boundary. The boundary calculation is DST-safe and uses one cleaned-up timer rather than polling.
- Trip-level loading, refresh, not-found, and recoverable read-error behavior remains shared with the other Trip Space screens.

Current Companion V1 limitations include no Day → Destination timezone relationship for multi-destination trips, no secure reliable timezone enrichment source, no persisted delayed/skipped/lived progress, no live provider data, notifications, routes, ETAs, weather, traffic, opening hours, recommendations, or AI. NOW/NEXT does not reschedule at each stop boundary while the screen stays continuously open; it refreshes at the required focus, foreground, and calendar-boundary lifecycle events. The Android rehearsal verified upcoming, incomplete/fallback, active canonical-day, linked Booking, mapped-stop, tab/lifecycle persistence, and completed non-live behavior with isolated data, then removed only that isolated trip. Exact canonical-timezone NOW/NEXT and Accommodation date-picker creation could not be exercised end-to-end because the current native destination provider does not return a timezone and the emulator diverted the native Accommodation picker into a system settings surface; deterministic selector tests cover those rules. Existing pre-test trip data survived, and bootstrap plus the persistence self-test passed after cold relaunch. iOS verification remains outstanding.

### Plan

Implemented behavior includes:

- Day-by-day itinerary rendering.
- TripStop create, edit, delete, and reorder.
- UI support for place, activity, food, and transport stop types.
- Native real-location selection.
- Persisted stop name, address, latitude, and longitude.
- Optional native `HH:mm` local wall-clock start **and end** time input with centralized validation (`stop-time`) and no invented timezone or conversion.
- Derived free-time gaps between consecutive knowable timed stops, shown on the day.
- Derived overlapping time conflicts, shown as explicit warnings rather than silently rewritten times.
- Optional “ask TravelOS” free-time advice that calls `AIContextService` plus `AIAPIClient.suggestForFreeTime`. The client posts to `{baseUrl}/ai/free-time`. Suggestions render in Plan and do not mutate the itinerary. If the gap changes before the response returns, the client rejects the advice. On failure, Plan reports that AI is unavailable and that the plan has not changed.
- The AI client uses `EXPO_PUBLIC_TRAVELOS_AI_URL` when set, otherwise `http://127.0.0.1:8789`. The local `server/` package defaults `PORT` to `8787` unless configured. That default mismatch exists in code; this pass did not run the backend or Plan advice on a device.

Current limitations include limited stop-type UI, no route or transit model, no place-provider ID persisted from the picker, no automatic insertion of AI suggestions as stops, and large screen-level implementations with duplicated presentation patterns. Plan shows a restrained booking count and a contextual action for relationships resolved by exact stop ID. Free-time/conflict derivation and AI client parsing have automated tests; native Plan UI and live Ollama advice were not re-verified on device during this documentation pass.

### Flexible Itinerary / Free Time V1

Implemented in code as the Plan capabilities above plus `src/services/itinerary-flexibility.ts`.

Automated-test evidence: `tests/itinerary-flexibility.test.cjs` and `tests/stop-time.test.cjs`.

Not re-verified on device during this documentation pass.

### AI Foundation V1

Implemented in code:

- Deterministic, provider-agnostic `AIContextSnapshot` built from canonical workspace data, Travel DNA, runtime truth, Companion selection, and derived free-time/conflicts. The snapshot is read-only.
- Native `AIAPIClient` that validates free-time advice payloads (provider/model, verified gap, known activity types, unique suggestions).
- Local `server/` Express app with `/health`, `/ai/health`, and `/ai/free-time`, using an Ollama provider module and a structured free-time advisor parser. The server default model is `qwen3:4b` via `OLLAMA_MODEL` (otherwise that default). That default is a local foundation, not a production architecture commitment.
- Plan is the only native caller of free-time advice found in this tree. Discover ranking does not call the AI backend.

Automated-test evidence: `tests/ai-context.test.cjs`, `tests/ai-context-service.test.cjs`, `tests/ai-api-client.test.cjs`, and `server/tests/free-time-advisor.test.js`. Cursor handoff verification ran those suites (see Testing and release readiness). No live Ollama or device round-trip was run.

Not re-verified on device: reaching Ollama, Android `adb reverse`, or a successful Plan advice round-trip.

Current limitations include no production AI provider contract, no on-device model, no Discover AI ranking, and no silent conversion of advice into canonical stops.

### Discover Architecture V1 and Discover Experience V1

Implemented in code:

- Discover tab with “Start with a place” (Create Trip) and “Find me somewhere”.
- Find-destination flow collects an explicit Discover Brief: timing (unsure, exact dates, or flexible constraints), optional budget ceiling and currency, intent, pace, interests, and party. Missing values stay unknown.
- Session Brief lives in Zustand only.
- Matching uses a grounded Discover corpus assembled from explicit curated packs with provenance. The matcher ranks only records that include editorial fit. Records without fit remain in the corpus and are not ranked. AI does not invent destinations.
- The default corpus currently contains twelve grounded records across two packs (eleven with fit, one without). Results still show at most five matches.
- Match reasons expose which dimensions matched. Trip-specific Brief values outrank Travel DNA for the same preference. AI does not invent destinations.
- Results can hand a grounded destination to Create Trip through route params. Flexible timing is not turned into invented calendar dates.
- Domain types also include `best_time` and `journey_ideas`. Those modes are **not** shipped as working Discover screens; the Discover tab marks them as future.

Automated-test evidence: `tests/discover-architecture.test.cjs`, `tests/discover-matcher.test.cjs`, and `tests/discover-sourcing.test.cjs`.

Not re-verified on device during this documentation pass.

Current limitations include no live place provider as a Discover source, no Best time flow, no ready-made journeys, no wishlist persistence, no semantic retrieval, and no import of Discover results except through explicit Create Trip confirmation. Grounded records without editorial fit are held for later retrieval and are not shown as ranked matches.

### Bookings

Implemented behavior includes persistent create, edit, delete, status, payment status, amount, currency, reference, location, and date/time fields. New local provider times use native calendar/time controls, canonical local date-time persistence, and comparable `start <= end` validation without implicit timezone conversion. Historical values with `Z` or an explicit offset remain absolute instants and are preserved byte-for-byte until intentionally replaced or cleared; invalid legacy values remain visible and do not crash editing. Add/Edit Booking also includes an optional native itinerary-stop selector with real day, date, title, type, and time context. Users can link, relink, or explicitly return a booking to the valid unlinked state. Booking cards show their linked stop and can open its exact Plan context. Accommodation-type Booking cards also show exact linked stays and can open the relevant Accommodation.

The flow is not yet production complete:

- Booking temporal semantics remain a compatibility boundary rather than one fully normalized model; mixed local/absolute ranges must be replaced or cleared before comparison.
- External action links and provider-specific details are absent.
- Destructive and persistence failure states need stronger UX.

### Map and location picker

Implemented behavior includes:

- A native map screen.
- Pins for stops with persisted coordinates.
- Camera framing from real stop coordinates.
- A native location picker that returns a real selected location.
- Linked booking counts appear only on mapped TripStops resolved through exact IDs. Booking coordinates are not stored, copied, guessed, or invented.
- Linked Accommodation counts and context appear only on mapped TripStops resolved through exact IDs. Accommodation coordinates are not copied or invented.

Platform state:

- Android uses Google Maps through the current app configuration.
- Android location search depends on Google Maps and Places API (New) being enabled for the configured key.
- Create Trip and Trip Details now share the native picker with Plan. Create Trip accepts only a confirmed map selection; Trip Details can explicitly replace or upgrade one existing destination record without changing its ID or position.
- The Trip Map renders every destination that has valid saved coordinates as well as itinerary-stop markers. A multi-destination Trip is not silently reduced to its first destination.
- The API key is injected from GOOGLE_MAPS_API_KEY through app.config.js.
- Cloud API enablement and key restrictions were not verified because secret configuration was intentionally not inspected.
- iOS currently uses platform-default map behavior rather than a completed Google Maps setup.
- No iOS bundle identifier is configured.
- iOS build, picker behavior, permissions, and release readiness are unverified.
- Routes, travel times, offline map behavior, navigation handoff, clustering, and Day → Destination map semantics are not implemented.
- Home, Trips, Companion, Plan, Map, Bookings, Accommodation, Travelers, More, Discover, World, and Profile render available destination or trip facts rather than silently treating the first destination as the whole trip. Full multi-destination authoring and per-day semantics remain unimplemented.

### World

Implemented in code:

- Native World tab with a map and destination cards derived from persisted Trip destinations.
- Markers only for destinations that already have real saved coordinates. No coordinates are invented.
- Filters for all / planning / completed.
- Planning vs completed vs archived on World is derived from durable `Trip.status`, not from the runtime phase resolver. An upcoming trip with status `planned` appears under planning even if runtime would also call it upcoming. World does not infer visited history from a destination title.

Not re-verified on device during this documentation pass.

Current limitations include no wishlist layer, no lived-vs-planned place distinction, no country statistics independent of saved destinations, and no use of Memories as World evidence.

### Profile

Implemented in code:

- Native Profile tab with local counts of trips, completed trips (durable status), and mapped destinations.
- Working Travel DNA navigation.
- Honest copy that trip data is currently on-device.
- Notifications and account/sync rows are labelled future.

Not re-verified on device during this documentation pass.

## Persisted modules without product UI

The following still have domain and persistence support but no complete user-facing flow:

- TripRuntimeState

Memories and Travel Book now have product UI. Their earlier “foundation only” status is no longer accurate.

## State and navigation lifecycle

- Companion, Plan, Map, Bookings, Accommodation, Budget, Travelers, More, Trip Details, Memories, and Travel Book share one route-scoped TripWorkspace lifecycle above the nested tabs.
- Initial loading, ready, refreshing, not-found, and recoverable error states are explicit.
- Stop, booking, Booking ↔ Stop, Trip Details, and trip-delete mutations use TripService; budget mutations use BudgetService; accommodation mutations use AccommodationService; traveler mutations use TravelerService; all of those invalidate and reload the shared aggregate from SQLite.
- Memory and Travel Book screens persist through their own services and are not currently wired as TripWorkspace actions.
- Focus-aware refresh retries invalid or failed snapshots but skips database reads when the shared revision is already current.
- Missing and unknown trip IDs render a native not-found state with a safe route back to Trips instead of waiting indefinitely.
- Fatal database, persistence self-test, or initial trip-list bootstrap failures render a retryable root state rather than opening the application against an unverified database.
- Zustand no longer maintains the unused activeTrip/activeTripId path. It remains a UI cache for the global trip list, plus a session-only Discover Brief. Neither is a durable trip database.

Remaining risks include requiring future Trip Space mutations to use the shared action/invalidation contract, Memory/Travel Book writes already sitting outside that contract, the absence of an external-change observer for writes made outside that contract, and the need to test the nested tab lifecycle on iOS and a broader range of Android devices.

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
- Discover architecture, catalogue validation, matcher, sourcing/corpus identity, and Create Trip handoff

Cursor handoff verification on 2026-09-01 (documentation/rule changes only; no native device testing):

- `npx tsc --noEmit` passed.
- `npm test` passed: 132 tests, 0 failed.
- `cd server && npm test` passed: 12 tests, 0 failed.
- `git diff --check` is part of the handoff staging checks.

A current passing Node count from that handoff run is 132 application tests plus 12 server tests. That is not a device rehearsal and does not replace historical Android evidence through UX Refinement V1.

Grounded Destination Sourcing V1 verification re-ran `npx tsc --noEmit` and `npm test` (138 application tests passing, including the new corpus/sourcing suite) plus the unchanged server suite. No native device run was performed for this service-layer milestone; Discover results UI behavior is unchanged apart from ranking a larger grounded corpus behind the same top-five presentation.

No Android or iOS runtime verification is recorded in git for Memories V1, Travel Book V1, Travel DNA V1, Trip Intent + Pace V1, Flexible Itinerary / Free Time V1, AI Foundation V1, Discover Architecture V1, or Discover Experience V1.

Missing release foundations:

- No CI pipeline.
- Test coverage is intentionally narrow and does not yet cover every repository, cascade, trip-state rule, an iOS database upgrade, or a broad sample of real historical databases.
- No committed lint configuration; the current lint command may attempt interactive setup.
- No EAS build or submit configuration.
- No iOS release configuration.
- No production observability or crash reporting.
- No backup, export, account, or sync mechanism.
- No verified accessibility, offline, performance, upgrade, or destructive-migration test plan.
- No device rehearsal of migration versions 7–9 on Expo SQLite.

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
- Forward-only migrations through version 9, including duplicate-day archival, Booking/Accommodation/Memory relationship cleanup, Travel DNA, and trip intent/pace.
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
- Native Memories and Travel Book flows with same-trip ID links, local media copies for photos, and migration-v7 integrity guards.
- An explicit local Travel DNA singleton that stores only user-chosen preferences.
- Curated Discover matching that cannot invent destinations, with an explicit Create Trip confirmation handoff.
- A functional More hub that distinguishes implemented navigation from planned modules.
- A coherent early visual language.

These pieces are promising foundations; they do not make the app production-ready on their own.

### Prototype or incomplete implementation

- Multi-destination add/remove/reorder, Day → Destination semantics, stable provider identity, and secure timezone/currency enrichment.
- Companion V2 timezone authoring, Day → Destination semantics, stop-boundary refresh decisions, lived progress, and external live-data layers.
- Discover Best time, ready-made journeys, live provider catalogues, and any AI ranking of destinations.
- Production AI provider, privacy, and cost contract; Plan free-time advice remains a local-dev backend.
- Advanced accommodation capabilities and the remaining booking actions/provider integrations.
- Map intelligence, routes, and offline behavior.
- Traveler owner/role/invitation/permission workflows and runtime-state UI.
- World lived-history semantics beyond saved destination coordinates and durable trip status.
- Shared UI primitives and accessibility.
- iOS platform setup.
- Tests, CI, EAS, release operations, sync, backup, and observability.

## Overall assessment

TravelOS is a broader native vertical prototype than the 2026-08-23 snapshot described, and still not a production application. Phase 0A protects the highest-risk day-generation, ordering, and migration paths. Phase 0B establishes one reliable reactive lifecycle for the current Trip Space. Budget & Expenses, Trip Details, Booking ↔ Stop, Accommodation, Travelers, Time & Runtime Truth, Companion V1, Canonical Destination Authoring, and UX Refinement V1 remain the earlier completed core. After that, Memories V1 and Travel Book V1 give completed trips an on-device record and story, shared readiness selection keeps Companion honest about preparation, Travel DNA plus trip intent/pace give Discover and Create Trip explicit preference language, Plan can show knowable free time and conflicts, AI Foundation V1 can advise on free time without writing trip truth, Discover Experience V1 can recommend grounded destinations that become canonical only after Create Trip confirmation, and Grounded Destination Sourcing V1 loads those destinations from explicit provenance-backed packs rather than a single hardcoded list. World and Profile are no longer empty tabs, but they are still thin compared with the trip workspace.

The latest shipped git milestones are Cursor handoff (`735c964`) on top of Discover Experience V1 (`f714127`), followed by Grounded Destination Sourcing V1 on `feature/grounded-destination-sourcing-v1`.

The immediate planned product-development sequence is now: (1) Semantic Discover V1 using local/open multilingual embeddings, with BGE-M3 as the current candidate to evaluate; (2) Discover reranking, with a BGE reranker as the current candidate to evaluate; (3) Grounded AI explanations using the existing local Qwen foundation. Grounded destination data must come before semantic retrieval and reranking. AI must not become a destination source. BGE-M3, a BGE reranker, and Qwen are candidates to benchmark, not permanent architecture commitments. Important open engineering and release work remains—Memory/Travel Book workspace invalidation, Expo SQLite rehearsal of migrations 7–9, remaining visual/accessibility matrix, Phase 0 gaps, destination add/remove/reorder, Day → Destination semantics, a secure timezone source, traveler ownership, Companion V2 lived state, FX before foreign-currency accounting totals, Discover Best time, iOS, CI/EAS, and backup/sync—but that work does not replace the Discover sequence above.
