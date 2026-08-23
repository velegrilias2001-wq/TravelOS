# TravelOS Current State

Snapshot date: 2026-08-23

This file describes verified implementation, not intended behavior. Unknown or unverified capabilities are called out explicitly.

## Repository checkpoint

- Current development branch: feature/travelers
- Phase 0A checkpoint: e5ffbb1 — Harden TravelOS persistence and migrations
- Phase 0B checkpoint: 7135262 — Add reactive TripWorkspace lifecycle
- Budget & Expenses checkpoint: 65b7f33 — Add native trip budget and expenses
- Trip Details and More checkpoint: ac21422 — Add native trip details and management hub
- Booking ↔ Stop checkpoint: f6d09c5 — Connect bookings with itinerary stops
- Accommodation checkpoint: cc180f2 — Add canonical trip accommodation flow
- The native architecture checkpoint remains ec0b28a — Add native location picker and mapped itinerary stops.
- No Git remote or upstream branch was configured during the audit.
- .env.local exists and is ignored. Its contents were not read.

The working tree contains the verified but uncommitted Travelers implementation described below.

Recent native milestones include the repository/service foundation, native navigation, create trip, itinerary planning, truth-aware Today, bookings, Google Maps on Android, the location picker, persistence hardening, the shared TripWorkspace lifecycle, Budget & Expenses, Trip Details, explicit Booking ↔ Stop relationships, native Accommodation management, and reusable canonical Traveler identities with explicit trip membership.

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
| Styling | Local design tokens and React Native StyleSheet-based screen styling |

The package currently has start, Android, iOS, web, reset-project, lint, and automated test scripts. There is no CI workflow, EAS configuration, or non-interactive lint configuration.

## Architecture

The codebase has a sensible layered direction:

1. Domain entities define the travel model.
2. Repository interfaces describe persistence operations.
3. SQLite repositories implement those interfaces.
4. Services coordinate aggregate workflows.
5. Zustand holds the global trip-list cache and its loading state; it no longer holds a redundant active-trip snapshot.
6. A route-scoped TripWorkspace provider owns one ephemeral aggregate snapshot for the active trip and exposes service-backed mutations.
7. Expo Router Trip Space screens render the shared snapshot and mutate it through the provider while SQLite remains authoritative.

TripService builds a TripWorkspace aggregate from the canonical Trip and its related records. Today, Plan, Map, Bookings, Accommodation, Budget, Travelers, More, and Trip Details consume one provider above the nested Trip Space tabs instead of maintaining independent screen-owned copies. Successful mutations invalidate and reload that aggregate from SQLite. Focus refreshes are revision-aware, so current data does not trigger an unnecessary database reload. Trip edits and deletion also refresh the Zustand-backed global trip-list cache after SQLite and the workspace have been updated.

## Canonical domain model

Verified domain entities include:

- Trip
- TripDay
- TripStop
- Booking
- Accommodation
- Budget and budget items
- Traveler
- TripRuntimeState
- Memory
- TravelBook

Entities use explicit IDs. The model distinguishes the trip's accounting currency from destination currency concepts. `Booking.stopId` is the canonical optional relationship to an itinerary stop: each booking has zero or one stop, while each stop can have zero, one, or many bookings. Each Trip has zero or many Accommodations; an Accommodation belongs to exactly one Trip and may link to zero or one Booking and zero or one TripStop. A Booking or TripStop may be referenced by multiple Accommodation records, and every relationship must remain within one Trip. Links are never inferred from names, addresses, or other text.

Traveler identity is independent from Trip. One canonical Traveler may belong to multiple Trips through `trip_travelers`, whose composite primary key prevents duplicate membership. Removing a Traveler from a Trip deletes only that membership. Deleting a Trip cascades its memberships but preserves the reusable Traveler rows. The current planning flow deliberately permits zero Travelers so an unfinished Trip can exist; enforcing an eventual one-or-more party rule remains a product decision tied to Create Trip and owner identity.

## SQLite and migrations

The database is the current durable source of truth. Verified characteristics include:

