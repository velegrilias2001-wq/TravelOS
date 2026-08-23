# TravelOS Current State

Snapshot date: 2026-08-23

This file describes verified implementation, not intended behavior. Unknown or unverified capabilities are called out explicitly.

## Repository checkpoint

- Current development branch: feature/budget-expenses
- Phase 0A checkpoint: e5ffbb1 — Harden TravelOS persistence and migrations
- Phase 0B checkpoint: 7135262 — Add reactive TripWorkspace lifecycle
- The native architecture checkpoint remains ec0b28a — Add native location picker and mapped itinerary stops.
- No Git remote or upstream branch was configured during the audit.
- .env.local exists and is ignored. Its contents were not read.

The working tree contains the verified but uncommitted Budget & Expenses implementation described below.

Recent native milestones include the repository/service foundation, native navigation, create trip, itinerary planning, truth-aware Today, bookings, Google Maps on Android, the location picker, and Phase 0A persistence safety.

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

TripService builds a TripWorkspace aggregate from the canonical Trip and its related records. Today, Plan, Map, and Bookings now consume one provider above the nested Trip Space tabs instead of maintaining independent screen-owned copies. Successful mutations invalidate and reload that aggregate from SQLite. Focus refreshes are revision-aware, so current data does not trigger an unnecessary database reload.

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

Entities use explicit IDs. The model distinguishes the trip's accounting currency from destination currency concepts. Booking and accommodation records can persist stop relationships, although the booking-to-stop and accommodation user experiences are not yet implemented.

## SQLite and migrations

The database is the current durable source of truth. Verified characteristics include:

- SQLite WAL mode and foreign-key enforcement are enabled.
- The current database version is 4.
- The core schema contains 14 tables covering trips and related travel data; migration version 3 adds one recovery archive table for reconciled duplicate TripDays.
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
- Each trip can persist one budget header, protected by the existing unique trip relationship. Plan updates preserve the canonical budget ID and existing expenses.
- Budget expense create, edit, and delete preserve original currency, explicit booking/stop IDs, and the user-selected expense date.

Important remaining gaps:

- Cross-table invariants do not yet prove that a stop's trip ID matches its TripDay's trip ID.
- Memories and TripRuntimeState day/stop references are not fully protected by foreign keys.
- Trip-list loading performs repeated related-data queries and will not scale well.
- Repository relationship cardinality and service aggregation need explicit decisions where schemas can hold multiple records but the aggregate exposes one.
- TripDay records outside an edited trip date range are preserved and placed after the canonical range; no product flow exists yet for resolving them.
- Archived migration-v3 duplicate-day metadata is retained for recovery but has no user-facing inspection tool.
- Migration and transaction behavior is covered by Node SQLite tests and was rehearsed with Expo SQLite 57 on an Android x86_64 emulator. The Android rehearsal migrated an isolated version-2 database to version 3, verified all version-3 indexes, preserved and loaded a seeded existing trip, repaired its partial TripDay set, preserved stop content through reorder, and removed only the isolated test database. The Budget rehearsal upgraded the existing development database to version 4, verified the new indexes, preserved the pre-existing trip, and removed only its reserved test trip. Equivalent iOS rehearsals are still outstanding.

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

Dates and currencies do not yet have production-grade native input, validation, timezone handling, or editing flows.

### Trip Space navigation

Each trip exposes:

- Today
- Plan
- Map
- Bookings
- More

Today, Plan, Map, Bookings, and the Budget entry in More have working functionality. The rest of More remains intentionally limited.

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

### Today

Today distinguishes upcoming, active, and completed trips using the device's local calendar date. It shows the appropriate trip day and its stops when active.

This is truth-aware compared with a static mock, but not yet Companion-grade:

- It does not use the destination or trip timezone.
- It does not consume persisted TripRuntimeState.
- It does not derive current and next stop phases.
- Booking and accommodation context is not integrated.
- Trip-level loading, refresh, not-found, and recoverable read-error behavior is shared with the other Trip Space screens.

### Plan

Implemented behavior includes:

- Day-by-day itinerary rendering.
- TripStop create, edit, delete, and reorder.
- UI support for place, activity, food, and transport stop types.
- Native real-location selection.
- Persisted stop name, address, latitude, and longitude.