- SQLite WAL mode and foreign-key enforcement are enabled.
- The current database version is 6.
- The core schema contains 14 tables covering trips and related travel data; migrations add recovery archives for reconciled duplicate TripDays, invalid historical Booking ↔ Stop links, and invalid historical Accommodation links.
- Repository queries use bound parameters.
- Historical version 1 and version 2 migration behavior remains unchanged.
- Migration version 3 converges the accommodation stop relationship and index even when a version-2 database reflects the earlier baseline drift.
- Migration version 3 archives duplicate TripDay rows before consolidating their stop, memory, and runtime references.
- Migration version 3 normalizes TripDay numbers and stop positions before adding unique indexes for trip/date, trip/day-number, and day/position.
- The migration adds focused relationship and ordering indexes without rebuilding core tables or adding constraints that could reject preserved databases.
- Application transactions now use serialized, transaction-scoped Expo SQLite exclusive connections.
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
- Canonical Trip updates persist the trip row, ordered destination records, and traveler links in one transaction while preserving destination IDs and metadata.
- Trip deletion remains one atomic SQLite statement and relies on verified foreign-key cascades for trip-owned data. Independent traveler records survive because only trip membership belongs to the deleted trip.
- Accommodation create and update validate required stay facts, real local date-time values, `checkInAt <= checkOutAt`, and same-trip optional booking/stop IDs. Deleting an Accommodation does not delete or mutate its linked Booking or TripStop; deleting a linked Booking or TripStop unlinks the Accommodation through `ON DELETE SET NULL`.
- Traveler creation plus first membership is atomic. Existing identities are added only through an exact selected Traveler ID, duplicate membership is rejected, canonical edits are visible in every Trip that contains that ID, and membership removal never deletes the identity.
- Travelers required no migration version 7: the released schema already has independent `travelers` rows, a composite `(trip_id, traveler_id)` membership primary key, and foreign keys that delete memberships—but not identities—when a Trip is deleted.

Important remaining gaps:

- Cross-table invariants do not yet prove that a stop's trip ID matches its TripDay's trip ID.
- Memories and TripRuntimeState day/stop references are not fully protected by foreign keys.
- Trip-list loading performs repeated related-data queries and will not scale well.
- Relationship cardinality and service aggregation still need explicit decisions for memories, runtime state, and other aggregates. Booking ↔ Stop and Accommodation relationships are now explicit and no longer use arbitrary singular hydration.
- TripDay records outside an edited trip date range are preserved and placed after the canonical range; no product flow exists yet for resolving them.
- Archived migration-v3 duplicate-day metadata is retained for recovery but has no user-facing inspection tool.
- Migration and transaction behavior is covered by Node SQLite tests and was rehearsed with Expo SQLite 57 on an Android x86_64 emulator. The Android rehearsal migrated an isolated version-2 database to version 3, verified all version-3 indexes, preserved and loaded a seeded existing trip, repaired its partial TripDay set, preserved stop content through reorder, and removed only the isolated test database. The Budget rehearsal upgraded the existing development database to version 4, verified the new indexes, preserved the pre-existing trip, and removed only its reserved test trip. Booking ↔ Stop verification upgraded the live development database to version 5, verified the valid WAL state reports `user_version = 5`, and confirmed the two validation triggers plus the invalid-link archive and index exist. Accommodation verification upgraded the development database to version 6, confirmed `user_version = 6`, the four validation triggers, the recovery archive indexes, and existing accommodation relationship indexes, and preserved the unrelated existing trip. Equivalent iOS rehearsals are still outstanding.

Historical migrations must not be edited to repair remaining issues. Corrections require new migrations.

## Implemented native flows

### Global navigation

The primary tab structure is:

- Home
- Trips
- Discover
- World
- Profile

Home and Trips are functional. Discover, World, and Profile are placeholders.

### Trips and trip creation

Implemented behavior includes:

- Persisted trip list.
- Creating a trip with title, one destination, free-form date strings, and accounting currency.
- Opening a trip-specific workspace.
- Automatic TripDay creation from the trip date range.
- Editing the canonical trip title, valid existing destination names, dates, accounting currency, and lifecycle status from Trip Details.
- Deleting a trip through a destructive native confirmation that names the related local data being removed.

Create Trip still uses placeholder-driven free-form date fields and weak validation. Trip Details uses native calendar selection and validates real `YYYY-MM-DD` dates plus `start <= end`, but timezone behavior remains undefined. Accounting currency uses a validated three-letter code rather than a complete currency selector.

### Trip Space navigation

Each trip exposes:

- Today
- Plan
- Map
- Bookings
- More

Today, Plan, Map, Bookings, and More have working functionality. More is now a native trip hub with canonical Trip Details, Budget, Accommodation, Travelers, Itinerary, Bookings, Map, and Today navigation. Readiness remains an explicitly labelled planned module.

### Trip Details and More

Implemented behavior includes:

- A dedicated native Trip Details route reached from More.
- Canonical title editing, status selection, native date editing, accounting-currency editing, and existing destination-name editing through TripService and TripWorkspace.
- Strict real-calendar `YYYY-MM-DD` validation and rejection of reversed ranges before persistence.
- Preservation of destination IDs, order, coordinates, country, timezone, and local-currency metadata.
- Structured destinations are read-only until a location-aware replacement flow exists; name-only destination records can be refined. Destination add, remove, reorder, and structured replacement are not implied by the UI.
- Manual status choices cover draft, planned, completed, and archived. An existing active status is preserved, but a future trip cannot be manually marked active because active truth needs date/runtime derivation.
- Accounting currency cannot be changed once a persisted Budget exists. No amount is relabelled, converted, or assigned an invented exchange rate.
- Trip deletion uses a destructive native confirmation, routes safely back to Trips, refreshes the global list cache, and leaves the deleted workspace in not-found state rather than retaining stale data.

Current limitations include the unfinished multi-destination workflow, no archive/recovery or backup for deletion, no destination-aware timezone rules, no native date picker on Create Trip, and no complete currency selector.

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
- Restrained exact-link context in Today, Bookings, and Map. Map shows stay context only through an explicitly linked TripStop that already has real coordinates; no Accommodation coordinates are guessed or copied.

Current limitations include no canonical timezone model, no destination-aware check-in status, no provider import, no room/guest policy model, no booking creation from Accommodation, no dedicated place picker for accommodation coordinates, and no iOS runtime rehearsal.

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

### Today

Today distinguishes upcoming, active, and completed trips using the device's local calendar date. It shows the appropriate trip day and its stops when active.

This is truth-aware compared with a static mock, but not yet Companion-grade:

- It does not use the destination or trip timezone.
- It does not consume persisted TripRuntimeState.
- It does not derive current and next stop phases.
- Confirmed bookings linked by exact stop ID can surface compact confirmation context on the relevant Today stop and open the booking. Unlinked, cancelled, or differently linked bookings are not presented as that stop's context.
- Accommodation check-in, in-stay, and check-out context is scheduled against the exact TripDay calendar date. Copy remains explicitly scheduled rather than claiming a future stay is currently happening.
- Trip-level loading, refresh, not-found, and recoverable read-error behavior is shared with the other Trip Space screens.

### Plan

Implemented behavior includes:

- Day-by-day itinerary rendering.
- TripStop create, edit, delete, and reorder.
- UI support for place, activity, food, and transport stop types.
- Native real-location selection.
- Persisted stop name, address, latitude, and longitude.

Current limitations include free-form time input, limited stop-type UI, no route or transit model, no place-provider ID persisted from the picker, and large screen-level implementations with duplicated presentation patterns. Plan now shows a restrained booking count and a contextual action for relationships resolved by exact stop ID.

### Bookings

Implemented behavior includes persistent create, edit, delete, status, payment status, amount, currency, reference, location, and date/time fields. Add/Edit Booking includes an optional native itinerary-stop selector with real day, date, title, type, and time context. Users can link, relink, or explicitly return a booking to the valid unlinked state. Booking cards show their linked stop and can open its exact Plan context. Accommodation-type Booking cards also show exact linked stays and can open the relevant Accommodation.

The flow is not yet production complete:

- Date/time validation and native input are incomplete.
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
- The API key is injected from GOOGLE_MAPS_API_KEY through app.config.js.
- Cloud API enablement and key restrictions were not verified because secret configuration was intentionally not inspected.
- iOS currently uses platform-default map behavior rather than a completed Google Maps setup.
- No iOS bundle identifier is configured.
- iOS build, picker behavior, permissions, and release readiness are unverified.
- Routes, travel times, offline map behavior, navigation handoff, clustering, and multi-destination map behavior are not implemented.

Several current screens use only the first destination even though the domain can represent more than one.

## Persisted modules without product UI

The following have domain and persistence support but no complete user-facing flow:

- TripRuntimeState
- Memories
- TravelBook

These are foundations, not shipped features. Their repository existence does not prove the end-to-end behavior is complete.

## State and navigation lifecycle

- Today, Plan, Map, Bookings, Accommodation, Budget, Travelers, More, and Trip Details share one route-scoped TripWorkspace lifecycle above the nested tabs.
- Initial loading, ready, refreshing, not-found, and recoverable error states are explicit.
- Stop, booking, Booking ↔ Stop, Trip Details, and trip-delete mutations use the existing TripService, budget mutations use BudgetService, accommodation mutations use AccommodationService, and traveler mutations use TravelerService; all invalidate and reload the shared aggregate from SQLite.
- Focus-aware refresh retries invalid or failed snapshots but skips database reads when the shared revision is already current.
- Missing and unknown trip IDs render a native not-found state with a safe route back to Trips instead of waiting indefinitely.
- Fatal database, persistence self-test, or initial trip-list bootstrap failures render a retryable root state rather than opening the application against an unverified database.
- Zustand no longer maintains the unused activeTrip/activeTripId path. It remains a UI cache for the global trip list, not a second durable trip database.