Current limitations include free-form time input, limited stop-type UI, no route or transit model, no booking linkage UI, no place-provider ID persisted from the picker, and large screen-level implementations with duplicated presentation patterns.

### Bookings

Implemented behavior includes persistent create, edit, delete, status, payment status, amount, currency, reference, location, and date/time fields.

The flow is not yet production complete:

- Booking-to-stop linkage exists in persistence but is not exposed in the UI.
- Accommodation is a separate persisted domain without a dedicated UI.
- Date/time validation and native input are incomplete.
- External action links and provider-specific details are absent.
- Destructive and persistence failure states need stronger UX.

### Map and location picker

Implemented behavior includes:

- A native map screen.
- Pins for stops with persisted coordinates.
- Camera framing from real stop coordinates.
- A native location picker that returns a real selected location.

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

- Accommodation
- Travelers
- TripRuntimeState
- Memories
- TravelBook

These are foundations, not shipped features. Their repository existence does not prove the end-to-end behavior is complete.

## State and navigation lifecycle

- Today, Plan, Map, and Bookings share one route-scoped TripWorkspace lifecycle above the nested tabs.
- Initial loading, ready, refreshing, not-found, and recoverable error states are explicit.
- Stop and booking mutations use the existing TripService, and budget mutations use BudgetService; all invalidate and reload the shared aggregate from SQLite.
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

Verified checks through the Budget & Expenses implementation:

- npm test runs eighteen automated tests covering persistence, migrations, Budget calculations, and TripWorkspace lifecycle behavior.
- Fresh database migration, version-2 drift repair, migration rollback, fresh/partial/repeated TripDay generation, concurrent idempotency, and stop reorder rollback are covered.
- Workspace initial loading, not-found behavior, revision-aware refresh, shared-consumer mutation propagation, recoverable retry, and mutation-during-load invalidation are covered.
- The Android debug build compiles, installs, launches, and reaches both the development persistence self-test and bootstrap-ready state on an x86_64 emulator.
- An on-device Expo SQLite rehearsal verified `PRAGMA user_version = 3`, all ten migration/invariant indexes, existing seeded trip survival, canonical TripDay generation/loading, and lossless stop reorder in an isolated database.
- Phase 0B Android runtime verification created and opened an isolated trip, selected and persisted a real mapped stop, observed it and its edited title on Map after tab navigation, preserved a booking across tab changes, and confirmed an unknown trip route reaches the native not-found state. Only the isolated verification trip was removed afterwards; the pre-existing trip remained visible.
- Budget Android runtime verification created an isolated EUR trip, set a €1,000 plan, added accounting- and foreign-currency expenses, verified the foreign amount stayed outside EUR totals, edited an expense to produce €350 spent and €650 remaining, deleted an expense, cold-relaunched the app, and confirmed the budget and edited expense persisted. Expo SQLite reported `PRAGMA user_version = 4` and all three Budget indexes. Only the reserved test trip was removed; the pre-existing trip remained visible.
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
- A coherent early visual language.

These pieces are promising foundations; they do not make the app production-ready on their own.

### Prototype or incomplete implementation

- Create Trip input and validation.
- Today as a full Companion.
- Booking-stop and accommodation workflows.
- Map intelligence, routes, and offline behavior.
- Travelers, runtime state, memories, and Travel Book UI.
- Discover, World, Profile, and More.
- Shared UI primitives and accessibility.
- iOS platform setup.
- Tests, CI, EAS, release operations, sync, backup, and observability.

## Overall assessment

TravelOS is a credible native foundation and working vertical prototype, not yet a production application. Phase 0A protects the highest-risk day-generation, ordering, and migration paths, Phase 0B establishes one reliable reactive lifecycle for the current Trip Space, and Budget & Expenses is the first complete Phase 1 product slice. The next priorities are closing the remaining Phase 0 engineering gaps while continuing Phase 1 through trip editing, native date/time validation, explicit booking/stop relationships, accommodations, and travelers. A real FX strategy must be designed before foreign-currency expenses can enter accounting-currency totals.