Remaining risks include requiring future Trip Space mutations to use the shared action/invalidation contract, the absence of an external-change observer for writes made outside that contract, and the need to test the nested tab lifecycle on iOS and a broader range of Android devices.

## Design system state

The app has a coherent early visual direction with typography, color, spacing, and premium editorial intent. Home, Trips, and trip flows are more considered than a default Expo template.

It is still an early design system:

- Major screens contain large, locally defined style and interaction implementations.
- Common cards, fields, sheets, empty states, alerts, and destructive confirmations are duplicated rather than enforced through stable primitives.
- Theme configuration and actual UI behavior are not fully aligned.
- Accessibility labels, dynamic type behavior, reduced-motion behavior, contrast validation, localization, and bidirectional layout are not complete.
- Starter Expo components and assets remain in the repository.

## Testing and release readiness

Verified checks through the Travelers implementation:

- npm test runs forty-five automated tests covering persistence, migrations, Budget calculations, Trip Details validation/persistence/cascades, Booking ↔ Stop invariants and deletion behavior, Accommodation validation/persistence/relationships/cascades/day context, Traveler identity/membership behavior, and TripWorkspace lifecycle behavior.
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
- npx tsc --noEmit passes for the application.
- npm ls --depth=0 passed at the takeover audit.
- git diff --check is part of the required completion checks.

Missing release foundations:

- No CI pipeline.
- Test coverage is intentionally narrow and does not yet cover every repository, cascade, trip-state rule, an iOS database upgrade, or a broad sample of real historical databases.
- No committed lint configuration; the current lint command may attempt interactive setup.
- No EAS build or submit configuration.
- No iOS release configuration.
- No production observability or crash reporting.
- No backup, export, account, or sync mechanism.
- No verified accessibility, offline, performance, upgrade, or destructive-migration test plan.

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
- Forward-only migration v3 with duplicate-day archival and high-value uniqueness/index protection.
- A dependency-free automated persistence test baseline.
- A route-scoped, revision-aware TripWorkspace lifecycle that keeps SQLite authoritative and shares current data across Trip Space tabs.
- Explicit trip loading, refresh, not-found, recoverable error, and fatal bootstrap states.
- Truth-aware upcoming/active/completed Today logic.
- Real selected coordinates persisted and rendered as map pins.
- Separate accounting-currency concept.
- A service-backed Budget & Expenses flow with truthful same-currency aggregation and original-currency preservation.
- A service-backed canonical Trip Details editor with strict date validation, metadata-preserving destination handling, budget-aware accounting-currency safety, and verified cascade deletion.
- An explicit zero-or-one Booking → TripStop relationship with same-trip enforcement, zero-to-many reverse cardinality, lossless stop deletion, service/repository validation, and contextual TripWorkspace-backed UI.
- An explicit Trip → Accommodation aggregate with optional same-trip Booking and TripStop IDs, service and database enforcement, lossless link deletion behavior, native validated CRUD, and restrained Today/Bookings/Map context.
- A reusable canonical Traveler identity with explicit many-to-many Trip membership, exact-ID selection, atomic creation, duplicate prevention, shared edits, membership-only removal, and verified Trip-deletion preservation.
- A functional More hub that distinguishes implemented navigation from planned modules.
- A coherent early visual language.

These pieces are promising foundations; they do not make the app production-ready on their own.

### Prototype or incomplete implementation

- Create Trip input and validation.
- Multi-destination add/remove/reorder and structured destination replacement.
- Today as a full Companion.
- Advanced accommodation capabilities and the remaining booking actions/date-time validation.
- Map intelligence, routes, and offline behavior.
- Traveler owner/role/invitation/permission workflows, runtime state, memories, and Travel Book UI.
- Discover, World, and Profile.
- Shared UI primitives and accessibility.
- iOS platform setup.
- Tests, CI, EAS, release operations, sync, backup, and observability.

## Overall assessment

TravelOS is a credible native foundation and working vertical prototype, not yet a production application. Phase 0A protects the highest-risk day-generation, ordering, and migration paths, Phase 0B establishes one reliable reactive lifecycle for the current Trip Space, Budget & Expenses is the first complete Phase 1 product slice, Trip Details makes the canonical Trip safely editable, Booking ↔ Stop integration connects itinerary and reservation truth through explicit IDs, Accommodation adds a validated multi-stay workflow, and Travelers now establishes reusable people plus explicit Trip membership over that same truth. The next priorities are closing the remaining Phase 0 engineering gaps while completing multi-destination rules, upgrading Create Trip and remaining booking date-time inputs, and defining timezone/runtime behavior plus traveler ownership and roles. A real FX strategy must be designed before foreign-currency expenses can enter accounting-currency totals.
